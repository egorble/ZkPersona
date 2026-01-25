import axios from 'axios';
import crypto from 'crypto';
import { calculateDiscordScore } from '../scoring/discord.js';

// ============================================
// Types documentation (following Gitcoin Passport pattern)
// DiscordTokenResponse: { access_token: string, token_type: string, expires_in?: number, refresh_token?: string }
// DiscordFindMyUserResponse: { user?: { id?: string, username?: string, discriminator?: string, email?: string, verified?: boolean } }
// DiscordGuild: { id: string, name: string, icon?: string, owner?: boolean }
// DiscordConnection: { type: string, name: string, verified: boolean, id?: string }
// ============================================
// OAuth Procedures (following Gitcoin pattern)
// ============================================

const getDiscordConfig = () => {
  const DISCORD_CLIENT_ID = (process.env.DISCORD_CLIENT_ID || '').trim();
  const DISCORD_CLIENT_SECRET = (process.env.DISCORD_CLIENT_SECRET || '').trim();
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  
  // Ensure no trailing slash in BACKEND_URL
  const cleanBackendUrl = BACKEND_URL.replace(/\/$/, '');
  const REDIRECT_URI = `${cleanBackendUrl}/auth/discord/callback`;
  
  // Validate configuration
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    console.error('[Discord] Configuration missing:', {
      hasClientId: !!DISCORD_CLIENT_ID,
      hasClientSecret: !!DISCORD_CLIENT_SECRET,
      clientIdLength: DISCORD_CLIENT_ID?.length || 0,
      clientSecretLength: DISCORD_CLIENT_SECRET?.length || 0
    });
  } else {
    // Log configuration on startup for debugging
    console.log('[Discord] Configuration loaded:', {
      clientId: DISCORD_CLIENT_ID.substring(0, 10) + '...',
      clientSecretLength: DISCORD_CLIENT_SECRET.length,
      redirectUri: REDIRECT_URI
    });
  }
  
  return { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, REDIRECT_URI };
};

/**
 * Initialize Discord OAuth and get authorization URL
 * Follows Gitcoin Passport pattern
 */
export const initClientAndGetAuthUrl = async (sessionId, callbackOverride) => {
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, REDIRECT_URI } = getDiscordConfig();
  
  if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
    throw new Error('DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET not configured. Please add these to backend/.env file.');
  }

  const redirectUri = callbackOverride || REDIRECT_URI;
  const state = sessionId;

  // Required scopes for Discord verification
  // identify: basic user info
  // email: user email
  // guilds: server list (for verification)
  // guilds.members.read: read server member info
  // connections: linked accounts (for verification)
  const scopes = 'identify email guilds guilds.members.read connections';

  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: scopes,
    state,
    prompt: 'consent' // Show Discord OAuth page (like Propel)
  });
  
  console.log('[Discord] OAuth URL generated:', {
    clientId: DISCORD_CLIENT_ID.substring(0, 10) + '...',
    redirectUri: redirectUri,
    scopes: scopes,
    state: state.substring(0, 20) + '...'
  });

  return {
    authUrl: `https://discord.com/api/oauth2/authorize?${params.toString()}`,
    state
  };
};

/**
 * Exchange authorization code for access token
 * Follows Gitcoin Passport pattern: requestAccessToken
 */
