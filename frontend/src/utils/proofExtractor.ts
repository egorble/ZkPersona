// Proof extractor from transactions

import { fetchTransactionDetails } from "./explorerAPI";

/**
 * Transaction execution result from Aleo
 */
export interface TransactionExecutionResult {
    proof: string;
    publicOutputs: string[];
    transactionId: string;
}

/**
 * Extract proof and nullifier from transaction
 * 
 * @param transactionId - Transaction ID from prove_access execution
 * @returns Proof and nullifier extracted from transaction
 */
export async function extractProofFromTransaction(
    transactionId: string
): Promise<{ proof: string; nullifier: string } | null> {
    try {
        // Fetch transaction details from explorer
        const txDetails = await fetchTransactionDetails(transactionId);
        
        if (!txDetails) {
            console.error("[ProofExtractor] Transaction not found:", transactionId);
            return null;
        }

        console.warn("[ProofExtractor] TODO: Parse actual transaction structure");
        
        return {
            proof: txDetails.transactionId || "",
            nullifier: "",
        };
    } catch (error) {
        console.error("[ProofExtractor] Error extracting proof:", error);
        return null;
    }
}

/**
 * Extract proof from wallet execution result
 * 
 * @param executionResult - Result from wallet execution
 * @returns Proof and nullifier
 */
export function extractProofFromExecution(
    executionResult: any
): { proof: string; nullifier: string } | null {
    try {
        // Wallet execution result format:
        // {
        //   proof: "...",
        //   publicOutputs: [nullifier: field, valid: bool],
        //   transactionId?: "..."
        // }
        
        if (!executionResult?.proof || !executionResult?.publicOutputs) {
            console.error("[ProofExtractor] Invalid execution result format");
            return null;
        }

        const proof = executionResult.proof;
        const publicOutputs = executionResult.publicOutputs;
        
        // First output is nullifier, second is validity boolean
        const nullifier = publicOutputs[0]?.toString() || "";
        const valid = publicOutputs[1] === true || publicOutputs[1] === "true";
        
        if (!valid) {
            console.error("[ProofExtractor] Proof execution returned invalid result");
            return null;
        }

        return {
            proof: proof,
            nullifier: nullifier,
        };
    } catch (error) {
        console.error("[ProofExtractor] Error extracting proof from execution:", error);
        return null;
    }
}


