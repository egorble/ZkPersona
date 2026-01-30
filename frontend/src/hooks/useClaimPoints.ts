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
import { requestTransactionWithRetry, requestRecordsWithRetry } from '../utils/walletUtils';

interface WalletAdapterExtras {
  requestTransaction?: (tx: Transaction) => Promise<string>;
  requestRecords?: (programId: string) => Promise<any[]>;
  decrypt?: (ciphertext: string) => Promise<any>;
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
   * Get user's passport record from wallet (using requestRecords, like tipzo)
   * Returns CIPHERTEXT (record1...) which Transaction.createTransaction expects for private records
   * Only decrypts temporarily to verify it's a passport record
   */
  const getPassportRecord = useCallback(async (): Promise<string | null> => {
    if (!adapter?.requestRecords) {
      console.warn('[ClaimPoints] Wallet does not support requestRecords');
      return null;
    }

    try {
      // Use retry utility for better reliability
      // Note: We use the program ID without address prefix for records request if the full ID fails
      let records: any[] = [];
      try {
        console.log(`[ClaimPoints] Requesting records for ${PROGRAM_ID}`);
        records = await requestRecordsWithRetry(adapter, PROGRAM_ID, { timeout: 30_000, maxRetries: 3 }) as any[];
      } catch (err) {
        // Fallback: try just the program name if the full ID failed
        const shortProgramName = PROGRAM_ID.split('.').slice(1).join('.');
        if (shortProgramName && shortProgramName !== PROGRAM_ID) {
           console.log(`[ClaimPoints] Retrying with short program name: ${shortProgramName}`);
           try {
             records = await requestRecordsWithRetry(adapter, shortProgramName, { timeout: 30_000, maxRetries: 3 }) as any[];
           } catch (e) {
             console.warn('[ClaimPoints] Failed with short program name too');
             throw err;
           }
        } else {
           throw err;
        }
      }
      
      if (!records || records.length === 0) {
        console.warn('[ClaimPoints] No records found in wallet');
        return null;
      }

      console.log(`[ClaimPoints] Checking ${records.length} records for passport...`);

      // Find passport record - return CIPHERTEXT for Transaction.createTransaction
      for (const record of records) {
        let ciphertextToReturn: string | null = null;
        let plaintextToCheck: string | null = null;
        
        // Extract ciphertext
        if (typeof record === 'string' && record.startsWith('record1')) {
          ciphertextToReturn = record;
        } else if (typeof record === 'object' && record !== null) {
          const obj = record as Record<string, unknown>;
          ciphertextToReturn = 
            (typeof obj.ciphertext === 'string' && obj.ciphertext) ||
            (typeof obj.record === 'string' && obj.record) ||
            (typeof obj.data === 'string' && obj.data) ||
            '';
        }

        if (!ciphertextToReturn || !ciphertextToReturn.startsWith('record1')) {
          continue;
        }

        // Decrypt to verify it's a passport (but return ciphertext)
        if (adapter.decrypt) {
          try {
            const decrypted = await adapter.decrypt(ciphertextToReturn);
            plaintextToCheck = typeof decrypted === 'string' ? decrypted : JSON.stringify(decrypted);
          } catch (decryptErr) {
            console.warn('[ClaimPoints] Failed to decrypt record:', decryptErr);
            continue;
          }
        } else {
          // No decrypt - can't verify, skip
          console.warn('[ClaimPoints] No decrypt method available, skipping record verification');
          continue;
        }

        // Check if this is a passport record (has total_stamps and humanity_score)
        if (plaintextToCheck && plaintextToCheck.includes('total_stamps') && plaintextToCheck.includes('humanity_score')) {
          console.log('[ClaimPoints] Found passport record (returning ciphertext for transaction)');
          return ciphertextToReturn; // Return CIPHERTEXT for Transaction.createTransaction
        }
      }

      console.warn('[ClaimPoints] No passport record found in wallet records');
      return null;
    } catch (err: any) {
      if (err?.message?.includes('INVALID_PARAMS') || err?.message?.includes('permission')) {
        console.warn('[ClaimPoints] Permission denied or invalid params');
        return null;
      }
      console.error('[ClaimPoints] Error getting passport record:', err);
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

      // 5. Create transaction
      const transaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.TestnetBeta, // Use TestnetBeta to match wallet network
        PROGRAM_ID,
        'claim_verification',
        [`${platformId}u8`, commitment, pointsU64],
        50_000, // fee
        false // private fee
      );

      // 6. Request transaction from wallet (with retry like usePassport / tipzo)
      console.log('[ClaimPoints] Requesting transaction...');
      console.log(`[ClaimPoints] Program: ${PROGRAM_ID}, Function: claim_verification`);
      console.log(`[ClaimPoints] Inputs: [${platformId}u8, ${commitment}, ${pointsU64}]`);
      
      const txId = await requestTransactionWithRetry(adapter, transaction, { timeout: 60_000, maxRetries: 3 });

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
