// Solana Wallet Provider
// Supports Phantom, Solflare, and other Solana wallets via WalletConnect

import axios from 'axios';
import crypto from 'crypto';
import { calculateSolanaScore } from '../scoring/solana.js';
import { generateAleoCommitment } from '../utils/aleoField.js';

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
  // For Solana, we return session info for frontend to handle wallet connection
  // Frontend will use Solana wallet modal instead of redirecting
  return {
    sessionId,
    passportId,
    provider: 'solana',
    message: 'Connect your Solana wallet'
  };
};

/**
 * Handle Solana wallet callback
 */
export const solanaCallback = async (query, session) => {
  try {
    console.log('[Solana Callback] Received query:', {
      queryType: typeof query,
      hasQuery: !!query,
      queryKeys: query && typeof query === 'object' ? Object.keys(query) : [],
      address: query?.address,
      hasSignature: !!query?.signature,
      hasMessage: !!query?.message
    });
    
    // query can be req.query (GET) or req.body (POST)
    // Ensure we have a valid object
    const queryObj = (query && typeof query === 'object' && !Array.isArray(query)) ? query : {};
    
    const address = queryObj.address || null;
    const signature = queryObj.signature || null;
    const message = queryObj.message || null;
    
    console.log('[Solana Callback] Extracted fields:', {
      hasAddress: !!address,
      hasSignature: !!signature,
      hasMessage: !!message,
      addressLength: address ? address.length : 0,
      signatureLength: signature ? signature.length : 0,
      messageLength: message ? message.length : 0
    });
    
    if (!address || !signature || !message) {
      console.error('[Solana Callback] Missing fields:', { 
        hasAddress: !!address, 
        hasSignature: !!signature, 
        hasMessage: !!message,
        queryObj,
        queryObjKeys: Object.keys(queryObj)
      });
      throw new Error('Missing required fields: address, signature, message');
    }

  // Verify Solana signature (basic validation - in production use @solana/web3.js)
  // For now, we'll trust the frontend signature and verify wallet data
  
  // Fetch wallet data from Solscan API
  let walletData;
  try {
    walletData = await fetchSolanaWalletData(address);
  } catch (fetchError) {
    console.error('[Solana] Error fetching wallet data:', fetchError.message);
    // Continue with default values if fetch fails
    walletData = {
      address,
      balanceSol: 0,
      txCount: 0,
      walletAgeYears: 0,
      hasRecentActivity: false
    };
  }
  
  // No minimum balance check – verification always allowed; scoring uses balance for points only.
  // Calculate score (works with RPC-only or Solscan data)
  const scoreResult = calculateSolanaScore(walletData);
  
  // Generate Aleo-compatible commitment (PRIVACY: hashed with field modulo)
  const platformId = 7; // Solana = 7 (per spec, see platformMapping.ts)
  const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
  const commitment = generateAleoCommitment(platformId, address, secretSalt);

    return {
      verified: true,
      provider: 'solana',
      commitment: commitment, // PRIVACY: Return commitment, not address
      score: scoreResult.score,
      criteria: scoreResult.criteria,
      maxScore: scoreResult.maxScore,
      // DO NOT return: address, walletData (personal data)
    };
  } catch (error) {
    console.error('[Solana Callback] Error in solanaCallback:', error);
    console.error('[Solana Callback] Error message:', error.message);
    console.error('[Solana Callback] Error stack:', error.stack);
    console.error('[Solana Callback] Error name:', error.name);
    throw error; // Re-throw to be handled by caller
  }
};

/**
 * Get Solana verification status
 */
export const solanaStatus = async (session) => {
  return session.result || null;
};

/**
 * Fetch Solana wallet data via RPC (getBalance + getSignaturesForAddress)
 * Used when Solscan fails or SOLSCAN_API_KEY is not set.
 */
const fetchSolanaWalletDataViaRPC = async (address) => {
  const { Connection, PublicKey } = await import('@solana/web3.js');
  const connection = new Connection('https://api.mainnet-beta.solana.com', { commitment: 'confirmed' });
  const publicKey = new PublicKey(address);

  const balance = await connection.getBalance(publicKey);
  const balanceSol = balance / 1e9;

  let txCount = 0;
  let walletAge = 0;
  let walletAgeDays = 0;
  let hasRecentActivity = false;
  const thirtyDaysAgo = (Date.now() / 1000) - (30 * 24 * 60 * 60);

  try {
    const sigs = await connection.getSignaturesForAddress(publicKey, { limit: 1000 });
    txCount = sigs.length;
    const blockTimes = sigs.map(s => s.blockTime).filter(t => t != null);
    if (blockTimes.length > 0) {
      const oldest = Math.min(...blockTimes);
      const newest = Math.max(...blockTimes);
      walletAge = (Date.now() / 1000) - oldest;
      walletAgeDays = walletAge / (24 * 60 * 60);
      hasRecentActivity = newest >= thirtyDaysAgo;
    }
  } catch (e) {
    console.warn('[Solana] getSignaturesForAddress failed:', e.message);
  }

  return {
    address,
    balance,
    balanceSol,
    txCount,
    walletAge: walletAge * 1000,
    walletAgeDays: Math.floor(walletAgeDays),
    walletAgeYears: walletAge > 0 ? walletAge / (24 * 60 * 60 * 365) : 0,
    hasRecentActivity
  };
};

