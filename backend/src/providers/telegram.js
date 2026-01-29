// Telegram OAuth Provider
// Telegram uses Bot API for verification

import axios from 'axios';
import crypto from 'crypto';
import { generateAleoCommitment } from '../utils/aleoField.js';

export const getTelegramConfig = () => {
  const TELEGRAM_BOT_TOKEN = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const cleanBackendUrl = BACKEND_URL.replace(/\/$/, '');
  const REDIRECT_URI = `${cleanBackendUrl}/auth/telegram/callback`;
  
  if (!TELEGRAM_BOT_TOKEN) {
    console.error('[Telegram] Configuration missing: TELEGRAM_BOT_TOKEN');
  } else {
    console.log('[Telegram] Configuration loaded:', {
      botTokenLength: TELEGRAM_BOT_TOKEN.length,
      redirectUri: REDIRECT_URI
    });
  }
  
  return { TELEGRAM_BOT_TOKEN, REDIRECT_URI };
};

/**
 * Initialize Telegram OAuth and get authorization URL
 * Uses bot deep linking for local development (OAuth requires HTTPS domain)
 */
export const initClientAndGetAuthUrl = async (sessionId, callbackOverride) => {
  const { TELEGRAM_BOT_TOKEN, REDIRECT_URI } = getTelegramConfig();
  
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram Bot Token not configured. Please set TELEGRAM_BOT_TOKEN in backend/.env file.');
  }

  const botUsername = process.env.TELEGRAM_BOT_USERNAME || 'zkpersona_bot';
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
  
  // Use bot deep linking for local development
  // User will click /start in bot, then return to website to complete verification
  const authUrl = `https://t.me/${botUsername}?start=${sessionId}`;
  
  console.log('[Telegram] Generated bot deep link:', authUrl);
  console.log('[Telegram] After clicking /start in bot, user should return to:', `${frontendUrl}/verify/callback?provider=telegram&session=${sessionId}`);
  
  return { authUrl };
};

/**
 * Verify Telegram user data
 * Telegram sends data via webhook or we verify via Bot API
 */
