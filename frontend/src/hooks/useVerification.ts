import { useState, useCallback, useEffect } from 'react';
import { 
  verifyEthereum, 
  verifyDiscord,
  VerificationResult,
  VERIFICATION_CONFIGS
} from '../services/verificationService';
import { 
  generateCommitment 
} from '../lib/commitments';
import { 
  isExpired, 
  getPlatformStatus, 
  getDaysRemaining,
  formatExpiryDate 
} from '../lib/expiration';

export interface VerificationState {
  [providerId: string]: {
    verified: boolean;
    score: number;
    criteria: Array<{ condition: string; points: number; description: string; achieved: boolean }>;
    verifiedAt?: number;
    commitment?: string;
    status?: 'connected' | 'disconnected' | 'expired';
    daysRemaining?: number;
    expiryDate?: string;
  };
}

export const useVerification = (walletAddress?: string) => {
  const [verifications, setVerifications] = useState<VerificationState>({});
  const [loading, setLoading] = useState(true);

  // Load verifications from localStorage (frontend-only, no persistent backend storage)
  useEffect(() => {
    const loadVerifications = async () => {
      if (!walletAddress) {
        // Clear verifications when wallet is disconnected
        setVerifications({});
        setLoading(false);
        return;
      }

      try {
        setLoading(true);

        const storageKey = `verifications_${walletAddress}`;
        const saved = localStorage.getItem(storageKey);

        if (saved) {
          try {
            const parsed = JSON.parse(saved) as VerificationState;
            setVerifications(parsed);
          } catch {
            setVerifications({});
          }
        } else {
          setVerifications({});
        }
      } finally {
        setLoading(false);
      }
    };

    // Add small delay to prevent rapid-fire calls in React Strict Mode
    const timeoutId = setTimeout(() => {
      loadVerifications();
    }, 100);

    return () => clearTimeout(timeoutId);
  }, [walletAddress]);

  // Function to manually refresh verifications (called after successful verification)
  const refreshVerifications = useCallback(async () => {
    if (!walletAddress) {
      return;
    }

    try {
      setLoading(true);

      const storageKey = `verifications_${walletAddress}`;
      const saved = localStorage.getItem(storageKey);

      if (saved) {
        try {
          const parsed = JSON.parse(saved) as VerificationState;
          setVerifications(parsed);
        } catch {
          setVerifications({});
        }
      } else {
        setVerifications({});
      }
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  // Listen for verification-updated event to refresh verifications (debounced to avoid storm)
  useEffect(() => {
    let t: ReturnType<typeof setTimeout>;
    const handleVerificationUpdate = () => {
      clearTimeout(t);
      t = setTimeout(() => refreshVerifications(), 500);
    };

    window.addEventListener('verification-updated', handleVerificationUpdate);
    return () => {
      clearTimeout(t);
      window.removeEventListener('verification-updated', handleVerificationUpdate);
    };
  }, [refreshVerifications]);

  const [verifying, setVerifying] = useState<string | null>(null);

  // Save verifications to React state only (backend handles persistence)
  const saveVerifications = useCallback((newVerifications: VerificationState) => {
    setVerifications(newVerifications);
  }, []);

  // Save verification result from backend (without API calls)
  // When backend returns commitment (Telegram, Solana, Discord callback), use it for claim_social_stamp
  const saveVerificationResult = useCallback((
    providerId: string,
    result: { score: number; criteria: Array<{ condition: string; points: number; description: string }>; metadataHash?: string; commitment?: string }
  ) => {
    const timestamp = Date.now();
    const userId = result.metadataHash || result.commitment || `${providerId}_${timestamp}`;
    const commitment = (result.commitment && String(result.commitment).trim()) 
      ? String(result.commitment).replace(/\s/g, '')
      : (walletAddress ? generateCommitment(userId, walletAddress, timestamp) : '');

    const updated = {
      ...verifications,
      [providerId]: {
        verified: true,
        score: result.score,
        criteria: (result.criteria || []).map(c => ({
          ...c,
          achieved: true
        })),
        verifiedAt: timestamp,
        commitment,
        status: 'connected' as const,
        daysRemaining: 90,
        expiryDate: formatExpiryDate(timestamp)
      }
    };

    saveVerifications(updated);

    // Persist to localStorage (per-wallet key) so status survives reload
    if (walletAddress) {
      try {
        const storageKey = `verifications_${walletAddress}`;
        localStorage.setItem(storageKey, JSON.stringify(updated));
      } catch {
        // Ignore storage errors
      }
    }
    
    window.dispatchEvent(new Event('verification-updated'));
  }, [verifications, saveVerifications, walletAddress]);

  const verifyProvider = useCallback(async (
    providerId: string,
    credentials: { accessToken?: string; address?: string; answers?: string[]; signature?: string; score?: number; criteria?: Array<{ condition: string; points: number; description: string }> }
  ): Promise<VerificationResult> => {
    setVerifying(providerId);
    
    try {
      let result: VerificationResult;

      switch (providerId) {
        case 'discord':
          if (!credentials.accessToken) throw new Error('Access token required');
          result = await verifyDiscord(credentials.accessToken);
          break;
        case 'telegram':
          // Telegram is handled via backend OAuth, not frontend
          throw new Error(`${providerId} verification must be done through backend OAuth flow`);
        case 'ethereum':
        case 'eth_wallet':
          if (!credentials.address) throw new Error('Wallet address required');
          result = await verifyEthereum(credentials.address, credentials.signature);
          break;
        case 'solana':
          // Solana verification is handled via backend wallet flow
          throw new Error('Solana verification must be done through backend wallet flow');
        default:
          throw new Error(`Unknown provider: ${providerId}`);
      }

      // Generate commitment if wallet address available
      const timestamp = Date.now();
      const userId = providerId === 'ethereum' 
        ? credentials.address || ''
        : (result.data?.id || result.data?.data?.id || '');
      const commitment = walletAddress 
        ? generateCommitment(userId, walletAddress, timestamp)
        : '';

      // Save verification result with commitment
      const updated = {
        ...verifications,
        [providerId]: {
          verified: result.verified,
          score: result.score,
          criteria: result.criteria.map(c => ({
            ...c,
            achieved: true // All criteria in result are achieved
          })),
          verifiedAt: timestamp,
          commitment,
          status: 'connected' as const,
          daysRemaining: 90,
          expiryDate: formatExpiryDate(timestamp)
        }
      };

      saveVerifications(updated);
      
      // Persist to localStorage
      if (walletAddress) {
        try {
          const storageKey = `verifications_${walletAddress}`;
          localStorage.setItem(storageKey, JSON.stringify(updated));
        } catch {
          // Ignore storage errors
        }
      }

      return result;
    } catch (error) {
      throw error;
    } finally {
      setVerifying(null);
    }
  }, [verifications, saveVerifications]);

  const getTotalScore = useCallback(() => {
    return Object.values(verifications).reduce((sum, v) => sum + (v.verified ? v.score : 0), 0);
  }, [verifications]);

  const getVerification = useCallback((providerId: string) => {
    return verifications[providerId] || null;
  }, [verifications]);

  const clearVerification = useCallback(async (providerId: string) => {
    if (!walletAddress) {
      return;
    }

    // Frontend-only: clear from state and localStorage, no backend DELETE
    const updated = { ...verifications };
    delete updated[providerId];
    setVerifications(updated);

    const storageKey = `verifications_${walletAddress}`;
    const saved = localStorage.getItem(storageKey);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        delete parsed[providerId];
        localStorage.setItem(storageKey, JSON.stringify(parsed));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, [verifications, walletAddress]);

  return {
    verifications,
    verifying,
    loading,
    verifyProvider,
    saveVerificationResult,
    getTotalScore,
    getVerification,
    clearVerification,
    refreshVerifications
  };
};

