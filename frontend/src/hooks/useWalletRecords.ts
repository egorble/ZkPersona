import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { useState, useCallback } from "react";

export interface PassportRecord {
    owner: string;
    total_stamps: number;
    total_points: number;
    humanity_score: number;
    created_at: number;
    updated_at: number;
}

export interface UserStampRecord {
    passport_owner: string;
    stamp_id: number;
    earned_at: number;
    verification_hash: string;
    is_verified: boolean;
}

// Helper to parse Leo UserStamp record
function parseUserStampRecord(recordString: string): UserStampRecord | null {
    try {
        // Leo record format for UserStamp (if stored as record):
        // {
        //   owner: aleo1...,
        //   passport_owner: aleo1...,
        //   stamp_id: 5u32,
        //   earned_at: 1234567890u64,
        //   verification_hash: 123field,
        //   is_verified: true,
        //   _nonce: ...
        // }
        
        const ownerMatch = recordString.match(/passport_owner:\s*(aleo1[a-z0-9]+)/);
        const stampIdMatch = recordString.match(/stamp_id:\s*(\d+)u32/);
        const earnedAtMatch = recordString.match(/earned_at:\s*(\d+)u64/);
        const hashMatch = recordString.match(/verification_hash:\s*(\d+field|[a-f0-9]+)/);
        const verifiedMatch = recordString.match(/is_verified:\s*(true|false)/);
        
        if (!ownerMatch || !stampIdMatch || !earnedAtMatch || !hashMatch || !verifiedMatch) {
            return null;
        }
        
        return {
            passport_owner: ownerMatch[1],
            stamp_id: parseInt(stampIdMatch[1], 10),
            earned_at: parseInt(earnedAtMatch[1], 10),
            verification_hash: hashMatch[1],
            is_verified: verifiedMatch[1] === 'true',
        };
    } catch (error) {
        console.error("[UserStampRecords] Failed to parse record:", error);
        return null;
    }
}

