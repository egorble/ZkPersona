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
import { getUserVerifications } from '../utils/backendAPI';

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

  // Load verifications from backend API instead of localStorage
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
        console.log('[useVerification] 📂 Loading verifications from backend API:', {
          walletAddress
        });

        // Load from backend API
        const backendVerifications = await getUserVerifications(walletAddress);
        console.log('[useVerification] 📦 Backend returned verifications:', {
          count: backendVerifications.length,
          providers: backendVerifications.map((v: any) => v.provider),
          userIds: backendVerifications.map((v: any) => v.userId?.substring(0, 10) + '...'),
          requestedWalletAddress: walletAddress.substring(0, 10) + '...'
        });
        
        const verificationsState: VerificationState = {};

        // Convert backend verifications to state format
        backendVerifications.forEach((v: any) => {
          if (v.status === 'verified' && (!v.expiresAt || new Date(v.expiresAt) > new Date())) {
            const verifiedAt = v.verifiedAt ? new Date(v.verifiedAt).getTime() : Date.now();
            const status = getPlatformStatus(verifiedAt);
            
            // Extract criteria from backend response
            // Backend returns criteria array with { condition, points, description, achieved }
            const criteria = Array.isArray(v.criteria) ? v.criteria.map((c: any) => ({
              condition: c.condition || '',
              points: c.points || 0,
              description: c.description || '',
              achieved: c.achieved !== undefined ? c.achieved : false // Default to false if not specified
            })) : [];
            
            const verificationData = {
              verified: true,
              score: v.score || 0,
              criteria: criteria, // Use criteria from backend
              verifiedAt,
              commitment: generateCommitment(v.provider, walletAddress, verifiedAt),
              status,
              daysRemaining: getDaysRemaining(verifiedAt),
              expiryDate: formatExpiryDate(verifiedAt)
            };

            // Map provider names
            if (v.provider === 'evm' || v.provider === 'ethereum') {
              verificationsState['wallet'] = verificationData;
              verificationsState['ethereum'] = verificationData;
              verificationsState['eth_wallet'] = verificationData;
            } else {
              verificationsState[v.provider] = verificationData;
            }
          }
        });

        setVerifications(verificationsState);
        console.log('[useVerification] ✅ Loaded verifications from backend:', Object.keys(verificationsState));
      } catch (error) {
        console.error('[useVerification] ❌ Error loading verifications:', error);
      } finally {
        setLoading(false);
      }
    };

    loadVerifications();
  }, [walletAddress]);

  // Function to manually refresh verifications (called after successful verification)
  const refreshVerifications = useCallback(async () => {
    if (!walletAddress) {
      return;
    }

    try {
      setLoading(true);
      console.log('[useVerification] 🔄 Refreshing verifications from backend API...');

      // Load from backend API
      const backendVerifications = await getUserVerifications(walletAddress);
      const verificationsState: VerificationState = {};

      // Convert backend verifications to state format
      backendVerifications.forEach((v: any) => {
        if (v.status === 'verified' && (!v.expiresAt || new Date(v.expiresAt) > new Date())) {
          const verifiedAt = v.verifiedAt ? new Date(v.verifiedAt).getTime() : Date.now();
          const status = getPlatformStatus(verifiedAt);
          
          // Extract criteria from backend response
          const criteria = Array.isArray(v.criteria) ? v.criteria.map((c: any) => ({
            condition: c.condition || '',
            points: c.points || 0,
            description: c.description || '',
            achieved: c.achieved !== undefined ? c.achieved : false
          })) : [];
          
          const verificationData = {
            verified: true,
            score: v.score || 0,
            criteria: criteria, // Use criteria from backend
            verifiedAt,
            commitment: generateCommitment(v.provider, walletAddress, verifiedAt),
            status,
            daysRemaining: getDaysRemaining(verifiedAt),
            expiryDate: formatExpiryDate(verifiedAt)
          };

          // Map provider names
          if (v.provider === 'evm' || v.provider === 'ethereum') {
            verificationsState['wallet'] = verificationData;
            verificationsState['ethereum'] = verificationData;
            verificationsState['eth_wallet'] = verificationData;
          } else {
            verificationsState[v.provider] = verificationData;
          }
        }
      });

      setVerifications(verificationsState);
      console.log('[useVerification] ✅ Refreshed verifications from backend:', Object.keys(verificationsState));
    } catch (error) {
      console.error('[useVerification] ❌ Error refreshing verifications:', error);
    } finally {
      setLoading(false);
    }
  }, [walletAddress]);

  // Listen for verification-updated event to refresh verifications
  useEffect(() => {
    const handleVerificationUpdate = () => {
      console.log('[useVerification] 🔔 Verification update event received, refreshing...');
      refreshVerifications();
    };

    window.addEventListener('verification-updated', handleVerificationUpdate);
    return () => window.removeEventListener('verification-updated', handleVerificationUpdate);
  }, [refreshVerifications]);

  const [verifying, setVerifying] = useState<string | null>(null);

  // Save verifications to React state only (backend handles persistence)
  const saveVerifications = useCallback((newVerifications: VerificationState) => {
    setVerifications(newVerifications);
    console.log('[useVerification] 💾 Verifications updated in state');
  }, []);

  // Save verification result from backend (without API calls)
  const saveVerificationResult = useCallback((
    providerId: string,
    result: { score: number; criteria: Array<{ condition: string; points: number; description: string }>; metadataHash?: string }
  ) => {
    console.log(`[useVerification] 💾 Saving verification result for ${providerId}:`, {
      score: result.score,
      criteriaCount: result.criteria.length
    });

    const timestamp = Date.now();
    const userId = result.metadataHash || `${providerId}_${timestamp}`;
    const commitment = walletAddress 
      ? generateCommitment(userId, walletAddress, timestamp)
      : '';

    const updated = {
      ...verifications,
      [providerId]: {
        verified: true,
        score: result.score,
        criteria: result.criteria.map(c => ({
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
    console.log(`[useVerification] ✅ Verification saved for ${providerId}, status: connected`);
    
    // Trigger storage event so other components can listen
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
        case 'tiktok':
          // Telegram and TikTok are handled via backend OAuth, not frontend
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

      return result;
    } catch (error) {
      console.error(`[Verification] Failed to verify ${providerId}:`, error);
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
      console.warn('[useVerification] ⚠️ Cannot clear verification: wallet not connected');
      return;
    }

    try {
      console.log(`[useVerification] 🗑️ Clearing verification: ${providerId} for wallet ${walletAddress.substring(0, 10)}...`);
      
      // Import deleteUserVerification function
      const { deleteUserVerification } = await import('../utils/backendAPI');
      
      // Delete from backend first
      const deleted = await deleteUserVerification(walletAddress, providerId);
      
      if (deleted) {
        console.log(`[useVerification] ✅ Verification deleted from backend: ${providerId}`);
      } else {
        console.warn(`[useVerification] ⚠️ Verification not found in backend: ${providerId}`);
      }
      
      // Remove from local state
      const updated = { ...verifications };
      delete updated[providerId];
      setVerifications(updated);
      
      // Also clear from localStorage (if using it)
      const saved = localStorage.getItem('verifications');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          delete parsed[providerId];
          localStorage.setItem('verifications', JSON.stringify(parsed));
        } catch (e) {
          // Ignore localStorage errors
        }
      }
      
      console.log(`[useVerification] ✅ Verification cleared from state: ${providerId}`);
    } catch (error) {
      console.error(`[useVerification] ❌ Error clearing verification:`, error);
      // Still remove from local state even if backend deletion fails
      const updated = { ...verifications };
      delete updated[providerId];
      setVerifications(updated);
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

