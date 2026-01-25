// ============================================================================
// ZK PASSPORT - Aleo API (Public Data Only)
// ============================================================================
// This module ONLY reads PUBLIC metadata (stamp definitions, admin permissions).
// 
// CRITICAL: It does NOT read private passport data or scores.
// Private data stays in wallet - only proofs are public.
// ============================================================================

import { WalletAdapterNetwork } from "@demox-labs/aleo-wallet-adapter-base";
import { PROGRAM_ID } from "../deployed_program";

const network = WalletAdapterNetwork.TestnetBeta;

// RPC endpoints for Aleo testnet
const ALEO_RPC_URL = "https://api.explorer.aleo.org/v1";
const ALEO_TESTNET_RPC = "https://api.explorer.aleo.org/v1/testnet3";

export interface PublicPassport {
    owner: string;
    total_stamps: number;
    total_points: number;
    humanity_score: number;
    created_at: number;
    updated_at: number;
}

export interface PublicStamp {
    stamp_id: number;
    name: string;
    description: string;
    category: string;
    points: number;
    is_active: boolean;
    created_at: number;
}

// Parse Leo struct response from RPC
function parseStructResponse(response: string): Record<string, any> {
    try {
        // Leo struct format: { field1: value1, field2: value2, ... }
        const parsed: Record<string, any> = {};
        const matches = response.matchAll(/(\w+):\s*([^,}]+)/g);
        
        for (const match of matches) {
            const key = match[1];
            let value = match[2].trim();
            
            // Parse different types
            if (value.endsWith('u32')) {
                parsed[key] = parseInt(value.replace('u32', ''), 10);
            } else if (value.endsWith('u64')) {
                parsed[key] = parseInt(value.replace('u64', ''), 10);
            } else if (value.endsWith('field')) {
                parsed[key] = value.replace('field', '').trim();
            } else if (value === 'true' || value === 'false') {
                parsed[key] = value === 'true';
            } else if (value.startsWith('aleo1')) {
                parsed[key] = value;
            } else {
                parsed[key] = value;
            }
        }
        
        return parsed;
    } catch (error) {
        console.error("[AleoAPI] Failed to parse struct response:", error);
        return {};
    }
}

// Call view function via RPC
async function callViewFunction(
    functionName: string,
    inputs: any[]
): Promise<any> {
    try {
        const rpcUrl = `${ALEO_TESTNET_RPC}/program/${PROGRAM_ID}/execute/${functionName}`;
        
        // Convert inputs to proper format
        const formattedInputs = inputs.map(input => {
            if (typeof input === 'string' && input.startsWith('aleo1')) {
                return input; // Address
            } else if (typeof input === 'number') {
                return `${input}u32`; // Assume u32 for numbers
            } else {
                return String(input);
            }
        });
        
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                inputs: formattedInputs,
            }),
        });
        
        if (!response.ok) {
            // Handle 404 specifically (contract not deployed) - silent
            if (response.status === 404) {
                // Don't log 404s - they're expected when contract is not deployed
                return null;
            }
            // Only log non-404 errors
            console.warn(`[AleoAPI] RPC call failed (${response.status}): ${functionName} - ${response.statusText}`);
            return null;
        }
        
        const data = await response.json();
        return data;
    } catch (error) {
        // Don't log 404s or expected errors
        if (error instanceof Error && !error.message.includes("404") && !error.message.includes("RPC call failed")) {
            console.debug(`[AleoAPI] Failed to call ${functionName}:`, error.message);
        }
        return null;
    }
}

// ============================================================================
// PUBLIC METADATA FUNCTIONS ONLY
// ============================================================================
// These functions read PUBLIC stamp definitions and admin permissions.
// They do NOT read private passport data - privacy is preserved.
// ============================================================================

// NOTE: getPassportPublic REMOVED - passport data is private
// Passports are stored as private records, not public mappings.
// Access is controlled via zero-knowledge proofs, not public reads.

// Call view function to get stamp (public read from mapping)
export const getStampPublic = async (stampId: number): Promise<PublicStamp | null> => {
    try {
        const result = await callViewFunction("get_stamp", [stampId]);
        
        if (!result || !result.output) {
            return null;
        }
        
        const parsed = parseStructResponse(result.output);
        
        // Note: name, description, category are encrypted fields, need decryption
        // For now, return basic info
        return {
            stamp_id: parsed.stamp_id || stampId,
            name: fieldToString(parsed.name || "0field"), // Decrypt in future
            description: fieldToString(parsed.description || "0field"),
            category: fieldToString(parsed.category || "0field"),
            points: parsed.points || 0,
            is_active: parsed.is_active || false,
            created_at: parsed.created_at || 0,
        };
    } catch (error) {
        // Contract not deployed - return null silently
        return null;
    }
};

