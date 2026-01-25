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
          error: 'Use POST /wallet/connect for EVM wallet verification'
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
      // Don't expose sensitive metadata
      metadata: verification.metadata ? {
        // Only include safe fields
        accountId: verification.providerAccountId
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

export default router;
