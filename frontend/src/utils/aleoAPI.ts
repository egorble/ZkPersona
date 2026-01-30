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

// RPC endpoints: we deploy on Provable testnet
const ALEO_RPC_URL = "https://api.explorer.aleo.org/v1";
const ALEO_TESTNET3_RPC = "https://api.explorer.aleo.org/v1/testnet3";
const PROVABLE_TESTNET_RPC = "https://api.explorer.provable.com/v1/testnet";
// JSON-RPC for getMappingValue (Leo RPC API); Testnet Beta used by Leo Wallet
const ALEO_TESTNETBETA_RPC = "https://testnetbeta.aleorpc.com";

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
    platform_id: number;  // u8 in contract; used to match provider for claim_social_stamp
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
            } else if (value.endsWith('u8')) {
                parsed[key] = parseInt(value.replace('u8', ''), 10);
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
        return {};
    }
}

// Call view function via RPC (Provable REST execute)
// NOTE: get_stamp_metadata / get_stamp do not exist in our program; use getMappingValue instead.
async function callViewFunction(
    functionName: string,
    inputs: any[]
): Promise<any> {
    try {
        const rpcUrl = `${PROVABLE_TESTNET_RPC}/program/${PROGRAM_ID}/execute/${functionName}`;
        
        const formattedInputs = inputs.map(input => {
            if (typeof input === 'string' && input.startsWith('aleo1')) {
                return input;
            } else if (typeof input === 'number') {
                return `${input}u32`;
            } else {
                return String(input);
            }
        });
        
        const response = await fetch(rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ inputs: formattedInputs }),
        });
        
        if (!response.ok) return null;
        return await response.json();
    } catch {
        return null;
    }
}

// getMappingValue via Leo JSON-RPC (program mapping read)
// Tries ALEO_TESTNETBETA_RPC first, then Provable REST (contract may be on Provable testnet).
async function getMappingValue(
    programId: string,
    mappingName: string,
    key: string
): Promise<string | null> {
    try {
        const res = await fetch(ALEO_TESTNETBETA_RPC, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method: 'getMappingValue',
                params: { program_id: programId, mapping_name: mappingName, key },
            }),
        });
        const data = await res.json();
        if (!data.error && data.result !== undefined) {
            const result = typeof data.result === 'string' ? data.result : null;
            if (result) return result;
        }
    } catch {
        // ignore
    }
    // Fallback: Provable REST API (contract may be deployed on Provable testnet)
    try {
        const keyPath = key.replace(/u32$/i, '').replace(/u64$/i, '');
        const url = `${PROVABLE_TESTNET_RPC}/program/${programId}/mapping/${mappingName}/${keyPath}`;
        const r = await fetch(url);
        if (!r.ok) return null;
        const body = await r.json();
        if (typeof body === 'string') return body;
        if (body && typeof body.value === 'string') return body.value;
        if (body && body.result !== undefined) return typeof body.result === 'string' ? body.result : null;
        return null;
    } catch {
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

/** Legacy: get_stamp_count often 404. Prefer getAllStamps (uses getStampMetadata in loop). */
export const getStampCount = async (): Promise<number> => {
    try {
        const result = await callViewFunction("get_stamp_count", []);
        if (!result || !result.output) return 0;
        const match = String(result.output).match(/(\d+)u32/);
        return match ? parseInt(match[1], 10) : 0;
    } catch {
        return 0;
    }
};

// Get stamp metadata via mapping read (getMappingValue RPC).
// Contract has no get_stamp_metadata view; we read mapping "stamps" directly.
export const getStampMetadata = async (stampId: number): Promise<PublicStamp | null> => {
    try {
        const raw = await getMappingValue(PROGRAM_ID, "stamps", `${stampId}u32`);
        if (!raw || typeof raw !== 'string' || raw.length < 2) return null;

        const parsed = parseStructResponse(raw);
        const points = typeof parsed.points === 'number' && !Number.isNaN(parsed.points) ? parsed.points : 0;
        const created = typeof parsed.created_at === 'number' && !Number.isNaN(parsed.created_at) ? parsed.created_at : 0;
        const sid = typeof parsed.stamp_id === 'number' && !Number.isNaN(parsed.stamp_id) ? parsed.stamp_id : stampId;
        const platformId = typeof parsed.platform_id === 'number' && !Number.isNaN(parsed.platform_id) ? parsed.platform_id : 0;

        return {
            stamp_id: sid,
            platform_id: platformId,
            name: "",
            description: "",
            category: "",
            points,
            is_active: parsed.is_active === true || parsed.is_active === 'true',
            created_at: created,
        };
    } catch {
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
// Contract initialize() creates stamps 1..9 only. Cap at 9 to avoid 404 on stamps/10.
const MAX_STAMP_IDS = 9;

export const getAllStamps = async (): Promise<PublicStamp[]> => {
    const stamps: PublicStamp[] = [];
    try {
        const first = await getStampMetadata(1);
        if (!first) return []; // Program not deployed or no stamps — avoid repeated 404s
        stamps.push(first);
        for (let i = 2; i <= MAX_STAMP_IDS; i++) {
            const stamp = await getStampMetadata(i);
            if (stamp) stamps.push(stamp);
            else break;
        }
        return stamps;
    } catch {
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

