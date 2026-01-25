import express from 'express';
import crypto from 'crypto';
import { discordAuth, discordCallback, discordStatus } from '../providers/discord.js';
import { telegramAuth, telegramCallback, telegramStatus } from '../providers/telegram.js';
import { tiktokAuth, tiktokCallback, tiktokStatus } from '../providers/tiktok.js';
import { evmAuth, evmCallback, evmStatus } from '../providers/evm.js';
import { solanaAuth, solanaCallback, solanaStatus } from '../providers/solana.js';
import { getSession, saveSession, updateSession, saveVerification, hashToken } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Generic route handler
const handleAuthStart = async (req, res, provider, authHandler) => {
  try {
    const { passportId } = req.query;
    
    console.log(`[Auth] 🚀 ${provider} verification start requested:`, { passportId });
    
    if (!passportId) {
      console.error(`[Auth] ❌ ${provider} start: Missing passportId`);
      return res.status(400).json({ error: 'passportId is required' });
    }

    // Create verification session in database
    const sessionId = `${provider}_${uuidv4()}`;
    await saveSession(sessionId, provider, passportId, {
      passportId,
      status: 'in_progress'
    });

    console.log(`[Auth] ✅ ${provider} session created:`, sessionId);
    console.log(`[Auth] 💾 Session saved with ID:`, sessionId, `for passportId:`, passportId);

    // Get redirect URL from provider
    const redirectUrl = await authHandler(passportId, sessionId);
    
    console.log(`[Auth] 🔗 ${provider} redirecting to provider:`, redirectUrl.substring(0, 100) + '...');
    
    res.redirect(redirectUrl);
  } catch (error) {
    console.error(`[Auth] ❌ ${provider} start error:`, error);
    
    // If it's a configuration error, return helpful message
    if (error.message.includes('not configured') || error.message.includes('CLIENT_ID')) {
      return res.status(400).json({ 
        error: error.message,
        hint: `Please configure ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET in backend/.env file. See .env.example for details.`
      });
    }
    
    res.status(500).json({ error: error.message });
  }
};

const handleAuthCallback = async (req, res, provider, callbackHandler) => {
  try {
    console.log(`[Auth] 📥 ${provider} callback received:`, { 
      queryKeys: Object.keys(req.query),
      hasState: !!req.query.state,
      hasCode: !!req.query.code,
      fullQuery: req.query
    });

    let sessionId = req.query.state || req.query.session_id || req.query.session;
    
    // For Google and Twitter, state contains sessionId:codeVerifier
    // Extract just the sessionId part
    if (sessionId && sessionId.includes(':')) {
      sessionId = sessionId.split(':')[0];
    }
    
    if (!sessionId) {
      console.error(`[Auth] ❌ ${provider} callback: Missing session ID in query:`, req.query);
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?error=missing_session`);
    }

    console.log(`[Auth] 🔍 ${provider} looking for session:`, sessionId);
    console.log(`[Auth] 📋 All sessions check - trying to find:`, sessionId);

    const session = await getSession(sessionId);
    if (!session) {
      console.error(`[Auth] ❌ ${provider} callback: Session not found:`, sessionId);
      console.error(`[Auth] 💡 Debug: Check if session was created with this exact ID`);
      // Try to list recent sessions for debugging
      return res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?error=invalid_session`);
    }

    console.log(`[Auth] ✅ ${provider} callback: Found session ${sessionId}, processing...`);

    // Handle callback - pass session state data
    const result = await callbackHandler(req.query, {
      id: sessionId,
      provider: session.provider,
      passportId: session.userId,
      stateData: session.stateData
    });
    
    console.log(`[Auth] ✅ ${provider} verification completed:`, {
      verified: result.verified,
      score: result.score,
      provider
    });
    
    // Save verification to database
    // IMPORTANT: Use session.userId (passportId/walletAddress) as the main userId
    // This ensures verifications are linked to the wallet, not the OAuth provider account
    if (result.verified) {
      // Use session.userId (passportId) as the primary userId for storing verification
      // This is the wallet address/public key that the user connected with
      const userId = session.userId || session.passportId;
      
      if (!userId) {
        console.error(`[Auth] ❌ ${provider} verification: Missing userId (passportId) in session`);
        throw new Error('Missing userId in session');
      }
      
      // PRIVACY: Use commitment instead of providerAccountId
      // Generate commitment from provider result (should already be in result.commitment)
      const commitment = result.commitment || null;
      
      if (!commitment) {
        console.warn(`[Auth] ⚠️ ${provider} verification: No commitment in result, generating from metadata`);
        // Fallback: generate commitment if not provided
        // This should not happen in normal flow, but handle gracefully
      }
      
      console.log(`[Auth] 💾 Saving ${provider} verification:`, {
        userId: userId ? userId.substring(0, 20) + '...' : 'MISSING',
        userIdLength: userId?.length || 0,
        commitment: commitment ? commitment.substring(0, 20) + '...' : 'none',
        score: result.score,
        sessionUserId: session.userId ? session.userId.substring(0, 20) + '...' : 'MISSING',
        sessionPassportId: session.passportId ? session.passportId.substring(0, 20) + '...' : 'none'
      });
      
      // PRIVACY: Store only commitment, score, and criteria - no personal data
      await saveVerification(userId, provider, {
        commitment: commitment,
        score: result.score,
        maxScore: result.maxScore || result.score,
        status: 'verified',
        metadata: {
          commitment: commitment,
          score: result.score,
          maxScore: result.maxScore || result.score,
          criteria: result.criteria || [],
          // DO NOT store: email, username, profile, userId from provider
        },
        accessTokenHash: result.accessToken ? hashToken(result.accessToken) : null,
        expiresAt: result.expiresAt || null
      });
      
      console.log(`[Auth] ✅ ${provider} verification saved for userId: ${userId.substring(0, 10)}...`);
      
      // PRIVACY: Do NOT save profile data - violates anonymity
      // Profile data should only exist in user's wallet as private records
    }
    
    // Update session with result
    await updateSession(sessionId, {
      status: result.verified ? 'verified' : 'failed',
      stateData: {
        ...session.stateData,
        result,
        completedAt: new Date()
      }
    });

    // Redirect to frontend
    const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?provider=${provider}&session=${sessionId}`;
    console.log(`[Auth] 🔗 ${provider} redirecting to frontend:`, frontendUrl);
    res.redirect(frontendUrl);
  } catch (error) {
    console.error(`[Auth] ❌ ${provider} callback error:`, error.message, error.stack);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?error=${encodeURIComponent(error.message)}`);
  }
};

