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
    plaintext?: string;  // Decrypted Leo record format
}

/** For claim_social_stamp the wallet expects record (encrypted "record1..."), not plaintext. */
export interface PassportRecordForClaim {
    record: string | null;   // record1... — use as tx input when present
    plaintext: string | null;
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
            if (records.length === 0 && adapter.requestRecords && publicKey) {
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

    const hasPassport = (s: string) =>
        typeof s === "string" && s.includes("total_stamps") && s.includes("humanity_score");

    /** Get Passport for claim_social_stamp. Prefer record (record1...); fallback plaintext. */
    const requestPassportRecordForClaim = useCallback(async (): Promise<PassportRecordForClaim> => {
        if (!publicKey || !adapter) return { record: null, plaintext: null };
        try {
            if (adapter.requestRecords && adapter.decrypt) {
                const enc = await adapter.requestRecords(PROGRAM_ID);
                if (enc && Array.isArray(enc)) {
                    for (const r of enc) {
                        let cipher = "";
                        if (typeof r === "string" && r.startsWith("record1")) cipher = r;
                        else if (r && typeof r === "object") {
                            const o = r as { record?: string; ciphertext?: string };
                            cipher = (o.ciphertext || o.record) || "";
                        }
                        if (!cipher || !cipher.startsWith("record1")) continue;
                        try {
                            const dec = await adapter.decrypt(cipher);
                            const pt = typeof dec === "string" ? dec : JSON.stringify(dec);
                            if (hasPassport(pt)) return { record: cipher, plaintext: pt };
                        } catch { /* skip */ }
                    }
                }
            }
            if (adapter.requestRecordPlaintexts) {
                const arr = await adapter.requestRecordPlaintexts(PROGRAM_ID);
                if (arr && Array.isArray(arr)) {
                    for (const r of arr) {
                        const pt = typeof r === "string" ? r : (r?.plaintext ?? "");
                        if (typeof pt === "string" && hasPassport(pt)) return { record: null, plaintext: pt };
                    }
                }
            }
        } catch (e) {
            console.warn("[PassportRecords] requestPassportRecordForClaim:", (e as Error)?.message);
        }
        return { record: null, plaintext: null };
    }, [publicKey, adapter]);

    return {
        requestPassportRecords,
        requestPassportRecordForClaim,
        loading,
        error,
    };
};

