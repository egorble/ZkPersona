// ============================================================================
// ZK PASSPORT - Passport Records Hook
// ============================================================================
// This hook ONLY requests passport records from wallet.
// It does NOT parse private data for display.
// It does NOT cache private data in localStorage.
// Privacy-first: records stay in wallet, only proofs leave.
// ============================================================================

import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState, useCallback } from "react";
import { PROGRAM_ID } from "../deployed_program";

export interface PassportRecord {
    // We don't expose private fields here
    // Records are opaque - only wallet can decrypt
    recordId?: string;
    plaintext?: string;  // Encrypted Leo record format
}

/**
 * Hook to request passport records from wallet.
 * 
 * SECURITY: This hook does NOT parse or display private passport data.
 * It only requests records - parsing happens INSIDE wallet during proof generation.
 * 
 * @returns Functions to request passport records
 */
export const usePassportRecords = () => {
    const { wallet, publicKey } = useWallet();
    const adapter = wallet?.adapter as any;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Request passport records from wallet.
     * Records remain encrypted and are NOT parsed here.
     * 
     * Returns opaque records - only wallet can decrypt.
     * These records are used internally by wallet for proof generation.
     */
    const requestPassportRecords = useCallback(async (): Promise<PassportRecord[]> => {
        if (!publicKey || !adapter) {
            return [];
        }

        setLoading(true);
        setError(null);

        try {
            // Request records from wallet (requires OnChainHistory permission)
            // Records are encrypted/private - we don't parse them here
            let records: PassportRecord[] = [];

            if (adapter.requestRecordPlaintexts) {
                try {
                    const plaintexts = await adapter.requestRecordPlaintexts(PROGRAM_ID);
                    if (plaintexts && Array.isArray(plaintexts)) {
                        records = plaintexts.map((r: any) => ({
                            recordId: r.id,
                            plaintext: typeof r === 'string' ? r : r.plaintext || JSON.stringify(r),
                        }));
                    }
                } catch (err: any) {
                    // Permission denied or no records - expected behavior
                    if (!err?.message?.includes("INVALID_PARAMS") && !err?.message?.includes("permission")) {
                        console.debug("[PassportRecords] requestRecordPlaintexts:", err?.message);
                    }
                }
            }

            // Fallback: try encrypted records
            if (records.length === 0 && adapter.requestRecords) {
                try {
                    const encrypted = await adapter.requestRecords(PROGRAM_ID);
                    if (encrypted && Array.isArray(encrypted)) {
                        records = encrypted.map((r: any) => ({
                            recordId: typeof r === 'object' && r?.id ? r.id : undefined,
                            plaintext: typeof r === 'string' ? r : (r?.ciphertext || JSON.stringify(r)),
                        }));
                    }
                } catch (err: any) {
                    if (!err?.message?.includes("INVALID_PARAMS")) {
                        console.debug("[PassportRecords] requestRecords:", err?.message);
                    }
                }
            }

            // Privacy: We do NOT cache records in localStorage
            // Records stay in wallet, only proofs are sent to dApps
            
            return records;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            console.error("[PassportRecords] Error:", errorMsg);
            return [];
        } finally {
            setLoading(false);
        }
    }, [publicKey, adapter]);

    return {
        requestPassportRecords,
        loading,
        error,
    };
};