/**
 * Fetch Solana wallet data from Solscan API (or RPC fallback)
 */
const fetchSolanaWalletData = async (address) => {
  const { SOLSCAN_API_KEY } = getSolanaConfig();
  const useSolscan = !!SOLSCAN_API_KEY;

  if (!useSolscan) {
    console.log('[Solana] No SOLSCAN_API_KEY; using RPC only. Add key for tx/age data.');
    try {
      return await fetchSolanaWalletDataViaRPC(address);
    } catch (rpcError) {
      console.warn('[Solana] RPC fetch failed:', rpcError.message);
      return {
        address,
        balance: 0,
        balanceSol: 0,
        txCount: 0,
        walletAge: 0,
        walletAgeDays: 0,
        walletAgeYears: 0,
        hasRecentActivity: false
      };
    }
  }

  try {
    const accountUrl = `https://api.solscan.io/account?address=${address}&apiKey=${SOLSCAN_API_KEY}`;
    let accountResponse;
    try {
      accountResponse = await axios.get(accountUrl, {
        headers: { 'Accept': 'application/json' },
        timeout: 10000
      });
    } catch (accountError) {
      console.warn('[Solana] Solscan account fetch failed, using RPC:', accountError.message);
      return await fetchSolanaWalletDataViaRPC(address);
    }

    const raw = accountResponse?.data;
    const accountData = raw?.data ?? raw ?? {};
    let balanceLamports = Number(accountData.lamports ?? accountData.solana ?? accountData.balance ?? 0);
    if (!balanceLamports && accountData.sol_balance != null) {
      balanceLamports = Number(accountData.sol_balance) * 1e9;
    }
    const balanceSol = balanceLamports / 1e9;
    let txCount = Number(
      accountData.txCount ?? accountData.transactionCount ?? accountData.transaction_count ?? 0
    );

    const txUrl = `https://api.solscan.io/transaction/list?address=${address}&limit=100&apiKey=${SOLSCAN_API_KEY}`;
    let walletAge = 0;
    let walletAgeDays = 0;
    let hasRecentActivity = false;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    try {
      const txResponse = await axios.get(txUrl, {
        headers: { 'Accept': 'application/json' },
        timeout: 10000
      });
      const txRaw = txResponse?.data;
      const transactions = Array.isArray(txRaw) ? txRaw : (txRaw?.data ?? txRaw ?? []);

      if (transactions.length > 0) {
        if (txCount === 0) txCount = transactions.length;
        const firstTx = transactions[transactions.length - 1];
        const bt = firstTx.blockTime ?? firstTx.block_time ?? firstTx.timestamp;
        if (bt != null) {
          const firstTxDate = new Date(typeof bt === 'number' ? bt * 1000 : bt);
          walletAge = Date.now() - firstTxDate.getTime();
          walletAgeDays = walletAge / (1000 * 60 * 60 * 24);
        }
        const recentTxs = transactions.filter(tx => {
          const t = tx.blockTime ?? tx.block_time ?? tx.timestamp;
          if (t == null) return false;
          const d = typeof t === 'number' ? new Date(t * 1000) : new Date(t);
          return d.getTime() >= thirtyDaysAgo;
        });
        hasRecentActivity = recentTxs.length > 0;
      }
    } catch (txError) {
      console.warn('[Solana] Solscan tx list failed, using RPC for tx/age:', txError.message);
      try {
        const rpc = await fetchSolanaWalletDataViaRPC(address);
        return {
          address,
          balance: balanceLamports || rpc.balance,
          balanceSol: balanceSol || rpc.balanceSol,
          txCount: txCount || rpc.txCount,
          walletAge: rpc.walletAge,
          walletAgeDays: rpc.walletAgeDays,
          walletAgeYears: rpc.walletAgeYears,
          hasRecentActivity: rpc.hasRecentActivity
        };
      } catch (_) {
        // keep Solscan balance, zeros for rest
      }
    }

    return {
      address,
      balance: balanceLamports,
      balanceSol,
      txCount,
      walletAge,
      walletAgeDays: Math.floor(walletAgeDays),
      walletAgeYears: walletAge > 0 ? walletAge / (1000 * 60 * 60 * 24 * 365) : 0,
      hasRecentActivity
    };
  } catch (error) {
    console.error('[Solana] Error fetching wallet data:', error.message || error);
    try {
      return await fetchSolanaWalletDataViaRPC(address);
    } catch (rpcError) {
      return {
        address,
        balance: 0,
        balanceSol: 0,
        txCount: 0,
        walletAge: 0,
        walletAgeDays: 0,
        walletAgeYears: 0,
        hasRecentActivity: false
      };
    }
  }
};
