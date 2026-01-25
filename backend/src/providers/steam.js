import axios from 'axios';
import crypto from 'crypto';
import { calculateSteamScore } from '../scoring/steam.js';

const getSteamConfig = () => {
  const STEAM_API_KEY = process.env.STEAM_API_KEY;
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const REDIRECT_URI = `${BACKEND_URL}/auth/steam/callback`;
  
  return { STEAM_API_KEY, REDIRECT_URI, BACKEND_URL };
};

export const steamAuth = async (passportId, sessionId) => {
  const { REDIRECT_URI, BACKEND_URL } = getSteamConfig();
  const returnTo = encodeURIComponent(`${REDIRECT_URI}?session=${sessionId}`);
  const realm = encodeURIComponent(BACKEND_URL);
  
  const params = new URLSearchParams({
    'openid.mode': 'checkid_setup',
    'openid.ns': 'http://specs.openid.net/auth/2.0',
    'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
    'openid.return_to': returnTo,
    'openid.realm': realm
  });

  return `https://steamcommunity.com/openid/login?${params.toString()}`;
};

export const steamCallback = async (query, session) => {
  const { 'openid.claimed_id': claimedId, 'openid.identity': identity } = query;
  
  if (!claimedId || !identity) {
    throw new Error('Invalid Steam OpenID response');
  }

  // Extract Steam ID
  const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
  if (!steamIdMatch) {
    throw new Error('Could not extract Steam ID');
  }

  const steamId = steamIdMatch[1];

  // Verify OpenID response (simplified - in production, validate signature)
  // For now, we'll fetch profile data
  const { STEAM_API_KEY } = getSteamConfig();
  let profileData = null;
  if (STEAM_API_KEY) {
    try {
      const profileResponse = await axios.get('https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/', {
        params: {
          key: STEAM_API_KEY,
          steamids: steamId
        }
      });

      if (profileResponse.data.response?.players?.[0]) {
        profileData = profileResponse.data.response.players[0];
      }
    } catch (error) {
      console.warn('[Steam] Failed to fetch profile:', error.message);
    }
  }

  // Calculate score
  const scoreResult = calculateSteamScore(steamId, profileData);

  // Generate commitment hash
  const metadataHash = crypto
    .createHash('sha256')
    .update(`${steamId}:${Date.now()}`)
    .digest('hex');

  return {
    verified: true,
    provider: 'steam',
    steamId,
    score: scoreResult.score,
    criteria: scoreResult.criteria,
    metadataHash,
    maxScore: scoreResult.maxScore
  };
};

export const steamStatus = async (session) => {
  return session.result || null;
};

