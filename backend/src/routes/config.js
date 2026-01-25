// Configuration status endpoint
// Shows which providers are configured and available

import express from 'express';
import { getProviderStatus } from '../config/index.js';

const router = express.Router();

/**
 * GET /config/status
 * Returns configuration status for all providers
 */
router.get('/status', (req, res) => {
  try {
    const status = getProviderStatus();
    const backendUrl = process.env.BACKEND_URL || 'http://localhost:3001';
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    
    // Count configured providers
    const configuredCount = Object.values(status).filter(s => s.configured).length;
    const totalCount = Object.keys(status).length;
    
    res.json({
      status: 'ok',
      providers: status,
      summary: {
        total: totalCount,
        configured: configuredCount,
        missing: totalCount - configuredCount
      },
      urls: {
        backend: backendUrl,
        frontend: frontendUrl
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      error: error.message
    });
  }
});

export default router;

