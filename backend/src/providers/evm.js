import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
import axios from 'axios';
import { updateVerificationSession } from '../utils/session.js';
import { calculateEVMScore } from '../scoring/evm.js';
import { generateAleoCommitment } from '../utils/aleoField.js';

const getEVMConfig = () => {
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  return { ETHERSCAN_API_KEY };
};

export const evmAuth = async (passportId, sessionId) => {
  // For EVM, we return session info for frontend to handle wallet connection
  // Frontend will use WalletConnect modal instead of redirecting
  return {
    sessionId,
    passportId,
    provider: 'evm',
    message: 'Connect your EVM wallet via WalletConnect'
  };
};

export const evmCallback = async (req, session) => {
  try {
    // Handle both GET (query) and POST (body) requests
    console.log('[EVM Callback] Received req:', {
      reqType: typeof req,
      hasReq: !!req,
      hasBody: !!(req && req.body),
      hasQuery: !!(req && req.query),
      bodyType: req && req.body ? typeof req.body : 'undefined',
      bodyKeys: req && req.body && typeof req.body === 'object' ? Object.keys(req.body) : [],
      queryKeys: req && req.query && typeof req.query === 'object' ? Object.keys(req.query) : []
    });
    
    // Ensure we have a valid object - SAFE destructuring
    let bodyOrQuery = {};
    
    if (req && typeof req === 'object') {
      if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        bodyOrQuery = req.body;
      } else if (req.query && typeof req.query === 'object' && !Array.isArray(req.query)) {
        bodyOrQuery = req.query;
      }
    }
    
    console.log('[EVM Callback] Parsed bodyOrQuery:', bodyOrQuery);
    console.log('[EVM Callback] bodyOrQuery type:', typeof bodyOrQuery);
    console.log('[EVM Callback] bodyOrQuery keys:', Object.keys(bodyOrQuery));
    
    // SAFE destructuring with defaults
    const address = bodyOrQuery.address || null;
    const signature = bodyOrQuery.signature || null;
    const message = bodyOrQuery.message || null;
    
    console.log('[EVM Callback] Extracted fields:', {
      hasAddress: !!address,
      hasSignature: !!signature,
      hasMessage: !!message,
      addressLength: address ? address.length : 0,
      signatureLength: signature ? signature.length : 0,
      messageLength: message ? message.length : 0
    });
    
    if (!address || !signature || !message) {
      console.error('[EVM Callback] Missing fields:', { 
        hasAddress: !!address, 
        hasSignature: !!signature, 
        hasMessage: !!message,
        bodyOrQuery,
        bodyOrQueryKeys: Object.keys(bodyOrQuery)
      });
      throw new Error('Missing required fields: address, signature, message');
    }

  // Verify SIWE signature
  const siweMessage = new SiweMessage(message);
  const fields = await siweMessage.validate(signature);
  
  if (fields.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error('Signature verification failed');
  }

  // Fetch wallet data from Etherscan
  let walletData;
  try {
    walletData = await fetchWalletData(address);
  } catch (fetchError) {
    console.error('[EVM] Error fetching wallet data:', fetchError.message);
    // Continue with default values if fetch fails
    walletData = {
      address,
      balanceEth: 0,
      txCount: 0,
      walletAgeYears: 0,
      hasRecentActivity: false
    };
  }
  
  // Minimum balance requirement: 0.001 ETH (lowered for testing)
  // Skip balance check if wallet data fetch failed
  if (walletData.balanceEth > 0 && walletData.balanceEth < 0.001) {
    throw new Error('Insufficient balance. Minimum 0.001 ETH required for verification.');
  }
  
  // Calculate score (will work even with default values)
  const scoreResult = calculateEVMScore(walletData);
  
  // Generate Aleo-compatible commitment (PRIVACY: hashed with field modulo)
  const platformId = 6; // EVM = 6 (per platformMapping.ts)
  const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
  const commitment = generateAleoCommitment(platformId, address.toLowerCase(), secretSalt);

    return {
      verified: true,
      provider: 'evm',
      commitment: commitment, // PRIVACY: Return commitment, not address
      score: scoreResult.score,
      criteria: scoreResult.criteria,
      maxScore: scoreResult.maxScore,
      // DO NOT return: address, walletData (personal data)
    };
  } catch (error) {
    console.error('[EVM Callback] Error in evmCallback:', error);
    console.error('[EVM Callback] Error message:', error.message);
    console.error('[EVM Callback] Error stack:', error.stack);
    console.error('[EVM Callback] Error name:', error.name);
    throw error; // Re-throw to be handled by caller
  }
};

