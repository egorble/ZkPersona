import axios from 'axios';
import crypto from 'crypto';
import { calculateTwitterScore } from '../scoring/twitter.js';

// ============================================
// Types documentation (following Gitcoin Passport pattern)
// TwitterTokenResponse: { access_token: string, token_type: string, expires_in?: number }
// TwitterUserData: { id: string, username: string, name?: string, created_at?: string, public_metrics?: {...}, verified?: boolean }
// ============================================
// OAuth Procedures (following Gitcoin pattern)
// ============================================

const getTwitterConfig = () => {
  const TWITTER_CLIENT_ID = process.env.TWITTER_CLIENT_ID;
  const TWITTER_CLIENT_SECRET = process.env.TWITTER_CLIENT_SECRET;
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const REDIRECT_URI = `${BACKEND_URL}/auth/twitter/callback`;
  
  return { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, REDIRECT_URI };
};

/**
 * Initialize Twitter OAuth client and get authorization URL
 * Follows Gitcoin Passport pattern: initClientAndGetAuthUrl
 */
export const initClientAndGetAuthUrl = async (sessionId, callbackOverride) => {
  const { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, REDIRECT_URI } = getTwitterConfig();
  
  if (!TWITTER_CLIENT_ID || !TWITTER_CLIENT_SECRET) {
    throw new Error('TWITTER_CLIENT_ID or TWITTER_CLIENT_SECRET not configured. Please add these to backend/.env file.');
  }

  const redirectUri = callbackOverride || REDIRECT_URI;

  // Generate PKCE (required for Twitter OAuth 2.0)
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // State contains sessionId and codeVerifier (for later retrieval)
  const state = `${sessionId}:${codeVerifier}`;

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: TWITTER_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'tweet.read users.read offline.access',
    state: state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  // Return auth URL (frontend will redirect user here)
  return {
    authUrl: `https://twitter.com/i/oauth2/authorize?${params.toString()}`,
    codeVerifier, // Store in session for later
    state
  };
};

/**
 * Exchange authorization code for access token
 * Follows Gitcoin Passport pattern: requestAccessToken
 */
export const requestAccessToken = async (code, codeVerifier) => {
  const { TWITTER_CLIENT_ID, TWITTER_CLIENT_SECRET, REDIRECT_URI } = getTwitterConfig();
  
  if (!code || !codeVerifier) {
    throw new Error('Authorization code and code verifier are required');
  }

  try {
    const tokenResponse = await axios.post(
      'https://api.twitter.com/2/oauth2/token',
      new URLSearchParams({
        code,
        grant_type: 'authorization_code',
        client_id: TWITTER_CLIENT_ID,
        redirect_uri: REDIRECT_URI,
        code_verifier: codeVerifier
      }),
      {
        auth: {
          username: TWITTER_CLIENT_ID,
          password: TWITTER_CLIENT_SECRET
        },
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    if (tokenResponse.status !== 200) {
      throw new Error(`Token exchange returned status ${tokenResponse.status} instead of 200`);
    }

    const tokenData = tokenResponse.data;
    return tokenData.access_token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error_description || error.message;
      throw new Error(`Error requesting Twitter access token: ${errorMessage}`);
    }
    throw error;
  }
};

/**
 * Get Twitter user data using access token
 * Follows Gitcoin Passport pattern: getTwitterUserData
 */
export const getTwitterUserData = async (accessToken) => {
  try {
    const userInfoResponse = await axios.get('https://api.twitter.com/2/users/me', {
      params: {
        'user.fields': 'created_at,public_metrics,verified'
      },
      headers: { 
        Authorization: `Bearer ${accessToken}`
      }
    });

    if (userInfoResponse.status !== 200) {
      throw new Error(`User info request returned status ${userInfoResponse.status} instead of 200`);
    }

    return userInfoResponse.data.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.detail || error.message;
      throw new Error(`Error retrieving Twitter user data: ${errorMessage}`);
    }
    throw error;
  }
};

// ============================================
// Twitter Provider Class (Gitcoin Passport pattern)
// ============================================

/**
 * Twitter Provider - implements verify() method
 * Following Gitcoin Passport Provider pattern
 */
export class TwitterProvider {
  type = 'Twitter';
  _options = {};

  constructor(options = {}) {
    this._options = { ...this._options, ...options };
  }

