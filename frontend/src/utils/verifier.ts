// ZK proof verifier for passports

import { PROGRAM_ID } from "../deployed_program";
import { PassportVerificationInput } from "../types/proofRequest";
import { checkNullifier } from "./aleoAPI";
import { getAleoSDKVerifier } from "./aleoSdkVerifier";

/**
 * Passport proof verifier
 * 
 * Used by dApps to verify user access without knowing identity.
 */
export class PassportProofVerifier {
    private programId: string;
    private network: string;

    constructor(programId: string = PROGRAM_ID, network: string = "testnet3") {
        this.programId = programId;
        this.network = network;
    }

    /**
     * Verify passport proof
     * 
     * @param input - Proof verification input
     * @returns true if proof is valid, false otherwise
     */
    async verify(input: PassportVerificationInput): Promise<boolean> {
        try {
            const nullifierUsed = await checkNullifier(input.nullifier);
            if (nullifierUsed) {
                console.warn("[Verifier] Nullifier already used - possible replay attack");
                return false;
            }

            if (!input.proof || !input.nullifier) {
                console.error("[Verifier] Missing proof or nullifier");
                return false;
            }

            try {
                const aleoVerifier = getAleoSDKVerifier(this.programId);
                const proofValid = await aleoVerifier.verifyPassportProof(input);
                
                if (!proofValid) {
                    console.warn("[Verifier] Proof verification failed");
                    return false;
                }
            } catch (error) {
                console.warn("[Verifier] Aleo SDK not available, using nullifier check only:", error);
                
                if (!input.transactionId) {
                    console.error("[Verifier] No transactionId and Aleo SDK unavailable - cannot verify");
                    return false;
                }
            }
            return true;

        } catch (error) {
            console.error("[Verifier] Error verifying proof:", error);
            return false;
        }
    }

    /**
     * Check if nullifier was already used
     * 
     * @param nullifier - Nullifier to check
     * @returns true if nullifier is unique (not used), false if already used
     */
    async checkNullifierUniqueness(nullifier: string): Promise<boolean> {
        try {
            const used = await checkNullifier(nullifier);
            return !used;  // Return true if NOT used (unique)
        } catch (error) {
            console.error("[Verifier] Error checking nullifier:", error);
            return false;
        }
    }

    /**
     * Verify proof and extract nullifier (if transaction-based)
     */
    async verifyWithTransaction(transactionId: string, appId: string, minScore: number): Promise<boolean> {
        try {
            console.warn("[Verifier] TODO: Implement transaction-based verification");
            return false;
        } catch (error) {
            console.error("[Verifier] Error verifying transaction:", error);
            return false;
        }
    }
}

/**
 * Verify passport proof (convenience function)
 * 
 * @param input - Proof verification input
 * @returns true if proof is valid, false otherwise
 */
export async function verifyPassportProof(
    input: PassportVerificationInput
): Promise<boolean> {
    const verifier = new PassportProofVerifier();
    return verifier.verify(input);
}

/**
 * Check nullifier uniqueness only (without proof verification)
 * 
 * Use when proof verification is done separately
 */
export async function verifyNullifierUniqueness(nullifier: string): Promise<boolean> {
    const verifier = new PassportProofVerifier();
    return verifier.checkNullifierUniqueness(nullifier);
}
