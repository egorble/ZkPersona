import axios from 'axios';
import crypto from 'crypto';
import { calculateGitHubScore } from '../scoring/github.js';

// ============================================
// Types documentation (following Gitcoin Passport pattern)
// GitHubTokenResponse: { access_token: string, token_type: string, scope?: string }
// GitHubUserData: { id: number, login: string, name?: string, email?: string, avatar_url?: string, created_at: string, public_repos?: number, followers?: number, following?: number }
// ============================================
// OAuth Procedures (following Gitcoin pattern)
// ============================================

const getGitHubConfig = () => {
  const GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
  const GITHUB_CLIENT_SECRET = process.env.GITHUB_CLIENT_SECRET;
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const REDIRECT_URI = `${BACKEND_URL}/auth/github/callback`;
  
  return { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, REDIRECT_URI };
};

/**
 * Initialize GitHub OAuth and get authorization URL
 * Follows Gitcoin Passport pattern
 */
export const initClientAndGetAuthUrl = async (sessionId, callbackOverride) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, REDIRECT_URI } = getGitHubConfig();
  
  if (!GITHUB_CLIENT_ID || !GITHUB_CLIENT_SECRET) {
    throw new Error('GITHUB_CLIENT_ID or GITHUB_CLIENT_SECRET not configured. Please add these to backend/.env file.');
  }

  const redirectUri = callbackOverride || REDIRECT_URI;
  const state = sessionId;

  const params = new URLSearchParams({
    client_id: GITHUB_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'read:user user:email',
    state
  });

  return {
    authUrl: `https://github.com/login/oauth/authorize?${params.toString()}`,
    state
  };
};

/**
 * Exchange authorization code for access token
 * Follows Gitcoin Passport pattern: requestAccessToken
 */
export const requestAccessToken = async (code) => {
  const { GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, REDIRECT_URI } = getGitHubConfig();
  
  if (!code) {
    throw new Error('Authorization code is required');
  }

  try {
    const tokenResponse = await axios.post(
      'https://github.com/login/oauth/access_token',
      {
        client_id: GITHUB_CLIENT_ID,
        client_secret: GITHUB_CLIENT_SECRET,
        code,
        redirect_uri: REDIRECT_URI
      },
      {
        headers: { Accept: 'application/json' }
      }
    );

    if (tokenResponse.status !== 200) {
      throw new Error(`Token exchange returned status ${tokenResponse.status} instead of 200`);
    }

    const tokenData = tokenResponse.data;
    
    if (!tokenData.access_token) {
      throw new Error('Access token not received from GitHub');
    }

    return tokenData.access_token;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorData = error.response?.data;
      const errorMessage = errorData?.error_description || errorData?.error || error.message;
      throw new Error(`Error requesting GitHub access token: ${errorMessage}`);
    }
    throw error;
  }
};

/**
 * Get GitHub user data using access token
 * Follows Gitcoin Passport pattern: getGithubUserData
 */
export const getGithubUserData = async (accessToken) => {
  try {
    const userInfoResponse = await axios.get('https://api.github.com/user', {
      headers: { 
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github.v3+json'
      }
    });

    if (userInfoResponse.status !== 200) {
      throw new Error(`User info request returned status ${userInfoResponse.status} instead of 200`);
    }

    return userInfoResponse.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.message || error.message;
      throw new Error(`Error retrieving GitHub user data: ${errorMessage}`);
    }
    throw error;
  }
};

// ============================================
// GitHub Provider Class (Gitcoin Passport pattern)
// ============================================

/**
 * GitHub Provider - implements verify() method
 * Following Gitcoin Passport Provider pattern
 */
export class GitHubProvider {
  type = 'GitHub';
  _options = {};

  constructor(options = {}) {
    this._options = { ...this._options, ...options };
  }

  /**
   * Verify GitHub account - main method following Gitcoin pattern
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
      const userInfo = await getGithubUserData(accessToken);

      if (!userInfo?.id) {
        errors.push('We were not able to verify a GitHub account with your provided credentials.');
        return { valid: false, errors };
      }

      // Step 3: Get additional data (public repos count)
      let publicRepos = userInfo.public_repos || 0;
      
      // If not included in user info, fetch separately
      if (publicRepos === 0) {
        try {
          const reposResponse = await axios.get(
            `https://api.github.com/users/${userInfo.login}/repos`,
            {
              params: { per_page: 100, type: 'public' },
              headers: { 
                Authorization: `Bearer ${accessToken}`,
                Accept: 'application/vnd.github.v3+json'
              }
            }
          );
          publicRepos = reposResponse.data.length;
        } catch (repoError) {
          // Log but don't fail verification if repos can't be fetched
          console.warn('Could not fetch repository count:', repoError.message);
        }
      }

      // Step 4: Validate user (following Gitcoin Passport validation pattern)
      const validationResult = this.validateUser({
        userId: userInfo.id,
        accountAge: this.calculateAccountAge(userInfo.created_at),
        publicRepos
      });

      if (!validationResult.valid) {
        return { valid: false, errors: validationResult.errors };
      }

      // Step 5: Calculate score
      const scoreResult = calculateGitHubScore(userInfo, publicRepos);

      // Step 6: Generate commitment hash
      const commitment = this.generateCommitment(userInfo.id.toString());

      // Step 7: Return verified result
      return {
        valid: true,
        record: {
          id: userInfo.id.toString(),
          login: userInfo.login
        },
        errors: [],
        // Additional data for our system
        userId: userInfo.id.toString(),
        username: userInfo.login,
        score: scoreResult.score,
        criteria: scoreResult.criteria,
        commitment: commitment,
        maxScore: scoreResult.maxScore,
        accessToken: accessToken
      };
    } catch (error) {
      const errorMessage = error.message || 'Unknown error occurred';
      errors.push(`GitHub verification error: ${errorMessage}`);
      return { valid: false, errors };
    }
  }

  /**
   * Validate GitHub user meets requirements
   * Following Gitcoin Passport validation pattern
   */
  validateUser(userData) {
    const errors = [];

    // Account age requirement (optional - can be customized)
    // GitHub accounts should typically be at least 30 days old
    if (userData.accountAge < 30) {
      errors.push(`GitHub account must be at least 30 days old (current: ${userData.accountAge} days)`);
    }

    // Minimum repository requirement (optional - can be customized)
    if (userData.publicRepos < 1) {
      errors.push('GitHub account must have at least 1 public repository');
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
    const platformId = 3; // GitHub = 3 (per spec)
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
export const githubAuth = async (passportId, sessionId) => {
  const result = await initClientAndGetAuthUrl(sessionId);
  return result.authUrl;
};

/**
 * Handle OAuth callback (legacy function)
 */
export const githubCallback = async (query, session) => {
  const { code, state } = query;
  
  if (!code) {
    throw new Error('Authorization code missing');
  }

  // Use Provider class for verification
  const provider = new GitHubProvider();
  const payload = {
    proofs: {
      code: code
    }
  };

  const result = await provider.verify(payload);

  if (!result.valid) {
    throw new Error(result.errors?.join(', ') || 'Verification failed');
  }

  // Return in expected format
  return {
    verified: result.valid,
    provider: 'github',
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
export const githubStatus = async (session) => {
  return session.result || null;
};