export const evmStatus = async (session) => {
  return session.result || null;
};

const fetchWalletData = async (address) => {
  try {
    const { ETHERSCAN_API_KEY } = getEVMConfig();
    
    // Get balance
    let balanceEth = 0;
    try {
      const balanceResponse = await axios.get(`https://api.etherscan.io/api`, {
        params: {
          module: 'account',
          action: 'balance',
          address,
          tag: 'latest',
          apikey: ETHERSCAN_API_KEY || ''
        },
        timeout: 5000 // 5 second timeout
      });

      if (balanceResponse.data && balanceResponse.data.status === '1' && balanceResponse.data.result) {
        const balance = BigInt(balanceResponse.data.result);
        balanceEth = Number(balance) / 1e18;
      }
    } catch (balanceError) {
      console.warn('[EVM] Balance fetch failed, using fallback:', balanceError.message);
      // Try RPC fallback
      try {
        const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
        const balance = await provider.getBalance(address);
        balanceEth = Number(balance) / 1e18;
      } catch (rpcError) {
        console.warn('[EVM] RPC fallback also failed:', rpcError.message);
      }
    }

    // Get transaction count
    let txCount = 0;
    try {
      const txCountResponse = await axios.get(`https://api.etherscan.io/api`, {
        params: {
          module: 'proxy',
          action: 'eth_getTransactionCount',
          address,
          tag: 'latest',
          apikey: ETHERSCAN_API_KEY || ''
        },
        timeout: 5000
      });

      if (txCountResponse.data && txCountResponse.data.result) {
        txCount = parseInt(txCountResponse.data.result, 16);
      }
    } catch (txCountError) {
      console.warn('[EVM] Transaction count fetch failed:', txCountError.message);
      // Try RPC fallback
      try {
        const provider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
        txCount = await provider.getTransactionCount(address);
      } catch (rpcError) {
        console.warn('[EVM] RPC fallback for txCount failed:', rpcError.message);
      }
    }

    // Get transaction list for age calculation and recent activity check
    let txListResponse;
    try {
      txListResponse = await axios.get(`https://api.etherscan.io/api`, {
        params: {
          module: 'account',
          action: 'txlist',
          address,
          startblock: 0,
          endblock: 99999999,
          page: 1,
          offset: 100, // Get more transactions to check recent activity
          sort: 'asc',
          apikey: ETHERSCAN_API_KEY || ''
        },
        timeout: 10000 // 10 second timeout for tx list
      });
    } catch (txListError) {
      console.warn('[EVM] Transaction list fetch failed:', txListError.message);
      txListResponse = { data: { status: '0', result: [] } };
    }

    let walletAge = 0;
    let walletAgeDays = 0;
    let hasRecentActivity = false;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    if (txListResponse && txListResponse.data && txListResponse.data.status === '1' && txListResponse.data.result && txListResponse.data.result.length > 0) {
      // Get first transaction for age calculation
      const firstTx = txListResponse.data.result[0];
      if (firstTx && firstTx.timeStamp) {
        const firstTxDate = new Date(Number(firstTx.timeStamp) * 1000);
        walletAge = Date.now() - firstTxDate.getTime();
        walletAgeDays = walletAge / (1000 * 60 * 60 * 24);
      }

      // Check for recent activity (last 30 days)
      const recentTxs = txListResponse.data.result.filter(tx => {
        if (!tx || !tx.timeStamp) return false;
        const txDate = new Date(Number(tx.timeStamp) * 1000);
        return txDate.getTime() >= thirtyDaysAgo;
      });
      hasRecentActivity = recentTxs.length > 0;
    }

    return {
      address: address.toLowerCase(),
      balance: BigInt(0), // Default balance
      balanceEth,
      txCount,
      walletAge,
      walletAgeDays: Math.floor(walletAgeDays),
      walletAgeYears: walletAge > 0 ? walletAge / (1000 * 60 * 60 * 24 * 365) : 0,
      hasRecentActivity
    };
  } catch (error) {
    console.error('[EVM] Error fetching wallet data:', error.message || error);
    // Return default values instead of throwing
    return {
      address: address.toLowerCase(),
      balance: 0n,
      balanceEth: 0,
      txCount: 0,
      walletAge: 0,
      walletAgeDays: 0,
      walletAgeYears: 0,
      hasRecentActivity: false
    };
  }
};

