// TikTok OAuth Provider
// TikTok uses OAuth 2.0 for authentication

import axios from 'axios';
import crypto from 'crypto';

const getTikTokConfig = () => {
  const TIKTOK_CLIENT_ID = (process.env.TIKTOK_CLIENT_ID || '').trim();
  const TIKTOK_CLIENT_SECRET = (process.env.TIKTOK_CLIENT_SECRET || '').trim();
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const cleanBackendUrl = BACKEND_URL.replace(/\/$/, '');
  const REDIRECT_URI = `${cleanBackendUrl}/auth/tiktok/callback`;
  
  if (!TIKTOK_CLIENT_ID || !TIKTOK_CLIENT_SECRET) {
    console.error('[TikTok] Configuration missing:', {
      hasClientId: !!TIKTOK_CLIENT_ID,
      hasClientSecret: !!TIKTOK_CLIENT_SECRET
    });
  } else {
    console.log('[TikTok] Configuration loaded:', {
      clientId: TIKTOK_CLIENT_ID.substring(0, 10) + '...',
      clientSecretLength: TIKTOK_CLIENT_SECRET.length,
      redirectUri: REDIRECT_URI
    });
  }
  
  return { TIKTOK_CLIENT_ID, TIKTOK_CLIENT_SECRET, REDIRECT_URI };
};

/**
 * Initialize TikTok OAuth and get authorization URL
 */
export const initClientAndGetAuthUrl = async (sessionId, callbackOverride) => {
  const { TIKTOK_CLIENT_ID, REDIRECT_URI } = getTikTokConfig();
  
  if (!TIKTOK_CLIENT_ID) {
    throw new Error('TikTok Client ID not configured. Please set TIKTOK_CLIENT_ID in backend/.env file.');
  }

  const redirectUri = callbackOverride || REDIRECT_URI;
  const state = sessionId;
  
  // TikTok OAuth 2.0 authorization URL
  const params = new URLSearchParams({
    client_key: TIKTOK_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'user.info.basic',
    state: state
  });
  
  const authUrl = `https://www.tiktok.com/v2/auth/authorize?${params.toString()}`;
  
  console.log('[TikTok] Generated auth URL:', authUrl.substring(0, 100) + '...');
  
  return { authUrl };
};

/**
 * Exchange authorization code for access token
 */
const requestAccessToken = async (code) => {
  const { TIKTOK_CLIENT_ID, TIKTOK_CLIENT_SECRET, REDIRECT_URI } = getTikTokConfig();
  
  if (!TIKTOK_CLIENT_ID || !TIKTOK_CLIENT_SECRET) {
    throw new Error('TikTok OAuth is not configured. Please set TIKTOK_CLIENT_ID and TIKTOK_CLIENT_SECRET in backend/.env file.');
  }

  try {
    const params = new URLSearchParams();
    params.append('client_key', TIKTOK_CLIENT_ID);
    params.append('client_secret', TIKTOK_CLIENT_SECRET);
    params.append('code', code);
    params.append('grant_type', 'authorization_code');
    params.append('redirect_uri', REDIRECT_URI);

    const response = await axios.post(
      'https://open.tiktokapis.com/v2/oauth/token/',
      params.toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    if (!response.data || !response.data.data || !response.data.data.access_token) {
      throw new Error('Invalid token response from TikTok');
    }

    return response.data.data.access_token;
  } catch (error) {
    console.error('[TikTok] Token request error:', error.response?.data || error.message);
    throw new Error(`Error requesting TikTok access token: ${error.message}`);
  }
};

/**
 * Make authenticated request to TikTok API
 */
const makeTikTokRequest = async (url, accessToken) => {
  try {
    const response = await axios.get(url, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/json'
      }
    });

    if (!response.data || response.data.error) {
      throw new Error(response.data.error?.message || 'TikTok API error');
    }

    return response.data.data || response.data;
  } catch (error) {
    console.error('[TikTok] API request error:', error.response?.data || error.message);
    throw new Error(`TikTok API request error: ${error.message}`);
  }
};

/**
 * Verify TikTok user
 */
export class TikTokProvider {
  async verify(payload) {
    const errors = [];
    
    try {
      const code = payload.proofs?.code;
      if (!code) {
        errors.push('Authorization code missing');
        return { valid: false, errors };
      }

      // Step 1: Exchange code for access token
      const accessToken = await requestAccessToken(code);

      // Step 2: Get user info
      const userInfo = await makeTikTokRequest(
        'https://open.tiktokapis.com/v2/user/info/?fields=open_id,union_id,avatar_url,display_name,username',
        accessToken
      );

      if (!userInfo.user || !userInfo.user.open_id) {
        errors.push('Failed to get TikTok user information');
        return { valid: false, errors };
      }

      const userId = userInfo.user.open_id;
      const username = userInfo.user.username || userInfo.user.display_name || '';
      const avatarUrl = userInfo.user.avatar_url || '';

      // Step 3: Calculate score using scoring function
      const { calculateTikTokScore } = await import('../scoring/tiktok.js');
      const scoreResult = calculateTikTokScore(userInfo);

      return {
        valid: true,
        record: { id: userId },
        errors: [],
        userId: userId,
        username: username,
        score: scoreResult.score,
        criteria: scoreResult.criteria,
        maxScore: scoreResult.maxScore,
        accessToken: accessToken,
        profile: {
          tiktokId: userId,
          tiktokUsername: username,
          displayName: userInfo.user.display_name,
          avatarUrl: avatarUrl
        }
      };
    } catch (error) {
      const errorMessage = error.message || 'Unknown error occurred';
      errors.push(`TikTok verification error: ${errorMessage}`);
      return { valid: false, errors };
    }
  }
}

/**
 * Handle TikTok OAuth callback
 */
export const tiktokCallback = async (query, session) => {
  const { code, state } = query;
  
  if (!code) {
    throw new Error('Authorization code missing');
  }

  const provider = new TikTokProvider();
  const payload = {
    proofs: {
      code: code
    }
  };

  const result = await provider.verify(payload);

  if (!result.valid) {
    throw new Error(result.errors?.join(', ') || 'Verification failed');
  }

  return {
    verified: result.valid && result.score > 0,
    provider: 'tiktok',
    userId: result.userId,
    username: result.username,
    score: result.score,
    criteria: result.criteria,
    maxScore: result.maxScore,
    profile: result.profile
  };
};

/**
 * Generate TikTok auth URL
 */
export const tiktokAuth = async (passportId, sessionId) => {
  const result = await initClientAndGetAuthUrl(sessionId);
  return result.authUrl;
};

/**
 * Get TikTok verification status
 */
export const tiktokStatus = async (session) => {
  return session.result || null;
};

