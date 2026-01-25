// Solana Wallet Provider
// Supports Phantom, Solflare, and other Solana wallets via WalletConnect

import axios from 'axios';
import crypto from 'crypto';
import { calculateSolanaScore } from '../scoring/solana.js';

const getSolanaConfig = () => {
  const SOLSCAN_API_KEY = process.env.SOLSCAN_API_KEY || '';
  const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:3001';
  const cleanBackendUrl = BACKEND_URL.replace(/\/$/, '');
  const REDIRECT_URI = `${cleanBackendUrl}/auth/solana/callback`;
  
  return { SOLSCAN_API_KEY, REDIRECT_URI };
};

/**
 * Initialize Solana wallet verification
 * For Solana, we use SIWE-like message signing
 */
export const solanaAuth = async (passportId, sessionId) => {
  // For Solana, we need frontend to connect wallet first
  // Return a URL that frontend will handle
  const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/solana?session=${sessionId}&passportId=${passportId}`;
  return frontendUrl;
};

/**
 * Handle Solana wallet callback
 */
export const solanaCallback = async (query, session) => {
  // query can be req.query (GET) or req.body (POST)
  const address = query.address;
  const signature = query.signature;
  const message = query.message;
  
  if (!address || !signature || !message) {
    throw new Error('Missing required fields: address, signature, message');
  }

  // Verify Solana signature (basic validation - in production use @solana/web3.js)
  // For now, we'll trust the frontend signature and verify wallet data
  
  // Fetch wallet data from Solscan API
  const walletData = await fetchSolanaWalletData(address);
  
  // Minimum balance requirement: 0.1 SOL
  if (walletData.balanceSol < 0.1) {
    throw new Error('Insufficient balance. Minimum 0.1 SOL required for verification.');
  }
  
  // Calculate score (only if balance requirement met)
  const scoreResult = calculateSolanaScore(walletData);
  
  // Generate commitment hash (PRIVACY: use standard format)
  const platformId = 6; // Solana = 6 (per spec)
  const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
  const commitmentInput = `${platformId}:${address}:${secretSalt}`;
  const commitment = crypto.createHash('sha256').update(commitmentInput).digest('hex') + 'field';

  return {
    verified: true,
    provider: 'solana',
    commitment: commitment, // PRIVACY: Return commitment, not address
    score: scoreResult.score,
    criteria: scoreResult.criteria,
    maxScore: scoreResult.maxScore,
    // DO NOT return: address, walletData (personal data)
  };
};

/**
 * Get Solana verification status
 */
export const solanaStatus = async (session) => {
  return session.result || null;
};

/**
 * Fetch Solana wallet data from Solscan API
 */
const fetchSolanaWalletData = async (address) => {
  try {
    const { SOLSCAN_API_KEY } = getSolanaConfig();
    
    // Get account info (balance, transaction count, etc.)
    const accountUrl = SOLSCAN_API_KEY
      ? `https://api.solscan.io/account?address=${address}&apiKey=${SOLSCAN_API_KEY}`
      : `https://api.solscan.io/account?address=${address}`;
    
    const accountResponse = await axios.get(accountUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });

    const accountData = accountResponse.data?.data || accountResponse.data || {};
    
    // Get balance in SOL
    const balanceLamports = accountData.lamports || accountData.solana || 0;
    const balanceSol = Number(balanceLamports) / 1e9;

    // Get transaction count
    const txCount = accountData.txCount || accountData.transactionCount || 0;

    // Get transaction history for age calculation
    const txUrl = SOLSCAN_API_KEY
      ? `https://api.solscan.io/transaction/list?address=${address}&limit=100&apiKey=${SOLSCAN_API_KEY}`
      : `https://api.solscan.io/transaction/list?address=${address}&limit=100`;
    
    let walletAge = 0;
    let walletAgeDays = 0;
    let hasRecentActivity = false;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    try {
      const txResponse = await axios.get(txUrl, {
        headers: {
          'Accept': 'application/json'
        }
      });

      const transactions = txResponse.data?.data || txResponse.data || [];
      
      if (transactions.length > 0) {
        // Get first transaction for age calculation (oldest)
        const firstTx = transactions[transactions.length - 1];
        if (firstTx.blockTime) {
          const firstTxDate = new Date(firstTx.blockTime * 1000);
          walletAge = Date.now() - firstTxDate.getTime();
          walletAgeDays = walletAge / (1000 * 60 * 60 * 24);
        }

        // Check for recent activity (last 30 days)
        const recentTxs = transactions.filter(tx => {
          if (!tx.blockTime) return false;
          const txDate = new Date(tx.blockTime * 1000);
          return txDate.getTime() >= thirtyDaysAgo;
        });
        hasRecentActivity = recentTxs.length > 0;
      }
    } catch (txError) {
      console.warn('[Solana] Could not fetch transaction history:', txError.message);
      // Continue without transaction history
    }

    return {
      address: address,
      balance: balanceLamports,
      balanceSol,
      txCount,
      walletAge,
      walletAgeDays: Math.floor(walletAgeDays),
      walletAgeYears: walletAge > 0 ? walletAge / (1000 * 60 * 60 * 24 * 365) : 0,
      hasRecentActivity
    };
  } catch (error) {
    console.error('[Solana] Error fetching wallet data:', error);
    throw new Error('Failed to fetch wallet data from Solscan');
  }
};