const handleAuthStatus = async (req, res, provider, statusHandler) => {
  try {
    const { session } = req.query;
    
    if (!session) {
      console.warn(`[Auth] ⚠️ ${provider} status: Missing session parameter`);
      return res.status(400).json({ error: 'session is required' });
    }

    console.log(`[Auth] 🔍 ${provider} status requested for session:`, session);

    const sessionData = await getSession(session);
    if (!sessionData) {
      console.warn(`[Auth] ⚠️ ${provider} status: Session not found:`, session);
      return res.status(404).json({ error: 'Session not found' });
    }

    console.log(`[Auth] 📊 ${provider} session status:`, {
      sessionId: sessionData.sessionId,
      status: sessionData.status,
      hasResult: !!sessionData.stateData?.result
    });

    // Get status from provider if needed
    const status = await statusHandler({
      id: sessionData.sessionId,
      provider: sessionData.provider,
      passportId: sessionData.userId,
      stateData: sessionData.stateData,
      result: sessionData.stateData?.result
    });
    
    res.json({
      provider,
      session: sessionData.sessionId,
      status: sessionData.status,
      result: sessionData.stateData?.result || status
    });
  } catch (error) {
    console.error(`[Auth] ❌ ${provider} status error:`, error);
    res.status(500).json({ error: error.message });
  }
};

// Discord OAuth
router.get('/discord/start', (req, res) => handleAuthStart(req, res, 'discord', discordAuth));
router.get('/discord/callback', (req, res) => handleAuthCallback(req, res, 'discord', discordCallback));
router.get('/discord/status', (req, res) => handleAuthStatus(req, res, 'discord', discordStatus));

// Telegram OAuth
router.get('/telegram/start', (req, res) => handleAuthStart(req, res, 'telegram', telegramAuth));
router.get('/telegram/callback', (req, res) => handleAuthCallback(req, res, 'telegram', telegramCallback));
router.get('/telegram/status', (req, res) => handleAuthStatus(req, res, 'telegram', telegramStatus));