export const useWalletRecords = () => {
    const { wallet, publicKey } = useWallet();
    const adapter = wallet?.adapter as any;
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [isLoading, setIsLoading] = useState(false);

    const fetchPassportRecords = useCallback(async (programId: string): Promise<PassportRecord[]> => {
        if (!publicKey || !adapter) {
            return [];
        }
        
        setIsLoading(true);
        try {
            let records: Array<{ id?: string; plaintext: string }> = [];
            
            // Try requestRecordPlaintexts first (requires OnChainHistory permission)
            // Note: requestRecordPlaintexts may need additional parameters or may not be available
            if (adapter.requestRecordPlaintexts) {
                try {
                    // Try with programId only first
                    records = await adapter.requestRecordPlaintexts(programId);
                    if (records && records.length > 0) {
                        setHasPermission(true);
                        console.log(`✅ [PassportRecords] Fetched ${records.length} records via requestRecordPlaintexts`);
                    }
                } catch (error: any) {
                    // Silently handle INVALID_PARAMS - this is expected if permission not granted or method signature changed
                    if (error?.message?.includes("INVALID_PARAMS") || error?.message?.includes("permission")) {
                        // Don't log this as it's expected behavior
                        setHasPermission(false);
                    } else {
                        // Only log unexpected errors
                        console.debug("[PassportRecords] requestRecordPlaintexts failed:", error?.message || error);
                    }
                }
            }
            
            // Fallback: try requestRecords (encrypted)
            if (records.length === 0 && adapter.requestRecords) {
                try {
                    // requestRecords may need different parameters
                    const encryptedRecords = await adapter.requestRecords(programId);
                    if (encryptedRecords && encryptedRecords.length > 0) {
                        console.log(`✅ [PassportRecords] Fetched ${encryptedRecords.length} encrypted records`);
                        // Try to decrypt if decrypt method available
                        if (adapter.decrypt) {
                            const decryptedRecords: Array<{ id?: string; plaintext: string }> = [];
                            for (const record of encryptedRecords) {
                                try {
                                    if (typeof record === "string" && record.startsWith("record1")) {
                                        const decrypted = await adapter.decrypt(record);
                                        if (typeof decrypted === "string") {
                                            decryptedRecords.push({ plaintext: decrypted });
                                        } else {
                                            decryptedRecords.push({ plaintext: JSON.stringify(decrypted) });
                                        }
                                    } else if (typeof record === "object" && record !== null) {
                                        const obj = record as Record<string, unknown>;
                                        const ciphertext =
                                            (typeof obj.ciphertext === "string" && obj.ciphertext) ||
                                            (typeof obj.record === "string" && obj.record) ||
                                            "";
                                        if (ciphertext && ciphertext.startsWith("record1")) {
                                            const decrypted = await adapter.decrypt(ciphertext);
                                            decryptedRecords.push({
                                                id: typeof obj.id === "string" ? obj.id : undefined,
                                                plaintext: typeof decrypted === "string" ? decrypted : JSON.stringify(decrypted),
                                            });
                                        }
                                    }
                                } catch (decryptErr) {
                                    console.warn("[PassportRecords] Failed to decrypt record:", decryptErr);
                                }
                            }
                            records = decryptedRecords;
                            if (records.length > 0) {
                                setHasPermission(true);
                            }
                        }
                    }
                } catch (error: any) {
                    // INVALID_PARAMS is expected - don't log
                    if (!error?.message?.includes("INVALID_PARAMS")) {
                        console.debug("[PassportRecords] requestRecords failed:", error?.message || error);
                    }
                }
            }
            
            if (!records || records.length === 0) {
                if (hasPermission === null) {
                    setHasPermission(false);
                }
                return [];
            }
            
            // Parse records
            const parsedRecords: PassportRecord[] = records
                .map(record => parsePassportRecord(record.plaintext || String(record)))
                .filter(Boolean) as PassportRecord[];
            
            console.log(`✅ [PassportRecords] Parsed ${parsedRecords.length} passport records from wallet`);
            return parsedRecords;
            
        } catch (error) {
            console.error("❌ [PassportRecords] Error fetching records:", error);
            setHasPermission(false);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, adapter, hasPermission]);

    const fetchUserStampRecords = useCallback(async (programId: string): Promise<UserStampRecord[]> => {
        if (!publicKey || !adapter) {
            return [];
        }
        
        setIsLoading(true);
        try {
            let records: Array<{ id?: string; plaintext: string }> = [];
            
            // Try requestRecordPlaintexts first (requires OnChainHistory permission)
            if (adapter.requestRecordPlaintexts) {
                try {
                    records = await adapter.requestRecordPlaintexts(programId);
                    if (records && records.length > 0) {
                        console.log(`✅ [UserStampRecords] Fetched ${records.length} records via requestRecordPlaintexts`);
                    }
                } catch (error: any) {
                    // INVALID_PARAMS is expected - don't log
                    if (!error?.message?.includes("INVALID_PARAMS") && !error?.message?.includes("permission")) {
                        console.debug("[UserStampRecords] requestRecordPlaintexts failed:", error?.message || error);
                    }
                }
            }
            
            // Fallback: try requestRecords (encrypted)
            if (records.length === 0 && adapter.requestRecords) {
                try {
                    const encryptedRecords = await adapter.requestRecords(programId);
                    if (encryptedRecords && encryptedRecords.length > 0) {
                        console.log(`✅ [UserStampRecords] Fetched ${encryptedRecords.length} encrypted records`);
                        // Try to decrypt if decrypt method available
                        if (adapter.decrypt) {
                            const decryptedRecords: Array<{ id?: string; plaintext: string }> = [];
                            for (const record of encryptedRecords) {
                                try {
                                    if (typeof record === "string" && record.startsWith("record1")) {
                                        const decrypted = await adapter.decrypt(record);
                                        if (typeof decrypted === "string") {
                                            decryptedRecords.push({ plaintext: decrypted });
                                        } else {
                                            decryptedRecords.push({ plaintext: JSON.stringify(decrypted) });
                                        }
                                    } else if (typeof record === "object" && record !== null) {
                                        const obj = record as Record<string, unknown>;
                                        const ciphertext =
                                            (typeof obj.ciphertext === "string" && obj.ciphertext) ||
                                            (typeof obj.record === "string" && obj.record) ||
                                            "";
                                        if (ciphertext && ciphertext.startsWith("record1")) {
                                            const decrypted = await adapter.decrypt(ciphertext);
                                            decryptedRecords.push({
                                                id: typeof obj.id === "string" ? obj.id : undefined,
                                                plaintext: typeof decrypted === "string" ? decrypted : JSON.stringify(decrypted),
                                            });
                                        }
                                    }
                                } catch (decryptErr) {
                                    console.warn("[UserStampRecords] Failed to decrypt record:", decryptErr);
                                }
                            }
                            records = decryptedRecords;
                        }
                    }
                } catch (error: any) {
                    // INVALID_PARAMS is expected - don't log
                    if (!error?.message?.includes("INVALID_PARAMS")) {
                        console.debug("[UserStampRecords] requestRecords failed:", error?.message || error);
                    }
                }
            }
            
            if (!records || records.length === 0) {
                return [];
            }
            
            // Parse records - filter for UserStamp records
            const parsedRecords: UserStampRecord[] = records
                .map(record => parseUserStampRecord(record.plaintext || String(record)))
                .filter(Boolean) as UserStampRecord[];
            
            // Filter for current user's stamps only
            const userStamps = parsedRecords.filter(
                stamp => stamp.passport_owner.toLowerCase() === publicKey.toLowerCase() && stamp.is_verified
            );
            
            console.log(`✅ [UserStampRecords] Parsed ${userStamps.length} user stamp records from wallet`);
            return userStamps;
            
        } catch (error) {
            console.error("❌ [UserStampRecords] Error fetching records:", error);
            return [];
        } finally {
            setIsLoading(false);
        }
    }, [publicKey, adapter]);

    return { 
        fetchPassportRecords, 
        fetchUserStampRecords,
        hasPermission, 
        isLoading 
    };
};

// Helper to parse Leo Passport record
function parsePassportRecord(recordString: string): PassportRecord | null {
    try {
        // Leo record format for Passport:
        // {
        //   owner: aleo1...,
        //   total_stamps: 5u32,
        //   total_points: 100u64,
        //   humanity_score: 50u64,
        //   issued_at: 1234567890u64,
        //   updated_at: 1234567890u64,
        //   _nonce: ...
        // }
        
        const ownerMatch = recordString.match(/owner:\s*(aleo1[a-z0-9]+)/);
        const stampsMatch = recordString.match(/total_stamps:\s*(\d+)u32/);
        const pointsMatch = recordString.match(/total_points:\s*(\d+)u64/);
        const scoreMatch = recordString.match(/humanity_score:\s*(\d+)u64/);
        // Try both issued_at and created_at for compatibility
        const createdMatch = recordString.match(/(?:issued_at|created_at):\s*(\d+)u64/);
        const updatedMatch = recordString.match(/updated_at:\s*(\d+)u64/);
        
        if (!ownerMatch || !stampsMatch || !pointsMatch || !scoreMatch || !createdMatch || !updatedMatch) {
            return null;
        }
        
        return {
            owner: ownerMatch[1],
            total_stamps: parseInt(stampsMatch[1], 10),
            total_points: parseInt(pointsMatch[1], 10),
            humanity_score: parseInt(scoreMatch[1], 10),
            created_at: parseInt(createdMatch[1], 10),
            updated_at: parseInt(updatedMatch[1], 10),
        };
    } catch (error) {
        console.error("[PassportRecords] Failed to parse record:", error);
        return null;
    }
}

