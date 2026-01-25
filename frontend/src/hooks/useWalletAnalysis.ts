// EVM Wallet Analysis Hook for Identity Portal
import { useState, useCallback } from 'react';
import { verifyEthereum } from '../services/verificationService';
import { saveCommitment, generateCommitment, updateWalletAddress } from '../lib/commitments';
import { getPlatformStatus, getDaysRemaining, formatExpiryDate } from '../lib/expiration';

export interface WalletAnalysisResult {
  verified: boolean;
  score: number;
  balanceEth: number;
  transactionCount: number;
  walletAgeYears?: number;
  commitment?: string;
  status: 'connected' | 'disconnected' | 'expired';
  verifiedAt?: number;
  daysRemaining?: number;
  expiryDate?: string;
}

export const useWalletAnalysis = () => {
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<WalletAnalysisResult | null>(null);

  const analyzeWallet = useCallback(async (address: string): Promise<WalletAnalysisResult> => {
    setAnalyzing(true);
    
    try {
      // Update wallet address in storage
      updateWalletAddress(address);
      
      // Verify wallet using existing service
      const verificationResult = await verifyEthereum(address);
      
      // Get wallet age from verification data if available
      const walletData = verificationResult.data || {};
      const txCount = walletData.txCount || 0;
      
      // Calculate wallet age (simplified - would need first tx timestamp from Etherscan)
      // For now, we'll use a placeholder - in production, fetch first tx timestamp
      let walletAgeYears: number | undefined;
      
      // Generate commitment
      const timestamp = Date.now();
      const commitment = generateCommitment(address, address, timestamp);
      
      // Save commitment
      saveCommitment('wallet', commitment, verificationResult.score, timestamp, {
        userId: address,
        metrics: {
          balance: walletData.balance,
          txCount
        }
      });
      
      const status = getPlatformStatus(timestamp);
      const analysisResult: WalletAnalysisResult = {
        verified: verificationResult.verified,
        score: verificationResult.score,
        balanceEth: walletData.balance ? Number(walletData.balance) / 1e18 : 0,
        transactionCount: txCount,
        walletAgeYears,
        commitment,
        status,
        verifiedAt: timestamp,
        daysRemaining: getDaysRemaining(timestamp),
        expiryDate: formatExpiryDate(timestamp)
      };
      
      setResult(analysisResult);
      return analysisResult;
    } catch (error) {
      console.error('[WalletAnalysis] Failed to analyze wallet:', error);
      throw error;
    } finally {
      setAnalyzing(false);
    }
  }, []);

  const clearAnalysis = useCallback(() => {
    setResult(null);
  }, []);

  return {
    analyzing,
    result,
    analyzeWallet,
    clearAnalysis
  };
};

