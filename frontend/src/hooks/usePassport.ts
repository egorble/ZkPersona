// ============================================================================
// ZK PASSPORT - Passport Hook (Private Records Only)
// ============================================================================
// This hook ONLY requests passport records from wallet.
// 
// CRITICAL: It does NOT parse or display private passport data.
// It does NOT read passport via RPC API.
// It does NOT cache private data in localStorage.
// 
// Privacy-first: passport data stays in wallet, only proofs leave.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletAdapterNetwork, Transaction } from "@demox-labs/aleo-wallet-adapter-base";
import { PROGRAM_ID } from "../deployed_program";
import { usePassportRecords } from "./usePassportRecords";
import { logger } from "../utils/logger";
import { generateRandomNonce } from "../utils/aleo";

type WalletAdapterExtras = {
    requestTransaction?: (tx: Transaction) => Promise<string>;
};

export interface PassportRecord {
    // We don't expose private fields here
    // Records are opaque - only wallet can decrypt
    recordId?: string;
    plaintext?: string;
}

/**
 * Hook for passport operations.
 * 
 * SECURITY MODEL:
 * - Passport records stay in wallet (private)
 * - No parsing of private data for display
 * - No RPC reading of passport state
 * - No localStorage caching of private data
 * - Only proofs (public) are exposed
 */
export const usePassport = () => {
    const { publicKey, wallet } = useWallet();
    const adapter = wallet?.adapter as unknown as WalletAdapterExtras | undefined;
    const network = WalletAdapterNetwork.TestnetBeta;
    const { requestPassportRecords } = usePassportRecords();
    
    const [hasPassport, setHasPassport] = useState(false);
    const [loading, setLoading] = useState(false);

    /**
     * Create passport - returns private Passport record to wallet
     */
    const createPassport = async (): Promise<string | null> => {
        if (!publicKey || !adapter?.requestTransaction) {
            throw new Error("Wallet not connected");
        }

        setLoading(true);
        try {
            logger.user.createPassport(publicKey);

            // Generate nonce client-side for true randomness
            const nonce = generateRandomNonce();

            // Create passport transition returns PassportRecord (private)
            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "create_passport",
                [nonce],  // Public nonce for nullifier generation
                50000,
                false
            );

            const txId = await adapter.requestTransaction(transaction);
            
            if (txId) {
                logger.transaction.confirmed(txId);
                // PassportRecord is returned to wallet as private record
                // Privacy preserved: no public state, no mapping
                setHasPassport(true);
                return txId;
            }
            
            return null;
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            throw error;
        } finally {
            setLoading(false);
        }
    };

    /**
     * Check if user has passport (wallet records only)
     * Does NOT parse private data - just checks if record exists
     */
    const checkPassport = useCallback(async () => {
        if (!publicKey) {
            setHasPassport(false);
            return;
        }

        try {
            const records = await requestPassportRecords();
            setHasPassport(records.length > 0);
            
            // Privacy: We do NOT parse or cache private passport data
            // Privacy: We do NOT read passport via RPC API
            // Privacy: We do NOT store private data in localStorage
        } catch (error: any) {
            // Silently handle wallet not connected errors
            if (error?.name === 'WalletNotConnectedError' || error?.message?.includes('WalletNotConnected')) {
                console.debug("[usePassport] Wallet not connected, skipping passport check");
                setHasPassport(false);
                return;
            }
            console.error("[usePassport] Error checking passport:", error);
            setHasPassport(false);
        }
    }, [publicKey, requestPassportRecords]);

    useEffect(() => {
        if (publicKey) {
            checkPassport();
        } else {
            setHasPassport(false);
        }
    }, [publicKey, checkPassport]);

    return {
        hasPassport,  // Boolean only - does user have a passport record?
        loading,
        createPassport,
        checkPassport,
        // REMOVED: passport data - private, stays in wallet
        // REMOVED: userStamps - private, stays in wallet
        // REMOVED: fetchPassport via RPC - violates privacy model
    };
};