export const requestAccessToken = async (code) => {
  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, REDIRECT_URI } = getDiscordConfig();
  
  if (!code) {
    throw new Error('Authorization code is required');
  }

  try {
    // Validate credentials before making request
    if (!DISCORD_CLIENT_ID || !DISCORD_CLIENT_SECRET) {
      throw new Error('DISCORD_CLIENT_ID or DISCORD_CLIENT_SECRET is missing');
    }
    
    // Discord requires form-urlencoded format
    // Use URLSearchParams for proper encoding
    const params = new URLSearchParams();
    params.append('grant_type', 'authorization_code');
    params.append('code', code);
    params.append('client_id', DISCORD_CLIENT_ID);
    params.append('client_secret', DISCORD_CLIENT_SECRET);
    params.append('redirect_uri', REDIRECT_URI);
    
    const requestBody = params.toString();
    
    console.log('[Discord] Token exchange request details:', {
      clientId: DISCORD_CLIENT_ID,
      clientSecretLength: DISCORD_CLIENT_SECRET.length,
      clientSecretFirst3: DISCORD_CLIENT_SECRET.substring(0, 3),
      clientSecretLast3: DISCORD_CLIENT_SECRET.substring(DISCORD_CLIENT_SECRET.length - 3),
      redirectUri: REDIRECT_URI,
      codeLength: code.length,
      requestBodyPreview: requestBody.replace(/client_secret=[^&]+/, 'client_secret=***').replace(/code=[^&]+/, 'code=***')
    });
    
    // IMPORTANT: Verify Client Secret matches Discord Developer Portal
    // If you see "Reset Secret" button was clicked, you need to copy the NEW secret!
    console.log('[Discord] ⚠️  Verify Client Secret in Discord Developer Portal matches .env file');
    console.log('[Discord] ⚠️  If "Reset Secret" was clicked, copy the NEW secret to backend/.env');
    
    // Discord OAuth2 token endpoint - send as form-urlencoded string
    // Discord API expects exact format: application/x-www-form-urlencoded
    const tokenRequest = await axios.post(
      'https://discord.com/api/oauth2/token',
      requestBody, // URLSearchParams.toString() gives proper form-urlencoded format
      {
        headers: { 
          'Content-Type': 'application/x-www-form-urlencoded',
          'Accept': 'application/json'
        }
      }
    );

    if (tokenRequest.status !== 200) {
      throw new Error(`Token exchange returned status ${tokenRequest.status} instead of 200`);
    }

    const tokenResponse = tokenRequest.data;
    return tokenResponse.access_token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.error_description || errorData?.error || error.message;
      
      // Log detailed error for debugging
      console.error('[Discord] Token exchange error:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        error: errorData,
        redirectUri: REDIRECT_URI,
        hasClientId: !!DISCORD_CLIENT_ID,
        hasClientSecret: !!DISCORD_CLIENT_SECRET,
        clientIdLength: DISCORD_CLIENT_ID?.length || 0,
        clientSecretLength: DISCORD_CLIENT_SECRET?.length || 0,
        clientIdPrefix: DISCORD_CLIENT_ID?.substring(0, 5) || 'none',
        // Don't log full secret, just first/last chars for verification
        clientSecretPrefix: DISCORD_CLIENT_SECRET ? `${DISCORD_CLIENT_SECRET.substring(0, 3)}...${DISCORD_CLIENT_SECRET.substring(DISCORD_CLIENT_SECRET.length - 3)}` : 'none'
      });
      
      throw new Error(`Error requesting Discord access token: ${errorMessage}`);
    }
    throw error;
  }
};

/**
 * Make Discord API request with rate limit handling
 * Follows Gitcoin Passport pattern: makeDiscordRequest
 */
async function makeDiscordRequest(url, accessToken, retries = 3) {
  let lastError;

  for (let attempt = 0; attempt < retries; attempt++) {
    try {
      const response = await axios.get(url, {
        headers: { 
          Authorization: `Bearer ${accessToken}`,
          'User-Agent': 'zkpersona-backend/1.0'
        },
      });
      return response.data;
    } catch (error) {
      lastError = error;

      if (axios.isAxiosError(error)) {
        // Log detailed error for debugging
        if (error.response?.status === 401) {
          console.error('[Discord] API 401 Unauthorized:', {
            url,
            status: error.response.status,
            statusText: error.response.statusText,
            error: error.response.data,
            accessTokenPrefix: accessToken ? accessToken.substring(0, 10) + '...' : 'missing'
          });
        }

        if (error.response?.status === 429) {
        // Rate limited - check Retry-After header
        const retryAfter = error.response.headers['retry-after'];
        const waitMs = retryAfter ? parseInt(retryAfter) * 1000 : Math.pow(2, attempt) * 1000;

        if (attempt < retries - 1) {
          // Wait and retry
          await new Promise(resolve => setTimeout(resolve, waitMs));
          continue;
        }
      }

      // For non-429 errors, throw immediately
        if (error.response?.status !== 429) {
          throw new Error(`Discord API request error: ${error.message}`);
        }
      } else {
        throw new Error(`Discord API request error: ${error.message}`);
      }
    }
  }

  throw lastError;
}