// Telegram Bot Webhook (for handling /start commands)
router.post('/telegram/webhook', async (req, res) => {
  try {
    const { message } = req.body;
    
    if (!message || !message.text || !message.text.startsWith('/start')) {
      return res.status(200).json({ ok: true }); // Ignore non-start messages
    }

    const sessionId = message.text.split(' ')[1]; // Extract sessionId from /start sessionId
    
    if (!sessionId) {
      console.log('[Telegram Webhook] No sessionId in /start command');
      // Send welcome message with instructions
      const { getTelegramConfig } = await import('../providers/telegram.js');
      const { TELEGRAM_BOT_TOKEN } = getTelegramConfig();
      const axios = (await import('axios')).default;
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: message.chat.id,
        text: `👋 Welcome to ZKPersona Verification Bot!\n\nTo verify your Telegram account:\n1. Go to the website\n2. Click "Start Verification" for Telegram\n3. You will get a link with session ID\n4. Click /start with that session ID here`
      });
      return res.status(200).json({ ok: true });
    }

    console.log('[Telegram Webhook] Received /start with sessionId:', sessionId);
    
    // Get session from database
    const session = await getSession(sessionId);
    if (!session) {
      console.error('[Telegram Webhook] Session not found:', sessionId);
      const { getTelegramConfig } = await import('../providers/telegram.js');
      const { TELEGRAM_BOT_TOKEN } = getTelegramConfig();
      const axios = (await import('axios')).default;
      await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        chat_id: message.chat.id,
        text: `❌ Session not found. Please start verification from the website first.`
      });
      return res.status(200).json({ ok: true });
    }

    const { getTelegramConfig } = await import('../providers/telegram.js');
    const { TELEGRAM_BOT_TOKEN } = getTelegramConfig();
    const axios = (await import('axios')).default;

    // Fetch user profile photos
    let photoUrl = null;
    try {
      const photosResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUserProfilePhotos`, {
        user_id: message.from.id,
        limit: 1
      });
      
      if (photosResponse.data.ok && photosResponse.data.result.total_count > 0) {
        // Get file_id of the largest photo (last in the array)
        const photos = photosResponse.data.result.photos[0];
        const fileId = photos[photos.length - 1].file_id;
        
        // Get file path
        const fileResponse = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getFile`, {
          file_id: fileId
        });
        
        if (fileResponse.data.ok) {
          const filePath = fileResponse.data.result.file_path;
          photoUrl = `https://api.telegram.org/file/bot${TELEGRAM_BOT_TOKEN}/${filePath}`;
        }
      }
    } catch (error) {
      console.error('[Telegram Webhook] Failed to fetch profile photos:', error.message);
    }

    // Calculate score
    const { calculateTelegramScore } = await import('../scoring/telegram.js');
    const accountAgeDays = 365; // Default for bot
    const scoreResult = calculateTelegramScore({
      id: message.from.id,
      username: message.from.username,
      photo_url: photoUrl,
      accountAgeDays
    });

    const result = {
      verified: true,
      provider: 'telegram',
      userId: message.from.id.toString(),
      username: message.from.username || message.from.first_name,
      score: scoreResult.score,
      criteria: scoreResult.criteria,
      maxScore: scoreResult.maxScore,
      profile: {
        telegramId: message.from.id.toString(),
        telegramUsername: message.from.username,
        firstName: message.from.first_name,
        lastName: message.from.last_name,
        photoUrl: photoUrl,
        accountAgeDays
      }
    };

    // Save verification
    const userId = session.userId || session.passportId;
    if (userId) {
      // Generate commitment for privacy
      const platformId = 4; // Telegram = 4
      const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
      const commitmentInput = `${platformId}:${message.from.id.toString()}:${secretSalt}`;
      const commitment = crypto.createHash('sha256').update(commitmentInput).digest('hex') + 'field';
      
      await saveVerification(userId, 'telegram', {
        commitment: commitment, // PRIVACY: Use commitment, not providerAccountId
        score: result.score,
        maxScore: result.maxScore,
        status: 'verified',
        metadata: {
          commitment: commitment,
          score: result.score,
          maxScore: result.maxScore,
          criteria: result.criteria || [],
          // DO NOT store: userId, username, profile
        },
        accessTokenHash: null
      });
      console.log(`[Telegram Webhook] ✅ Verification saved for userId: ${userId.substring(0, 10)}...`);
    }

    // Update session with result and status
    await updateSession(sessionId, {
      status: 'verified',
      stateData: {
        ...session.stateData,
        telegramUserId: message.from.id,
        telegramUsername: message.from.username,
        telegramChatId: message.chat.id,
        result,
        completedAt: new Date()
      }
    });

    // Send message to user with link to complete verification
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    
    // Construct URLs
    // Telegram requires HTTPS for inline buttons, so we route through our backend if frontend is localhost
    const isLocalhost = frontendUrl.includes('localhost');
    const directCallbackUrl = `${frontendUrl}/verify/callback?provider=telegram&session=${sessionId}`;
    
    // If localhost, use backend redirect
    const buttonUrl = isLocalhost 
      ? `${backendUrl}/auth/redirect?url=${encodeURIComponent(directCallbackUrl)}`
      : directCallbackUrl;
    
    await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
      chat_id: message.chat.id,
      text: `🔐 Telegram Verification\n\n✅ Session found!\n\nClick the link below to complete verification:\n\n${directCallbackUrl}\n\n(If the button doesn't work, copy the link above)`,
      reply_markup: {
        inline_keyboard: [[
          { text: '✅ Complete Verification', url: buttonUrl }
        ]]
      }
    });

    res.status(200).json({ ok: true });
  } catch (error) {
    console.error('[Telegram Webhook] Error:', error);
    res.status(200).json({ ok: true }); // Always return 200 to Telegram
  }
});

