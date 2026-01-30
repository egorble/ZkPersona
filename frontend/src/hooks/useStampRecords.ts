// ============================================================================
// ZK PASSPORT - Stamp Records Hook
// ============================================================================
// This hook ONLY requests stamp records from wallet.
// It does NOT parse private stamp data for display.
// Privacy-first: records stay in wallet, only proofs leave.
// ============================================================================

import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState, useCallback } from "react";
import { PROGRAM_ID } from "../deployed_program";
import { requestRecordsWithRetry } from "../utils/walletUtils";

export interface StampRecord {
    // We don't expose private fields here
    // Records are opaque - only wallet can decrypt
    recordId?: string;
    plaintext?: string;  // Encrypted Leo record format
}

/**
 * Hook to request stamp records from wallet.
 * 
 * SECURITY: This hook does NOT parse or display private stamp data.
 * It only requests records - parsing happens INSIDE wallet during proof generation.
 * 
 * @returns Functions to request stamp records
 */
export const useStampRecords = () => {
    const { wallet, publicKey } = useWallet();
    const adapter = wallet?.adapter as any;
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    /**
     * Request stamp records from wallet.
     * Records remain encrypted and are NOT parsed here.
     */
    const requestStampRecords = useCallback(async (): Promise<StampRecord[]> => {
        if (!publicKey || !adapter) {
            return [];
        }

        setLoading(true);
        setError(null);

        try {
            let records: StampRecord[] = [];

            if (adapter.requestRecordPlaintexts) {
                try {
                    console.log(`[StampRecords] Requesting records for program: ${PROGRAM_ID}`);
                    const plaintexts = await adapter.requestRecordPlaintexts(PROGRAM_ID);
                    if (plaintexts && Array.isArray(plaintexts)) {
                        records = plaintexts.map((r: any) => ({
                            recordId: r.id,
                            plaintext: typeof r === 'string' ? r : r.plaintext || JSON.stringify(r),
                        }));
                    }
                } catch (err: any) {
                    if (!err?.message?.includes("INVALID_PARAMS") && !err?.message?.includes("permission")) {
                        console.debug("[StampRecords] requestRecordPlaintexts:", err?.message);
                    }
                }
            }

            // Fallback: try encrypted records
            if (records.length === 0 && adapter.requestRecords) {
                try {
                    const encrypted = await requestRecordsWithRetry(adapter, PROGRAM_ID, { timeout: 30_000, maxRetries: 3 }) as any[];
                    if (encrypted && Array.isArray(encrypted)) {
                        records = encrypted.map((r: any) => ({
                            recordId: typeof r === 'object' && r?.id ? r.id : undefined,
                            plaintext: typeof r === 'string' ? r : (r?.ciphertext || JSON.stringify(r)),
                        }));
                    }
                } catch (err: any) {
                    if (!err?.message?.includes("INVALID_PARAMS")) {
                        console.debug("[StampRecords] requestRecords:", err?.message);
                    }
                }
            }

            // Privacy: We do NOT cache records in localStorage
            // Privacy: We do NOT parse or display private stamp data
            
            return records;
        } catch (err) {
            const errorMsg = err instanceof Error ? err.message : String(err);
            setError(errorMsg);
            console.error("[StampRecords] Error:", errorMsg);
            return [];
        } finally {
            setLoading(false);
        }
    }, [publicKey, adapter]);

    return {
        requestStampRecords,
        loading,
        error,
    };
};