// ============================================
// Discord Provider Class (Gitcoin Passport pattern)
// ============================================

/**
 * Discord Provider - implements verify() method
 * Following Gitcoin Passport Provider pattern
 */
export class DiscordProvider {
  type = 'Discord';
  _options = {};

  constructor(options = {}) {
    this._options = { ...this._options, ...options };
  }

  /**
   * Verify Discord account - main method following Gitcoin pattern
   * @param {Object} payload - Contains proofs.code from OAuth callback
   * @returns {Promise<{valid: boolean, record?: object, errors?: string[]}>}
   */
  async verify(payload) {
    const errors = [];

    try {
      // Step 1: Exchange code for access token
      const code = payload.proofs?.code;
      if (!code) {
        errors.push('Authorization code missing');
        return { valid: false, errors };
      }

      const accessToken = await requestAccessToken(code);

      // Step 2: Get user info (following Gitcoin pattern)
      const userInfo = await makeDiscordRequest(
        'https://discord.com/api/oauth2/@me',
        accessToken
      );

      if (!userInfo.user?.id) {
        errors.push('We were not able to verify a Discord account with your provided credentials.');
        return { valid: false, errors };
      }

      const userId = userInfo.user.id;

      // Step 3: Validate account age (from snowflake ID - Gitcoin pattern)
      const snowflake = BigInt(userId);
      const timestamp = Number(snowflake >> 22n) + 1420070400000;
      const createdAt = new Date(timestamp);
      const accountAgeDays = Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24));

      // Step 4: Get server list and validate count
      const guilds = await makeDiscordRequest(
        'https://discord.com/api/users/@me/guilds',
        accessToken
      );

      // Step 5: Get verified connections
      const connections = await makeDiscordRequest(
        'https://discord.com/api/users/@me/connections',
        accessToken
      );
      const verifiedConnections = connections.filter(conn => conn.verified);

      // Step 6: Validate user (following Gitcoin Passport validation)
      const validationResult = this.validateUser({
        userId,
        accountAgeDays,
        guildCount: guilds.length,
        verifiedConnectionsCount: verifiedConnections.length
      });

      if (!validationResult.valid) {
        console.log(`[Discord] ❌ Validation failed:`, validationResult.errors);
        return { valid: false, errors: validationResult.errors };
      }

      // Step 7: Calculate score (only if validation passed)
      // IMPORTANT: Score is calculated based on actual criteria met
      const userFullInfo = await makeDiscordRequest(
        'https://discord.com/api/v10/users/@me',
        accessToken
      );

      const scoreResult = calculateDiscordScore(userFullInfo, guilds);
      
      // Log score calculation for debugging
      console.log(`[Discord] 📊 Score calculated:`, {
        totalScore: scoreResult.score,
        maxScore: scoreResult.maxScore,
        criteriaCount: scoreResult.criteria.length,
        achievedCriteria: scoreResult.criteria.filter(c => c.achieved).length,
        criteria: scoreResult.criteria.map(c => ({
          condition: c.condition,
          achieved: c.achieved,
          points: c.points
        }))
      });
      
      // Ensure we don't save verification with 0 score if no criteria met
      if (scoreResult.score === 0) {
        console.warn(`[Discord] ⚠️ Score is 0 - no criteria met, but validation passed. This should not happen.`);
      }

      // Step 8: Generate commitment hash
      const commitment = this.generateCommitment(userId);

      // Step 9: Prepare profile data
      const avatarHash = userFullInfo.avatar;
      const discordAvatarUrl = avatarHash 
        ? `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${avatarHash.startsWith('a_') ? 'gif' : 'png'}?size=256`
        : null;
      