// NOTE: hasUserStamp REMOVED - user stamp ownership is private
// Checking if a user has a stamp publicly would violate privacy.
// Proof system verifies stamp ownership without revealing it.

// Get stamp count (view function) - PUBLIC metadata
export const getStampCount = async (): Promise<number> => {
    try {
        // get_stamp_count is a view function with no inputs
        const result = await callViewFunction("get_stamp_count", []);
        
        if (!result || !result.output) {
            return 0;
        }
        
        // Parse u32 output
        const match = String(result.output).match(/(\d+)u32/);
        return match ? parseInt(match[1], 10) : 0;
        } catch (error) {
            // Contract not deployed - return 0 silently
            return 0;
        }
};

// Get stamp metadata (public info only)
export const getStampMetadata = async (stampId: number): Promise<PublicStamp | null> => {
    try {
        const result = await callViewFunction("get_stamp_metadata", [stampId]);
        
        if (!result || !result.output) {
            return null;
        }
        
        const parsed = parseStructResponse(result.output);
        
        return {
            stamp_id: parsed.stamp_id || stampId,
            name: "",  // Name removed from public metadata (privacy)
            description: "",  // Description removed from public metadata
            category: "",  // Category removed from public metadata
            points: parsed.points || 0,
            is_active: parsed.is_active || false,
            created_at: parsed.created_at || 0,
        };
    } catch (error) {
        return null;
    }
};

// Check admin status - PUBLIC (admin addresses are public mappings)
export const checkAdminStatus = async (address: string): Promise<boolean> => {
    try {
        // In ZK system, admin status is still public (authorization needs to be public)
        // But admin cannot see private passport data
        const result = await callViewFunction("check_admin", [address]);
        
        if (!result || result.output === undefined) {
            return false;
        }
        
        return result.output === "true" || result.output === true;
        } catch (error) {
            return false;
        }
};

// Get all stamp metadata (public definitions only)
export const getAllStamps = async (): Promise<PublicStamp[]> => {
    try {
        const stampCount = await getStampCount();
        const stamps: PublicStamp[] = [];
        
        // Fetch each stamp metadata by ID
        for (let i = 1; i <= stampCount; i++) {
            try {
                const stamp = await getStampMetadata(i);
                if (stamp) {
                    stamps.push(stamp);
                }
            } catch (error) {
                console.warn(`[AleoAPI] Failed to fetch stamp ${i}:`, error);
            }
        }
        
        return stamps;
        } catch (error) {
            // Contract not deployed - return empty array silently
            return [];
        }
};

// NOTE: getUserStamps REMOVED - user stamps are private records
// Stamps are issued as private records to user wallets.
// Access is controlled via zero-knowledge proofs in prove_access.
// Public queries of user stamps would violate privacy model.

// Check nullifier - PUBLIC function to prevent replay attacks
export const checkNullifier = async (nullifier: string): Promise<boolean> => {
            try {
        const result = await callViewFunction("check_nullifier", [nullifier]);
        
        if (!result || result.output === undefined) {
            return false;
        }
        
        return result.output === "true" || result.output === true;
        } catch (error) {
        // Contract not deployed - return false silently
        return false;
        }
};

// NOTE: Tasks removed from ZK system
// Task verification happens off-chain before stamp issuance.
// Only stamp issuance is on-chain (as private records).

// ============================================================================
// SUMMARY: What this API provides
// ============================================================================
// PUBLIC METADATA ONLY:
// - getStampCount() - How many stamp types exist
// - getStampMetadata() - Public stamp definitions (points, active status)
// - getAllStamps() - All stamp metadata
// - checkAdminStatus() - Admin permissions (authorization is public)
// - checkNullifier() - Replay attack prevention
//
// REMOVED (Privacy Violations):
// - getPassportPublic() - Passports are private records
// - getUserStamps() - User stamps are private records
// - hasUserStamp() - Stamp ownership is private
//
// ACCESS CONTROL:
// - All passport/stamp access is via zero-knowledge proofs
// - prove_access transition generates proofs locally in wallet
// - Only proofs (public) are exposed, never private data
// ============================================================================

