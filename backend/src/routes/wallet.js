// EVM Wallet verification routes
// Handles MetaMask, WalletConnect, Phantom, and other EVM-compatible wallets

import express from 'express';
import { ethers } from 'ethers';
import { verifyMessage } from 'ethers';
import axios from 'axios';
import crypto from 'crypto';
import { saveSession, getSession, updateSession, hashToken } from '../database/index.js';
import { calculateEVMScore } from '../scoring/evm.js';
import { v4 as uuidv4 } from 'uuid';
import { generateAleoCommitment } from '../utils/aleoField.js';

/**
 * Fetch wallet data from Etherscan API
 */
const fetchWalletData = async (walletAddress) => {
  const apiKey = process.env.ETHERSCAN_API_KEY || '';
  const walletData = {
    address: walletAddress,
    balanceEth: 0,
    txCount: 0,
    walletAgeYears: 0
  };
  
  try {
    // Get balance
    if (apiKey) {
      const balanceUrl = `https://api.etherscan.io/api?module=account&action=balance&address=${walletAddress}&tag=latest&apikey=${apiKey}`;
      const balanceResponse = await axios.get(balanceUrl);
      if (balanceResponse.data.status === '1' && balanceResponse.data.result) {
        walletData.balanceEth = Number(balanceResponse.data.result) / 1e18;
      }
      
      // Get transaction history to calculate age and count
      const txUrl = `https://api.etherscan.io/api?module=account&action=txlist&address=${walletAddress}&startblock=0&endblock=99999999&sort=asc&page=1&offset=1&apikey=${apiKey}`;
      const txResponse = await axios.get(txUrl);
      
      if (txResponse.data.status === '1' && txResponse.data.result && txResponse.data.result.length > 0) {
        walletData.txCount = txResponse.data.result.length;
        const firstTx = txResponse.data.result[0];
        if (firstTx && firstTx.timeStamp) {
          const firstTxDate = new Date(Number(firstTx.timeStamp) * 1000);
          const ageMs = Date.now() - firstTxDate.getTime();
          walletData.walletAgeYears = ageMs / (1000 * 60 * 60 * 24 * 365);
        }
      }
    } else {
      // Fallback: use public RPC endpoint if Etherscan API key not set
      try {
        const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
        const balance = await provider.getBalance(walletAddress);
        walletData.balanceEth = Number(balance) / 1e18;
        walletData.txCount = await provider.getTransactionCount(walletAddress);
      } catch (rpcError) {
        console.warn('[Wallet] RPC fallback failed:', rpcError.message);
        // Continue with default values (0 balance, 0 transactions)
      }
    }
  } catch (error) {
    console.warn('[Wallet] Error fetching wallet data:', error.message);
    // Continue with default values
  }
  
  return walletData;
};

const router = express.Router();

/**
 * POST /wallet/connect
 * Initiates wallet verification flow
 * Returns message to sign and session ID
 */
router.post('/connect', async (req, res) => {
  try {
    const { userId, walletAddress } = req.body;
    
    if (!userId || !walletAddress) {
      return res.status(400).json({
        error: 'userId and walletAddress are required'
      });
    }
    
    // Validate wallet address format
    if (!ethers.isAddress(walletAddress)) {
      return res.status(400).json({
        error: 'Invalid wallet address format'
      });
    }
    
    // Generate session ID
    const sessionId = `wallet_${uuidv4()}`;
    
    // Create SIWE-compatible message
    const domain = new URL(process.env.FRONTEND_URL || 'http://localhost:5173').host;
    const nonce = crypto.randomBytes(16).toString('hex');
    const message = `${domain} wants you to sign in with your Ethereum account:\n${walletAddress}\n\nPlease sign this message to verify your wallet ownership.\n\nNonce: ${nonce}`;
    
    // Save session
    await saveSession(sessionId, 'evm', userId, {
      walletAddress,
      nonce,
      message
    });
    
    res.json({
      sessionId,
      message,
      domain,
      nonce,
      walletAddress
    });
  } catch (error) {
    console.error('[Wallet] Connect error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * POST /wallet/verify
 * Verifies wallet signature and calculates score
 */
router.post('/verify', async (req, res) => {
  try {
    const { sessionId, signature } = req.body;
    
    if (!sessionId || !signature) {
      return res.status(400).json({
        error: 'sessionId and signature are required'
      });
    }
    
    // Get session
    const session = await getSession(sessionId);
    if (!session) {
      return res.status(404).json({
        error: 'Session not found or expired'
      });
    }
    
    if (session.provider !== 'evm') {
      return res.status(400).json({
        error: 'Invalid session type'
      });
    }
    
    const { walletAddress, message } = session.stateData;
    
    // Verify signature
    let recoveredAddress;
    try {
      recoveredAddress = verifyMessage(message, signature);
    } catch (error) {
      return res.status(400).json({
        error: 'Invalid signature format'
      });
    }
    
    // Check if signature matches wallet address
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(400).json({
        error: 'Signature does not match wallet address'
      });
    }
    
    // Fetch wallet data from Etherscan and calculate score
    const walletData = await fetchWalletData(walletAddress);
    const scoreData = calculateEVMScore(walletData);
    
    // Generate Aleo-compatible commitment for privacy
    const platformId = 6; // EVM = 6 (per platformMapping.ts)
    const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
    const commitment = generateAleoCommitment(platformId, walletAddress.toLowerCase(), secretSalt);
    
    // GITCOIN PASSPORT MODEL: НЕ зберігаємо верифікацію в БД!
    // Просто повертаємо результат
    
    res.json({
      success: true,
      provider: 'evm',
      score: scoreData.score,
      commitment: commitment,
      maxScore: scoreData.maxScore,
      criteria: scoreData.criteria
      // НЕ повертаємо: walletAddress (personal data)
    });
  } catch (error) {
    console.error('[Wallet] Verify error:', error);
    res.status(500).json({
      error: error.message
    });
  }
});

/**
 * GET /wallet/status/:sessionId
 * Get wallet verification status
 */
router.get('/status/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await getSession(sessionId);
    
    if (!session) {
      return res.status(404).json({
        error: 'Session not found'
      });
    }
    
    res.json({
      sessionId,
      status: session.status,
      provider: session.provider,
      data: session.stateData
    });
  } catch (error) {
    res.status(500).json({
      error: error.message
    });
  }
});

export default router;

