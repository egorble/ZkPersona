/**
 * Hook for claiming points on Aleo blockchain after successful verification
 * 
 * After Discord/Telegram/Solana verification is successful:
 * 1. Backend returns commitment (hash of social_id + secret)
 * 2. This hook calls claim_point on Aleo contract
 * 3. Points are added to user's passport (encrypted on-chain)
 */

import { useState, useCallback } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { Transaction, WalletAdapterNetwork } from '@demox-labs/aleo-wallet-adapter-base';
import { PROGRAM_ID } from '../deployed_program';
import { providerToPlatformId } from '../utils/platformMapping';
import { requestTransactionWithRetry } from '../utils/walletUtils';

interface WalletAdapterExtras {
  requestTransaction?: (tx: Transaction) => Promise<string>;
  requestRecordPlaintexts?: (programId: string) => Promise<any[]>;
}

interface ClaimResult {
  success: boolean;
  txId?: string;
  error?: string;
}

/**
 * Hook to claim points on Aleo blockchain after successful social verification
 */
export const useClaimPoints = () => {
  const { publicKey, wallet } = useWallet();
  const adapter = wallet?.adapter as unknown as WalletAdapterExtras | undefined;
  const network = WalletAdapterNetwork.TestnetBeta;

  const [claiming, setClaiming] = useState(false);
  const [lastClaimTxId, setLastClaimTxId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  /**
   * Get user's passport record from wallet
   * Returns the first passport record found, or null if none exists
   */
  const getPassportRecord = useCallback(async (): Promise<string | null> => {
    if (!adapter?.requestRecordPlaintexts) {
      console.warn('[ClaimPoints] Wallet does not support requestRecordPlaintexts');
      return null;
    }

    try {
      const records = await adapter.requestRecordPlaintexts(PROGRAM_ID);
      
      // Find passport record (contains 'total_stamps' field)
      const passportRecord = records?.find((r: any) => {
        const plaintext = typeof r === 'string' ? r : r.plaintext || JSON.stringify(r);
        return plaintext.includes('total_stamps') && plaintext.includes('humanity_score');
      });

      if (passportRecord) {
        return typeof passportRecord === 'string' 
          ? passportRecord 
          : passportRecord.plaintext || JSON.stringify(passportRecord);
      }

      return null;
    } catch (err: any) {
      // Permission denied or no records - this is expected
      if (err?.message?.includes('INVALID_PARAMS') || err?.message?.includes('permission')) {
        return null;
      }
      console.warn('[ClaimPoints] Error getting passport record:', err?.message);
      return null;
    }
  }, [adapter]);

  /**
   * Claim points after successful social network verification
   * 
   * @param provider - Provider name (discord, telegram, solana, etc.)
   * @param commitment - Commitment hash from backend verification (format: "0x...field")
   * @param points - Points to claim (from backend verification score)
   * @returns ClaimResult with success status and txId
   */
  const claimPoints = useCallback(async (
    provider: string,
    commitment: string,
    points: number
  ): Promise<ClaimResult> => {
    if (!publicKey || !adapter?.requestTransaction) {
      return {
        success: false,
        error: 'Wallet not connected or does not support transactions'
      };
    }

    setClaiming(true);
    setError(null);

    try {
      // 1. Get platform ID
      const platformId = providerToPlatformId(provider);
      if (platformId === 0) {
        throw new Error(`Unsupported provider: ${provider}`);
      }

      // 2. Get passport record
      const passportRecord = await getPassportRecord();
      if (!passportRecord) {
        throw new Error('Could not complete claim. Please try again.');
      }

      // 3. Format commitment for Aleo (ensure it ends with 'field')
      let formattedCommitment = commitment;
      if (!commitment.endsWith('field')) {
        // If commitment is hex, convert to field format
        if (commitment.startsWith('0x')) {
          formattedCommitment = commitment.slice(2) + 'field';
        } else {
          formattedCommitment = commitment + 'field';
        }
      }

      // 4. Convert points to u64 format (contract expects whole points, e.g. 80u64)
      const pointsU64 = `${Math.round(points)}u64`;

      console.log('[ClaimPoints] Claiming points:', {
        provider,
        platformId,
        commitment: formattedCommitment.substring(0, 20) + '...',
        points: pointsU64
      });

      // 5. Create transaction for claim_point (all sensitive inputs private; author/platform/points encrypted on-chain)
      const transaction = Transaction.createTransaction(
        publicKey,
        network,
        PROGRAM_ID,
        'claim_point',
        [
          passportRecord,
          `${platformId}u8`,
          formattedCommitment,
          pointsU64
        ],
        1_000_000
      );

      // 6. Request transaction from wallet (with retry like usePassport / tipzo)
      console.log('[ClaimPoints] Requesting transaction...');
      const txId = await requestTransactionWithRetry(adapter, transaction, { timeout: 30_000, maxRetries: 3 });

      console.log('[ClaimPoints] ✅ Transaction submitted:', txId);
      setLastClaimTxId(txId);

      return {
        success: true,
        txId
      };

    } catch (err: any) {
      const errorMessage = err?.message || 'Failed to claim points';
      console.error('[ClaimPoints] ❌ Error:', errorMessage);
      setError(errorMessage);

      return {
        success: false,
        error: errorMessage
      };
    } finally {
      setClaiming(false);
    }
  }, [publicKey, adapter, network, getPassportRecord]);

  /**
   * Check if user can claim points (has wallet and passport)
   */
  const canClaim = useCallback(async (): Promise<boolean> => {
    if (!publicKey || !adapter?.requestTransaction) {
      return false;
    }

    const passport = await getPassportRecord();
    return passport !== null;
  }, [publicKey, adapter, getPassportRecord]);

  return {
    claimPoints,
    canClaim,
    claiming,
    lastClaimTxId,
    error,
    getPassportRecord
  };
};

export default useClaimPoints;
