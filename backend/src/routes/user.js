// User score and verification summary endpoints

import express from 'express';
import { getUserScore, getUserVerifications, deleteVerification } from '../database/index.js';

const router = express.Router();

/**
 * GET /user/:id/score
 * Get total score for a user across all providers
 */
router.get('/:id/score', async (req, res) => {
  try {
    const { id } = req.params;
    
    const totalScore = await getUserScore(id);
    const verifications = await getUserVerifications(id);
    
    // Calculate breakdown by provider
    const breakdown = {};
    let verifiedCount = 0;
    
    verifications.forEach(v => {
      if (v.status === 'verified' && (!v.expiresAt || new Date(v.expiresAt) > new Date())) {
        breakdown[v.provider] = {
          score: v.score,
          maxScore: v.maxScore,
          verifiedAt: v.verifiedAt
        };
        verifiedCount++;
      }
    });
    
    res.json({
      userId: id,
      totalScore,
      verifiedCount,
      totalProviders: Object.keys(breakdown).length,
      breakdown,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('[User] Get score error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /user/:id/verifications
 * Get all verifications for a user
 */
router.get('/:id/verifications', async (req, res) => {
  try {
    const { id } = req.params;
    
    const verifications = await getUserVerifications(id);
    
    res.json({
      userId: id,
      verifications: verifications.map(v => ({
        provider: v.provider,
        score: v.score,
        maxScore: v.maxScore,
        status: v.status,
        criteria: v.criteria || [], // Include criteria in API response
        verifiedAt: v.verifiedAt,
        expiresAt: v.expiresAt
      })),
      count: verifications.length
    });
  } catch (error) {
    console.error('[User] Get verifications error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

// PRIVACY: Profile endpoints removed - profile data should only exist in user's wallet as private records
// Profile data storage violates anonymity principles

/**
 * DELETE /user/:id/verifications/:provider
 * Delete a specific verification for a user
 */
router.delete('/:id/verifications/:provider', async (req, res) => {
  try {
    const { id, provider } = req.params;
    
    console.log(`[User] 🗑️ Delete verification requested:`, { userId: id?.substring(0, 20) + '...', provider });
    
    const deleted = await deleteVerification(id, provider);
    
    if (!deleted) {
      return res.status(404).json({
        error: 'Verification not found'
      });
    }
    
    res.json({
      userId: id,
      provider,
      deleted: true,
      message: 'Verification deleted successfully'
    });
  } catch (error) {
    console.error('[User] Delete verification error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;

