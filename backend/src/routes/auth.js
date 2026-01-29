import express from 'express';
import crypto from 'crypto';
import { discordAuth, discordCallback, discordStatus } from '../providers/discord.js';
import { telegramAuth, telegramCallback, telegramStatus } from '../providers/telegram.js';
// TikTok removed - no longer supported
import { evmAuth, evmCallback, evmStatus } from '../providers/evm.js';
import { solanaAuth, solanaCallback, solanaStatus } from '../providers/solana.js';
import { getSession, saveSession, updateSession, hashToken } from '../database/index.js';
import { v4 as uuidv4 } from 'uuid';
import { generateAleoCommitment } from '../utils/aleoField.js';

const router = express.Router();

// Generic route handler
const handleAuthStart = async (req, res, provider, authHandler) => {
  try {
    const walletId = req.query.walletId || req.query.passportId;
    
    console.log(`[Auth] 🚀 ${provider} verification start requested:`, { walletId });
    
    if (!walletId) {
      console.error(`[Auth] ❌ ${provider} start: Missing walletId`);
      return res.status(400).json({ error: 'walletId is required' });
    }

    const sessionId = `${provider}_${uuidv4()}`;
    await saveSession(sessionId, provider, walletId, {
      walletId,
      status: 'in_progress'
    });

    console.log(`[Auth] ✅ ${provider} session created:`, sessionId);
    console.log(`[Auth] 💾 Session saved with ID:`, sessionId, `for walletId:`, walletId);

    const result = await authHandler(walletId, sessionId);
    
    if (provider === 'evm' || provider === 'solana') {
      return res.json({
        sessionId,
        walletId,
        provider,
        ...(typeof result === 'object' ? result : {})
      });
    }
    
    // For OAuth providers, redirect to provider
    const redirectUrl = typeof result === 'string' ? result : result.url || result.authUrl;
    console.log(`[Auth] 🔗 ${provider} redirecting to provider:`, redirectUrl?.substring(0, 100) + '...');
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

    const result = await callbackHandler(req.query, {
      id: sessionId,
      provider: session.provider,
      walletId: session.userId,
      passportId: session.userId,
      stateData: session.stateData
    });
    
    console.log(`[Auth] ✅ ${provider} verification completed:`, {
      verified: result.verified,
      score: result.score,
      provider
    });
    
    // GITCOIN PASSPORT MODEL: НЕ зберігаємо верифікацію в БД!
    // Scores зберігаються тільки на blockchain (Aleo) через claim_social_stamp
    // Backend тільки розраховує score та повертає результат
    
    if (!result.verified) {
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Verification Failed</title></head>
          <body>
            <script>
              if (window.opener && !window.opener.closed) {
                try { window.opener.postMessage({ type: 'oauth-error', provider: '${provider}', error: 'Verification failed' }, '*'); } catch (e) { console.error(e); }
              }
              window.close();
            </script>
          </body>
        </html>
      `);
    }
    
    // Підготувати результат для frontend (БЕЗ особистих даних)
    const frontendResult = {
      provider: result.provider || provider,
      score: result.score || 0,
      commitment: result.commitment || null,
      criteria: result.criteria || [],
      maxScore: result.maxScore || result.score || 0
      // НЕ повертаємо: userId, email, username, profile
    };
    
    // PostMessage target '*' so opener receives regardless of port (5173 vs 5174 etc). Frontend validates structure & provider.
    console.log(`[Auth] ${provider} sending result via postMessage (target *)`);
    
    res.send(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Verification Complete</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #1a1a1a; color: white; }
            .container { text-align: center; padding: 2rem; }
            .success { font-size: 3rem; margin-bottom: 1rem; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success">✅</div>
            <h2>Verification Complete</h2>
            <p>You can close this window.</p>
          </div>
          <script>
            (function() {
              let messageSent = false;
              const result = ${JSON.stringify(frontendResult)};
              function send() {
                if (messageSent) return;
                if (window.opener && !window.opener.closed) {
                  try {
                    window.opener.postMessage({ type: 'oauth-complete', provider: '${provider}', result: result }, '*');
                    messageSent = true;
                    setTimeout(function() { if (window.opener && !window.opener.closed) window.close(); }, 1500);
                  } catch (e) { console.error(e); setTimeout(send, 300); }
                } else {
                  document.body.querySelector('.container').innerHTML = '<div class="success">✅</div><h2>Verification Complete</h2><p>Return to the main tab to see results.</p>';
                }
              }
              send();
              setTimeout(send, 150);
              setTimeout(send, 500);
            })();
          </script>
        </body>
      </html>
    `);
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
      walletId: sessionData.userId,
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

// Telegram: special flow — don't redirect popup to t.me; show instructions + open bot in new tab, user closes popup
router.get('/telegram/start', async (req, res) => {
  try {
    const walletId = req.query.walletId || req.query.passportId;
    if (!walletId) {
      return res.status(400).json({ error: 'walletId is required' });
    }
    const sessionId = `telegram_${uuidv4()}`;
    await saveSession(sessionId, 'telegram', walletId, { walletId, status: 'in_progress' });
    const authUrl = await telegramAuth(walletId, sessionId);
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const callbackUrl = `${frontendUrl}/verify/callback?provider=telegram&session=${sessionId}`;
    res.set('Content-Type', 'text/html; charset=utf-8');
    res.send(`
<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Telegram Verification</title>
<style>
  body { font-family: system-ui, sans-serif; background: #0a0a0a; color: #e5e5e5; margin: 0; padding: 24px; min-height: 100vh; display: flex; align-items: center; justify-content: center; }
  .box { max-width: 420px; background: #171717; border: 1px solid #333; border-radius: 12px; padding: 24px; }
  h1 { font-size: 1.25rem; margin: 0 0 16px; }
  p { margin: 0 0 12px; font-size: 0.9rem; line-height: 1.5; color: #a3a3a3; }
  ol { margin: 0 0 20px; padding-left: 20px; color: #a3a3a3; font-size: 0.9rem; }
  a.btn { display: inline-block; background: #0088cc; color: #fff; text-decoration: none; padding: 12px 20px; border-radius: 8px; font-weight: 600; margin: 8px 8px 8px 0; }
  a.btn:hover { background: #0099dd; }
  button { background: #333; color: #e5e5e5; border: 1px solid #444; padding: 10px 18px; border-radius: 8px; cursor: pointer; font-size: 0.9rem; }
  button:hover { background: #404040; }
</style></head>
<body>
  <div class="box">
    <h1>🔐 Telegram Verification</h1>
    <p>Follow these steps:</p>
    <ol>
      <li>Click <strong>Open Telegram Bot</strong> below (opens in a new tab).</li>
      <li>In Telegram, tap <strong>Start</strong> or send <strong>/start</strong> to the bot.</li>
      <li>The bot will send you a message with a link — click <strong>Complete Verification</strong> in that message.</li>
      <li>Return to the main site tab to see your result.</li>
    </ol>
    <p><strong>Note:</strong> The bot must have its webhook configured to this backend. If you see no reply from the bot, ask the admin to set the Telegram webhook (see backend README).</p>
    <a href="${authUrl}" target="_blank" rel="noopener" class="btn">Open Telegram Bot</a>
    <button type="button" onclick="window.close()">Close this window</button>
  </div>
</body></html>
    `);
  } catch (err) {
    console.error('[Auth] Telegram start error:', err);
    res.status(500).json({ error: err.message });
  }
});
router.get('/telegram/callback', (req, res) => handleAuthCallback(req, res, 'telegram', telegramCallback));
router.get('/telegram/status', (req, res) => handleAuthStatus(req, res, 'telegram', telegramStatus));

// One-time: set Telegram bot webhook so the bot receives /start (must be public HTTPS URL)
// Call: GET /auth/telegram/set-webhook (e.g. from browser or curl). For local dev use ngrok and set BACKEND_URL to ngrok URL first.
router.get('/telegram/set-webhook', async (req, res) => {
  try {
    const { getTelegramConfig } = await import('../providers/telegram.js');
    const { TELEGRAM_BOT_TOKEN } = getTelegramConfig();
    if (!TELEGRAM_BOT_TOKEN) {
      return res.status(400).json({ error: 'TELEGRAM_BOT_TOKEN not set' });
    }
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:3001').replace(/\/$/, '');
    const webhookUrl = `${backendUrl}/auth/telegram/webhook`;
    if (webhookUrl.includes('localhost')) {
      return res.status(400).json({
        error: 'BACKEND_URL must be a public HTTPS URL for Telegram webhook. Use ngrok for local dev: ngrok http 3001, then set BACKEND_URL to the ngrok URL and call this again.',
        webhookUrl,
      });
    }
    const axios = (await import('axios')).default;
    const r = await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, { url: webhookUrl });
    res.json({ ok: true, result: r.data, webhookUrl });
  } catch (err) {
    console.error('[Telegram] setWebhook error:', err.response?.data || err.message);
    res.status(500).json({ error: err.message, details: err.response?.data });
  }
});

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

    // GITCOIN PASSPORT MODEL: НЕ зберігаємо верифікацію в БД!
    // Generate Aleo-compatible commitment
    const platformId = 4; // Telegram = 4
    const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
    const commitment = generateAleoCommitment(platformId, message.from.id.toString(), secretSalt);
    
    // Додати commitment до результату
    result.commitment = commitment;

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

// TikTok OAuth - REMOVED (no longer supported)

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
      walletId: session.userId,
      passportId: session.userId,
      stateData: session.stateData
    });

    // GITCOIN PASSPORT MODEL: НЕ зберігаємо верифікацію в БД!
    // Просто повертаємо результат через postMessage (якщо це popup) або JSON (якщо direct call)
    
    if (result.verified) {
      // Підготувати результат для frontend (БЕЗ особистих даних)
      const frontendResult = {
        provider: 'solana',
        score: result.score || 0,
        commitment: result.commitment || null,
        criteria: result.criteria || [],
        maxScore: result.maxScore || result.score || 0
      };
      
      // Якщо це popup (через window.opener), використати postMessage
      // Інакше повернути JSON (для direct API calls)
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      
      // Для Solana, зазвичай це direct API call, але можна підтримати обидва варіанти
      if (req.headers['x-requested-with'] === 'XMLHttpRequest' || req.headers.accept?.includes('application/json')) {
        return res.json(frontendResult);
      }
      
      // Fallback: postMessage HTML
      return res.send(`
        <!DOCTYPE html>
        <html>
          <head><title>Verification Complete</title></head>
          <body>
            <script>
              if (window.opener) {
                window.opener.postMessage({
                  type: 'oauth-complete',
                  provider: 'solana',
                  result: ${JSON.stringify(frontendResult)}
                }, '${frontendUrl}');
                window.close();
              }
            </script>
          </body>
        </html>
      `);
    }
    
    res.status(400).json({ error: 'Verification failed' });
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

