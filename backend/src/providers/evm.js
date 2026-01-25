import { SiweMessage } from 'siwe';
import { ethers } from 'ethers';
import axios from 'axios';
import { updateVerificationSession } from '../utils/session.js';
import { calculateEVMScore } from '../scoring/evm.js';

const getEVMConfig = () => {
  const ETHERSCAN_API_KEY = process.env.ETHERSCAN_API_KEY;
  return { ETHERSCAN_API_KEY };
};

export const evmAuth = async (passportId, sessionId) => {
  // For EVM, we need frontend to connect wallet first
  // Return a URL that frontend will handle
  const frontendUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify/evm?session=${sessionId}&passportId=${passportId}`;
  return frontendUrl;
};

export const evmCallback = async (req, session) => {
  // Handle both GET (query) and POST (body) requests
  const { address, signature, message } = req.body || req.query;
  
  if (!address || !signature || !message) {
    throw new Error('Missing required fields: address, signature, message');
  }

  // Verify SIWE signature
  const siweMessage = new SiweMessage(message);
  const fields = await siweMessage.validate(signature);
  
  if (fields.address.toLowerCase() !== address.toLowerCase()) {
    throw new Error('Signature verification failed');
  }

  // Fetch wallet data from Etherscan
  const walletData = await fetchWalletData(address);
  
  // Calculate score
  const scoreResult = calculateEVMScore(walletData);
  
  // Minimum balance requirement: 0.01 ETH
  if (walletData.balanceEth < 0.01) {
    throw new Error('Insufficient balance. Minimum 0.01 ETH required for verification.');
  }
  
  // Generate commitment hash (PRIVACY: use standard format)
  const platformId = 2; // EVM = 2 (per spec)
  const secretSalt = process.env.SECRET_SALT || 'zkpersona-secret-salt';
  const commitmentInput = `${platformId}:${address.toLowerCase()}:${secretSalt}`;
  const commitment = ethers.keccak256(ethers.toUtf8Bytes(commitmentInput)) + 'field';

  return {
    verified: true,
    provider: 'evm',
    commitment: commitment, // PRIVACY: Return commitment, not address
    score: scoreResult.score,
    criteria: scoreResult.criteria,
    maxScore: scoreResult.maxScore,
    // DO NOT return: address, walletData (personal data)
  };
};

export const evmStatus = async (session) => {
  return session.result || null;
};

const fetchWalletData = async (address) => {
  try {
    const { ETHERSCAN_API_KEY } = getEVMConfig();
    
    // Get balance
    const balanceResponse = await axios.get(`https://api.etherscan.io/api`, {
      params: {
        module: 'account',
        action: 'balance',
        address,
        tag: 'latest',
        apikey: ETHERSCAN_API_KEY
      }
    });

    const balance = balanceResponse.data.result ? BigInt(balanceResponse.data.result) : 0n;
    const balanceEth = Number(balance) / 1e18;

    // Get transaction count
    const txCountResponse = await axios.get(`https://api.etherscan.io/api`, {
      params: {
        module: 'proxy',
        action: 'eth_getTransactionCount',
        address,
        tag: 'latest',
        apikey: ETHERSCAN_API_KEY
      }
    });

    const txCount = txCountResponse.data.result 
      ? parseInt(txCountResponse.data.result, 16) 
      : 0;

    // Get transaction list for age calculation and recent activity check
    const txListResponse = await axios.get(`https://api.etherscan.io/api`, {
      params: {
        module: 'account',
        action: 'txlist',
        address,
        startblock: 0,
        endblock: 99999999,
        page: 1,
        offset: 100, // Get more transactions to check recent activity
        sort: 'asc',
        apikey: ETHERSCAN_API_KEY
      }
    });

    let walletAge = 0;
    let walletAgeDays = 0;
    let hasRecentActivity = false;
    const thirtyDaysAgo = Date.now() - (30 * 24 * 60 * 60 * 1000);

    if (txListResponse.data.result && txListResponse.data.result.length > 0) {
      // Get first transaction for age calculation
      const firstTx = txListResponse.data.result[0];
      if (firstTx.timeStamp) {
        const firstTxDate = new Date(Number(firstTx.timeStamp) * 1000);
        walletAge = Date.now() - firstTxDate.getTime();
        walletAgeDays = walletAge / (1000 * 60 * 60 * 24);
      }

      // Check for recent activity (last 30 days)
      const recentTxs = txListResponse.data.result.filter(tx => {
        if (!tx.timeStamp) return false;
        const txDate = new Date(Number(tx.timeStamp) * 1000);
        return txDate.getTime() >= thirtyDaysAgo;
      });
      hasRecentActivity = recentTxs.length > 0;
    }

    return {
      address: address.toLowerCase(),
      balance,
      balanceEth,
      txCount,
      walletAge,
      walletAgeDays: Math.floor(walletAgeDays),
      walletAgeYears: walletAge > 0 ? walletAge / (1000 * 60 * 60 * 24 * 365) : 0,
      hasRecentActivity
    };
  } catch (error) {
    console.error('[EVM] Error fetching wallet data:', error);
    throw new Error('Failed to fetch wallet data from Etherscan');
  }
};

