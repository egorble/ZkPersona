import axios from 'axios';
import crypto from 'crypto';
import { calculateGoogleScore } from '../scoring/google.js';

// Read env vars inside functions to ensure dotenv has loaded them
const getGoogleConfig = () => {
  const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
  const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const REDIRECT_URI = `${BACKEND_URL}/auth/google/callback`;
  
  return { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI };
};

export const googleAuth = async (passportId, sessionId) => {
  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI } = getGoogleConfig();
  
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    throw new Error('GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET not configured. Please add these to backend/.env file.');
  }

  // Generate PKCE
  const codeVerifier = crypto.randomBytes(32).toString('base64url');
  const codeChallenge = crypto
    .createHash('sha256')
    .update(codeVerifier)
    .digest('base64url');

  // Store code verifier in session (in production, use Redis)
  // For now, we'll include it in state
  const state = `${sessionId}:${codeVerifier}`;

  const params = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: REDIRECT_URI,
    response_type: 'code',
    scope: 'openid profile email',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256'
  });

  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
};

export const googleCallback = async (query, session) => {
  const { code, state } = query;
  
  if (!code) {
    throw new Error('Authorization code missing');
  }

  const { GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, REDIRECT_URI } = getGoogleConfig();
  const [sessionId, codeVerifier] = state.split(':');

  // Exchange code for access token
  const tokenResponse = await axios.post('https://oauth2.googleapis.com/token', {
    client_id: GOOGLE_CLIENT_ID,
    client_secret: GOOGLE_CLIENT_SECRET,
    code,
    redirect_uri: REDIRECT_URI,
    grant_type: 'authorization_code',
    code_verifier: codeVerifier
  });

  const { access_token } = tokenResponse.data;

  // Fetch user info
  const userInfoResponse = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${access_token}` }
  });

  const userInfo = userInfoResponse.data;

  // Calculate score
  const scoreResult = calculateGoogleScore(userInfo);

  // Generate commitment hash
  const metadataHash = crypto
    .createHash('sha256')
    .update(`${userInfo.sub}:${userInfo.email}:${Date.now()}`)
    .digest('hex');

  return {
    verified: true,
    provider: 'google',
    userId: userInfo.sub,
    email: userInfo.email,
    score: scoreResult.score,
    criteria: scoreResult.criteria,
    metadataHash,
    maxScore: scoreResult.maxScore,
    accessToken: access_token // Will be hashed before storage
  };
};

export const googleStatus = async (session) => {
  return session.result || null;
};