export const verifyTelegramUser = async (telegramData) => {
  const { TELEGRAM_BOT_TOKEN } = getTelegramConfig();
  
  if (!TELEGRAM_BOT_TOKEN) {
    throw new Error('Telegram Bot Token not configured');
  }

  try {
    // Verify data authenticity using Telegram's hash verification
    const { id, first_name, last_name, username, photo_url, auth_date, hash } = telegramData;
    
    if (!id || !auth_date || !hash) {
      throw new Error('Invalid Telegram data: missing required fields');
    }

    // Verify hash (Telegram's security check)
    const dataCheckString = Object.keys(telegramData)
      .filter(key => key !== 'hash')
      .sort()
      .map(key => `${key}=${telegramData[key]}`)
      .join('\n');
    
    const secretKey = crypto
      .createHash('sha256')
      .update(TELEGRAM_BOT_TOKEN)
      .digest();
    
    const calculatedHash = crypto
      .createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    if (calculatedHash !== hash) {
      throw new Error('Invalid Telegram data: hash verification failed');
    }

    // Check auth_date (should be recent, within 86400 seconds = 24 hours)
    const currentTime = Math.floor(Date.now() / 1000);
    const authDate = parseInt(auth_date);
    if (currentTime - authDate > 86400) {
      throw new Error('Telegram data expired: auth_date is too old');
    }

    // Get user info from Bot API
    const botResponse = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getMe`);
    if (!botResponse.data.ok) {
      throw new Error('Failed to verify bot');
    }

    // Calculate score using scoring function
    const { calculateTelegramScore } = await import('../scoring/telegram.js');
    const accountAgeDays = Math.floor((currentTime - authDate) / 86400);
    
    const scoreResult = calculateTelegramScore({
      id,
      username,
      photo_url,
      accountAgeDays
    });

    // Generate Aleo-compatible commitment for privacy
    const platformId = 4; // Telegram = 4
    const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
    const commitment = generateAleoCommitment(platformId, id.toString(), secretSalt);
    
    return {
      valid: true,
      record: { id: id.toString() },
      errors: [],
      commitment: commitment, // PRIVACY: Return commitment, not userId
      score: scoreResult.score,
      criteria: scoreResult.criteria,
      maxScore: scoreResult.maxScore,
      // DO NOT return: userId, username, profile
    };
  } catch (error) {
    console.error('[Telegram] Verification error:', error);
    return {
      valid: false,
      errors: [error.message || 'Telegram verification failed']
    };
  }
};

/**
 * Handle Telegram OAuth callback
 * Telegram Login Widget sends data in query parameters
 */
export const telegramCallback = async (query, session) => {
  console.log('[Telegram] Callback received with query:', Object.keys(query));
  console.log('[Telegram] Session stateData:', session?.stateData);
  
  const { TELEGRAM_BOT_TOKEN } = getTelegramConfig();
  
  // Try to get Telegram user data from query (Telegram Login Widget OAuth)
  const { id, hash, auth_date, first_name, last_name, username, photo_url, state } = query;
  
  // If we have OAuth data from Telegram Login Widget, use it
  if (id && hash && auth_date) {
    console.log('[Telegram] Using OAuth data from Telegram Login Widget');
    
    const telegramData = {
      id: parseInt(id),
      first_name,
      last_name,
      username,
      photo_url,
      auth_date: parseInt(auth_date),
      hash
    };

    console.log('[Telegram] Verifying Telegram user data from OAuth...');
    const result = await verifyTelegramUser(telegramData);

    if (!result.valid) {
      console.error('[Telegram] Verification failed:', result.errors);
      throw new Error(result.errors?.join(', ') || 'Verification failed');
    }

    const userIdStr = (result.record && result.record.id) ? String(result.record.id) : String(telegramData.id);
    console.log('[Telegram] Verification successful:', { score: result.score });

    // Generate Aleo-compatible commitment for privacy (must match backend aleoField)
    const platformId = 4; // Telegram = 4 (per spec)
    const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
    const commitment = generateAleoCommitment(platformId, userIdStr, secretSalt);

    return {
      verified: result.valid && result.score > 0,
      provider: 'telegram',
      commitment,
      score: result.score,
      criteria: result.criteria,
      maxScore: result.maxScore,
    };
  }
  
  // Otherwise, try to get data from session (from bot webhook)
  if (session?.stateData?.telegramUserId) {
    console.log('[Telegram] Using data from bot webhook session');
    
    try {
      // Get user info from Bot API
      const userResponse = await axios.get(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getChat`, {
        params: {
          chat_id: session.stateData.telegramUserId
        }
      });
      
      if (!userResponse.data.ok) {
        throw new Error('Failed to get user info from Telegram Bot API');
      }
      
      const chat = userResponse.data.result;
      const telegramUserId = session.stateData.telegramUserId;
      const telegramUsername = session.stateData.telegramUsername || chat.username;
      
      // For bot API verification, we can't verify hash, so we use a simplified verification
      // This is less secure but works for local development
      const { calculateTelegramScore } = await import('../scoring/telegram.js');
      const currentTime = Math.floor(Date.now() / 1000);
      
      // Estimate account age (we can't get exact creation date from Bot API)
      // Use a default value or try to get from user profile
      const accountAgeDays = 365; // Default to 1 year for bot API verification
      
      const scoreResult = calculateTelegramScore({
        id: telegramUserId,
        username: telegramUsername,
        photo_url: null, // Can't get photo URL easily from Bot API
        accountAgeDays
      });
      
      // Generate Aleo-compatible commitment for privacy
      const platformId = 4; // Telegram = 4
      const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
      const commitment = generateAleoCommitment(platformId, telegramUserId.toString(), secretSalt);
      
      return {
        verified: true,
        provider: 'telegram',
        commitment: commitment, // PRIVACY: Return commitment, not userId
        score: scoreResult.score,
        criteria: scoreResult.criteria,
        maxScore: scoreResult.maxScore,
        // DO NOT return: userId, username, profile
      };
    } catch (error) {
      console.error('[Telegram] Error getting user info from Bot API:', error);
      throw new Error('Failed to verify Telegram user via Bot API. Please try using Telegram Login Widget or ensure webhook is configured.');
    }
  }
  
  // No data available
  console.error('[Telegram] Missing required Telegram data in callback:', { 
    hasOAuthData: !!(id && hash && auth_date),
    hasSessionData: !!(session?.stateData?.telegramUserId),
    queryKeys: Object.keys(query)
  });
  throw new Error('Missing required Telegram data. Please complete the Telegram authorization by clicking /start in the bot or using Telegram Login Widget.');
};

/**
 * Generate Telegram auth URL
 */
export const telegramAuth = async (passportId, sessionId) => {
  const result = await initClientAndGetAuthUrl(sessionId);
  return result.authUrl;
};

/**
 * Get Telegram verification status
 */
export const telegramStatus = async (session) => {
  return session.result || null;
};