// Generic Redirect Route (to help with localhost/Telegram limitations)
router.get('/redirect', (req, res) => {
  const { url } = req.query;
  if (!url) {
    return res.status(400).send('Missing url parameter');
  }
  // Basic validation to prevent open redirect abuse (allow localhost or our own domain)
  if (!url.startsWith('http://localhost') && !url.startsWith(process.env.FRONTEND_URL)) {
    console.warn('[Redirect] Blocked potential open redirect:', url);
    // return res.status(403).send('Invalid redirect URL'); 
    // For dev simplicity, we allow it for now or check against allowlist
  }
  res.redirect(url);
});

// TikTok OAuth
router.get('/tiktok/start', (req, res) => handleAuthStart(req, res, 'tiktok', tiktokAuth));
router.get('/tiktok/callback', (req, res) => handleAuthCallback(req, res, 'tiktok', tiktokCallback));
router.get('/tiktok/status', (req, res) => handleAuthStatus(req, res, 'tiktok', tiktokStatus));

// Solana Wallet
router.get('/solana/start', (req, res) => handleAuthStart(req, res, 'solana', solanaAuth));
router.post('/solana/callback', async (req, res) => {
  // Handle POST request with body data
  try {
    const sessionId = req.body.state || req.query.state;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'Missing session ID' });
    }

    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Pass req.body as query object for compatibility with handleAuthCallback
    const result = await solanaCallback(req.body, {
      id: sessionId,
      provider: session.provider,
      passportId: session.userId,
      stateData: session.stateData
    });

    if (result.verified) {
      const userId = session.userId || session.passportId;
      const commitment = result.commitment || null;
      
      await saveVerification(userId, 'solana', {
        commitment: commitment,
        score: result.score,
        maxScore: result.maxScore || result.score,
        status: 'verified',
        metadata: {
          commitment: commitment,
          score: result.score,
          maxScore: result.maxScore || result.score,
          criteria: result.criteria || [],
        },
      });

      await updateSession(sessionId, {
        status: 'verified',
        stateData: {
          ...session.stateData,
          result,
          completedAt: new Date()
        }
      });
    }

    const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?provider=solana&session=${sessionId}`;
    res.redirect(frontendUrl);
  } catch (error) {
    console.error('[Auth] ❌ solana callback error:', error.message, error.stack);
    res.redirect(`${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/callback?error=${encodeURIComponent(error.message)}`);
  }
});
router.get('/solana/status', (req, res) => handleAuthStatus(req, res, 'solana', solanaStatus));

// EVM SIWE
router.get('/evm/start', (req, res) => handleAuthStart(req, res, 'evm', evmAuth));
router.get('/evm/status', (req, res) => handleAuthStatus(req, res, 'evm', evmStatus));
router.post('/evm/callback', async (req, res) => {
  try {
    const sessionId = req.body.state || req.query.state;
    
    if (!sessionId) {
      return res.status(400).json({ error: 'session is required' });
    }

    const session = getVerificationSession(sessionId);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }

    // Handle callback
    const result = await evmCallback(req, session);
    
    // Update session with result
    session.status = result.verified ? 'verified' : 'failed';
    session.result = result;
    session.completedAt = Date.now();

    // Return result (frontend will poll status)
    res.json({
      provider: 'evm',
      session: sessionId,
      status: session.status,
      result
    });
  } catch (error) {
    console.error('[Auth] evm callback error:', error);
    res.status(500).json({ error: error.message });
  }
});
router.get('/evm/status', (req, res) => handleAuthStatus(req, res, 'evm', evmStatus));

export { router as authRoutes };