  /**
   * Verify Twitter account - main method following Gitcoin pattern
   * @param {Object} payload - Contains proofs.code from OAuth callback
   * @returns {Promise<{valid: boolean, record?: object, errors?: string[]}>}
   */
  async verify(payload) {
    const errors = [];

    try {
      // Extract code from proofs
      const code = payload.proofs?.code;
      if (!code) {
        errors.push('Authorization code missing');
        return { valid: false, errors };
      }

      // Extract codeVerifier from state (stored in session)
      const state = payload.proofs?.state || '';
      const codeVerifier = state.split(':')[1]; // Format: "sessionId:codeVerifier"

      if (!codeVerifier) {
        errors.push('Code verifier missing - session may have expired');
        return { valid: false, errors };
      }

      // Step 1: Exchange code for access token
      const accessToken = await requestAccessToken(code, codeVerifier);

      // Step 2: Get user info
      const userInfo = await getTwitterUserData(accessToken);

      if (!userInfo?.id) {
        errors.push('We were not able to verify a Twitter account with your provided credentials.');
        return { valid: false, errors };
      }

      // Step 3: Validate account (following Gitcoin Passport validation pattern)
      const validationResult = this.validateUser(userInfo);
      if (!validationResult.valid) {
        return { valid: false, errors: validationResult.errors };
      }

      // Step 4: Calculate score
      const scoreResult = calculateTwitterScore(userInfo);

      // Step 5: Generate commitment hash (for Aleo blockchain)
      const commitment = this.generateCommitment(userInfo.id);

      // Step 6: Return verified result
      return {
        valid: true,
        record: {
          id: userInfo.id,
          username: userInfo.username,
        },
        errors: [],
        // Additional data for our system
        userId: userInfo.id,
        username: userInfo.username,
        score: scoreResult.score,
        criteria: scoreResult.criteria,
        commitment: commitment,
        maxScore: scoreResult.maxScore,
        accessToken: accessToken // For potential future API calls
      };
    } catch (error) {
      const errorMessage = error.message || 'Unknown error occurred';
      errors.push(`Twitter verification error: ${errorMessage}`);
      return { valid: false, errors };
    }
  }

  /**
   * Validate Twitter user meets requirements
   * Following Gitcoin Passport validation pattern
   */
  validateUser(userData) {
    const errors = [];

    // Validate user ID exists
    if (!userData.id) {
      errors.push('Twitter account ID is missing');
    }

    // Validate username exists
    if (!userData.username) {
      errors.push('Twitter username is missing');
    }

    // Optional: Add more validation rules
    // Example: Account age, follower count, etc.
    if (userData.created_at) {
      const accountAge = this.calculateAccountAge(userData.created_at);
      if (accountAge < 30) {
        errors.push(`Twitter account must be at least 30 days old (current: ${accountAge} days)`);
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined
    };
  }

  /**
   * Calculate account age in days
   */
  calculateAccountAge(createdAt) {
    const createdDate = new Date(createdAt);
    const now = new Date();
    const diffTime = now.getTime() - createdDate.getTime();
    return Math.floor(diffTime / (24 * 60 * 60 * 1000)); // Convert to days
  }

  /**
   * Generate commitment hash for Aleo blockchain
   * Format: SHA-256(platform_id:user_id:secret_salt)
   */
  generateCommitment(userId) {
    const platformId = 2; // Twitter = 2 (per spec)
    const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
    const input = `${platformId}:${userId}:${secretSalt}`;
    
    const hash = crypto
      .createHash('sha256')
      .update(input)
      .digest('hex');
    
    // Convert to Aleo field format (simplified - in production use proper field modulus)
    return `${hash}field`;
  }
}

// ============================================
// Legacy Export Functions (for backward compatibility)
// ============================================

/**
 * Generate OAuth authorization URL (legacy function)
 */
export const twitterAuth = async (passportId, sessionId) => {
  const result = await initClientAndGetAuthUrl(sessionId);
  return result.authUrl;
};

/**
 * Handle OAuth callback (legacy function)
 */
export const twitterCallback = async (query, session) => {
  const { code, state } = query;
  
  if (!code) {
    throw new Error('Authorization code missing');
  }

  const [sessionId, codeVerifier] = state.split(':');
  
  // Use Provider class for verification
  const provider = new TwitterProvider();
  const payload = {
    proofs: {
      code: code,
      state: state
    }
  };

  const result = await provider.verify(payload);

  if (!result.valid) {
    throw new Error(result.errors?.join(', ') || 'Verification failed');
  }

  // Return in expected format
  return {
    verified: result.valid,
    provider: 'twitter',
    userId: result.userId,
    username: result.username,
    score: result.score,
    criteria: result.criteria,
    commitment: result.commitment,
    metadataHash: result.commitment, // Alias for backward compatibility
    maxScore: result.maxScore
  };
};

/**
 * Get verification status (legacy function)
 */
export const twitterStatus = async (session) => {
  return session.result || null;
};
