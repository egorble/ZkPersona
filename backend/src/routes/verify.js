// Unified verification endpoint
// Handles verification initiation and status checking for all providers

import express from 'express';
import { getVerification, getUserVerifications, getUserScore } from '../database/index.js';
import { getProviderConfig, validateRedirectUri } from '../config/index.js';
import { googleAuth } from '../providers/google.js';
import { twitterAuth } from '../providers/twitter.js';
import { discordAuth } from '../providers/discord.js';
import { githubAuth } from '../providers/github.js';
import { steamAuth } from '../providers/steam.js';
import { evmCallback } from '../providers/evm.js';
import { solanaCallback } from '../providers/solana.js';
import { ethers } from 'ethers';

const router = express.Router();

/**
 * POST /verify
 * Unified endpoint to initiate verification for any provider
 * Body: { provider: 'google'|'twitter'|'discord'|'github'|'steam'|'evm', userId: string, ...providerSpecific }
 */
router.post('/', async (req, res) => {
  try {
    const { provider, userId } = req.body;
    
    if (!provider || !userId) {
      return res.status(400).json({
        error: 'provider and userId are required'
      });
    }
    
    // Check if already verified
    const existing = await getVerification(userId, provider);
    if (existing && existing.status === 'verified') {
      return res.json({
        status: 'already_verified',
        provider,
        score: existing.score,
        maxScore: existing.maxScore,
        verifiedAt: existing.verifiedAt
      });
    }
    
    // Route to appropriate provider handler
    switch (provider.toLowerCase()) {
      case 'google':
      case 'twitter':
      case 'discord':
      case 'github':
      case 'steam':
        // OAuth providers - return redirect URL
        try {
          const config = getProviderConfig(provider);
          const authHandlers = {
            google: googleAuth,
            twitter: twitterAuth,
            discord: discordAuth,
            github: githubAuth,
            steam: steamAuth
          };
          
          const redirectUrl = await authHandlers[provider](userId);
          
          return res.json({
            status: 'redirect_required',
            provider,
            redirectUrl
          });
        } catch (error) {
          return res.status(400).json({
            error: error.message,
            hint: `Please configure ${provider.toUpperCase()}_CLIENT_ID and ${provider.toUpperCase()}_CLIENT_SECRET`
          });
        }
        
      case 'evm':
      case 'wallet':
        // EVM wallet - return message to sign
        return res.status(400).json({
          error: 'Use POST /verify/wallet for EVM/Solana wallet verification'
        });
        
      default:
        return res.status(400).json({
          error: `Unsupported provider: ${provider}`
        });
    }
  } catch (error) {
    console.error('[Verify] Initiate error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /verify/:userId/:provider
 * Get verification status for specific user and provider
 */
router.get('/:userId/:provider', async (req, res) => {
  try {
    const { userId, provider } = req.params;
    
    const verification = await getVerification(userId, provider);
    
    if (!verification) {
      return res.status(404).json({
        error: 'Verification not found'
      });
    }
    
    res.json({
      userId: verification.userId,
      provider: verification.provider,
      score: verification.score,
      maxScore: verification.maxScore,
      status: verification.status,
      verifiedAt: verification.verifiedAt,
      expiresAt: verification.expiresAt,
      // PRIVACY: Don't expose personal data
      metadata: verification.metadata ? {
        // Only include commitment, no personal identifiers
        commitment: verification.commitment || verification.metadata.commitment
      } : null
    });
  } catch (error) {
    console.error('[Verify] Get status error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /verify/:userId
 * Get all verifications for a user
 */
router.get('/:userId', async (req, res) => {
  try {
    const { userId } = req.params;
    
    const verifications = await getUserVerifications(userId);
    const totalScore = await getUserScore(userId);
    
    res.json({
      userId,
      totalScore,
      verifications: verifications.map(v => ({
        provider: v.provider,
        score: v.score,
        maxScore: v.maxScore,
        status: v.status,
        verifiedAt: v.verifiedAt,
        expiresAt: v.expiresAt
      })),
      count: verifications.length
    });
  } catch (error) {
    console.error('[Verify] Get user verifications error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /verify/wallet
 * GITCOIN PASSPORT MODEL: Sync wallet verification (no sessions, no database storage)
 * Body: { type: 'evm'|'solana', address: string, signature: string, message: string, walletId: string }
 */
router.post('/wallet', async (req, res) => {
  try {
    // DEBUG: Log incoming request
    console.log('[Verify/Wallet] Incoming request:', {
      method: req.method,
      hasBody: !!req.body,
      hasQuery: !!req.query,
      bodyType: typeof req.body,
      bodyKeys: req.body ? Object.keys(req.body) : [],
      queryKeys: req.query ? Object.keys(req.query) : [],
      headers: {
        'content-type': req.headers['content-type'],
        'content-length': req.headers['content-length']
      }
    });
    
    // Get data from body or query (fallback)
    // Ensure we have a valid object
    const body = (req.body && typeof req.body === 'object') ? req.body : 
                 (req.query && typeof req.query === 'object') ? req.query : {};
    
    console.log('[Verify/Wallet] Parsed body:', body);
    
    const { type, address, signature, message, walletId } = body;
    
    if (!type || !address || !signature || !message) {
      return res.status(400).json({
        error: 'type, address, signature, and message are required',
        received: {
          hasBody: !!req.body,
          hasQuery: !!req.query,
          bodyKeys: req.body ? Object.keys(req.body) : [],
          queryKeys: req.query ? Object.keys(req.query) : []
        }
      });
    }
    
    // Validate wallet address format
    if (type === 'evm' && !ethers.isAddress(address)) {
      return res.status(400).json({
        error: 'Invalid EVM wallet address format'
      });
    }
    
    // Verify signature and get result
    let result;
    try {
      if (type === 'evm') {
        // Use evmCallback logic (but without session)
        // evmCallback expects req object with body/query, and session
        const mockSession = {
          id: 'sync_verification',
          provider: 'evm',
          passportId: walletId || address,
          stateData: {}
        };
        
      // Create mock req object with body containing the data
      const mockReq = { 
        body: { address, signature, message }, 
        query: {} 
      };
      console.log('[Verify/Wallet] Calling evmCallback with:', { 
        address, 
        hasSignature: !!signature, 
        hasMessage: !!message,
        mockReqBody: mockReq.body
      });
      result = await evmCallback(mockReq, mockSession);
      console.log('[Verify/Wallet] evmCallback result:', { verified: result?.verified, hasScore: !!result?.score });
      } else if (type === 'solana') {
        // Use solanaCallback logic (but without session)
        // solanaCallback expects query object (can be req.body or req.query) and session
        const mockSession = {
          id: 'sync_verification',
          provider: 'solana',
          passportId: walletId || address,
          stateData: {}
        };
        
        // solanaCallback accepts query object directly
        console.log('[Verify/Wallet] Calling solanaCallback with:', { address, hasSignature: !!signature, hasMessage: !!message });
        result = await solanaCallback({ address, signature, message }, mockSession);
        console.log('[Verify/Wallet] solanaCallback result:', { verified: result?.verified, hasScore: !!result?.score });
      } else {
        return res.status(400).json({
          error: `Unsupported wallet type: ${type}. Supported: evm, solana`
        });
      }
    } catch (callbackError) {
      console.error('[Verify/Wallet] Callback error:', callbackError);
      console.error('[Verify/Wallet] Error message:', callbackError.message);
      console.error('[Verify/Wallet] Error stack:', callbackError.stack);
      console.error('[Verify/Wallet] Error name:', callbackError.name);
      console.error('[Verify/Wallet] Full error object:', JSON.stringify(callbackError, Object.getOwnPropertyNames(callbackError)));
      
      return res.status(400).json({
        error: callbackError.message || 'Verification callback failed',
        errorType: callbackError.name || 'Error',
        details: process.env.NODE_ENV === 'development' ? callbackError.stack : undefined
      });
    }
    
    if (!result || !result.verified) {
      console.error('[Verify/Wallet] Verification failed - no result or not verified:', { 
        hasResult: !!result, 
        verified: result?.verified,
        resultKeys: result ? Object.keys(result) : []
      });
      return res.status(400).json({
        error: 'Verification failed',
        result: result
      });
    }
    
    // GITCOIN PASSPORT MODEL: do not persist in DB
    // Just return result for frontend
    console.log('[Verify/Wallet] Verification successful:', {
      hasScore: !!result.score,
      hasCommitment: !!result.commitment,
      score: result.score
    });
    
    res.json({
      score: result.score,
      commitment: result.commitment,
      criteria: result.criteria || [],
      maxScore: result.maxScore || result.score
    });
  } catch (error) {
    console.error('[Verify/Wallet] Route error:', error);
    console.error('[Verify/Wallet] Route error message:', error.message);
    console.error('[Verify/Wallet] Route error stack:', error.stack);
    console.error('[Verify/Wallet] Route error name:', error.name);
    console.error('[Verify/Wallet] Full route error object:', JSON.stringify(error, Object.getOwnPropertyNames(error)));
    
    res.status(500).json({
      error: error.message || 'Internal server error',
      errorType: error.name || 'Error',
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
});

export default router;