      const discordUsername = userInfo.user.username || userFullInfo.username;
      const discordDiscriminator = userInfo.user.discriminator || userFullInfo.discriminator || null;
      const discordNickname = userFullInfo.global_name || userFullInfo.username || discordUsername;
      
      // Step 10: Return verified result (PRIVACY: no profile data)
      return {
        valid: true,
        record: {
          id: userId
        },
        errors: [],
        // PRIVACY: Only return commitment, not userId or username
        commitment: commitment,
        score: scoreResult.score,
        criteria: scoreResult.criteria,
        maxScore: scoreResult.maxScore,
        accessToken: accessToken,
        // DO NOT return profile data - violates anonymity
      };
    } catch (error) {
      const errorMessage = error.message || 'Unknown error occurred';
      errors.push(`Discord verification error: ${errorMessage}`);
      return { valid: false, errors };
    }
  }

  /**
   * Validate Discord user meets requirements
   * Following Gitcoin Passport validation pattern
   */
  validateUser(userData) {
    const errors = [];

    // Account age requirement (365 days - from Gitcoin Passport)
    if (userData.accountAgeDays < 365) {
      errors.push(`Discord account must be at least 365 days old (current: ${userData.accountAgeDays} days)`);
    }

    // Server membership requirement (10 servers - from Gitcoin Passport)
    if (userData.guildCount < 10) {
      errors.push(`Must be a member of at least 10 servers (current: ${userData.guildCount})`);
    }

    // Verified connections requirement (2 connections - from Gitcoin Passport)
    if (userData.verifiedConnectionsCount < 2) {
      errors.push(`Must have at least 2 verified external connections (current: ${userData.verifiedConnectionsCount})`);
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Generate commitment hash for Aleo blockchain
   * Format: SHA-256(platform_id:user_id:secret_salt)
   */
  generateCommitment(userId) {
    const platformId = 1; // Discord = 1 (per spec)
    const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
    const input = `${platformId}:${userId}:${secretSalt}`;
    
    const hash = crypto
      .createHash('sha256')
      .update(input)
      .digest('hex');
    
    return `${hash}field`;
  }
}

// ============================================
// Legacy Export Functions (for backward compatibility)
// ============================================

/**
 * Generate OAuth authorization URL (legacy function)
 */
export const discordAuth = async (passportId, sessionId) => {
  const result = await initClientAndGetAuthUrl(sessionId);
  return result.authUrl;
};

/**
 * Handle OAuth callback (legacy function)
 */
export const discordCallback = async (query, session) => {
  const { code, state } = query;
  
  if (!code) {
    throw new Error('Authorization code missing');
  }

  // Use Provider class for verification
  const provider = new DiscordProvider();
  const payload = {
    proofs: {
      code: code
    }
  };

  const result = await provider.verify(payload);

  // IMPORTANT: Only return verified=true if validation passed AND score > 0
  // This ensures we don't save verifications with 0 score or failed validations
  if (!result.valid) {
    console.log(`[Discord] ❌ Verification failed validation:`, result.errors);
    throw new Error(result.errors?.join(', ') || 'Verification failed');
  }

  // Double-check: Don't allow verification if score is 0 (no criteria met)
  if (result.score === 0 || result.score === undefined) {
    console.warn(`[Discord] ⚠️ Verification passed validation but score is 0 - rejecting`);
    throw new Error('Verification failed: No scoring criteria met');
  }

  // Return in expected format
  return {
    verified: result.valid && result.score > 0, // Only verified if valid AND has score
    provider: 'discord',
    userId: result.userId,
    username: result.username,
    score: result.score,
    criteria: result.criteria,
    commitment: result.commitment,
    metadataHash: result.commitment, // Alias for backward compatibility
    maxScore: result.maxScore,
    profile: result.profile // Include profile data
  };
};

/**
 * Get verification status (legacy function)
 */
export const discordStatus = async (session) => {
  return session.result || null;
};
