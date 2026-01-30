// Explorer API utilities for fetching transaction history

import { PROGRAM_ID } from "../deployed_program";

const EXPLORER_API_BASE = "https://api.explorer.aleo.org/v1";
const EXPLORER_TESTNET3_URL = `${EXPLORER_API_BASE}/testnetbeta`;
const PROVABLE_TESTNET_API = "https://api.explorer.provable.com/v1/testnet";

export interface TransactionData {
    txId: string;
    timestamp: number;
    type: string;
    status: string;
    program?: string;
    function?: string;
    functionName?: string; // Original function name from contract (e.g., "claim_social_stamp", "claim_point")
}

/**
 * Function name mapping for user-friendly display names
 * Maps original contract function names (snake_case) to display names
 * 
 * NOTE: For display purposes, we show user-friendly names, but the original
 * function names (claim_social_stamp, claim_point, etc.) are preserved in
 * the function/functionName fields for reference.
 */
const FUNCTION_NAME_MAP: Record<string, string> = {
    // User functions
    'claim_points': 'Claim points',
    'aggregate_stamps': 'Aggregate Stamps',
    'prove_access': 'Prove Access',
    'claim_verification': 'Claim Points',
    'claim_social_stamp': 'Connect Social Network',
    'claim_point': 'Claim Points',
    
    // Admin functions
    'initialize': 'Initialize Contract',
    'add_admin': 'Add Admin',
    'remove_admin': 'Remove Admin',
    'create_stamp': 'Create Stamp',
    'edit_stamp': 'Edit Stamp',
    'delete_stamp': 'Delete Stamp',
    'issue_stamp': 'Issue Stamp',
};

/**
 * Extract function name from transaction transitions
 * Aleo transactions contain transitions array, each with function_name
 */
/**
 * Extract original function name from transaction
 * 
 * This function extracts the original function name from Aleo transaction data.
 * It handles multiple formats that the explorer API might return:
 * - Direct function field
 * - Transitions array (standard format)
 * - Execution data
 * - Program execution format
 * 
 * Returns the original function name (e.g., "claim_social_stamp", "claim_point", "claim_points")
 * without any program prefix.
 */
function extractFunctionName(tx: any): string {
    if (tx.function && typeof tx.function === 'string' && tx.function.length > 0) {
        // Remove program prefix if present (e.g., "zkpersona_passport_v2.aleo/claim_points" -> "claim_points")
        const cleanName = tx.function.includes('/') 
            ? tx.function.split('/').pop() || tx.function
            : tx.function;
        // Also remove .aleo suffix if present
        return cleanName.replace(/\.aleo$/, '');
    }
    
    // Try transitions array (standard Aleo transaction structure)
    // Transactions contain transitions array, each transition has function_name
    if (tx.transitions && Array.isArray(tx.transitions) && tx.transitions.length > 0) {
        // Get the first transition's function name (main function)
        const transition = tx.transitions[0];
        if (transition?.function_name) {
            const cleanName = transition.function_name.includes('/')
                ? transition.function_name.split('/').pop() || transition.function_name
                : transition.function_name;
            return cleanName.replace(/\.aleo$/, '');
        }
        if (transition?.function) {
            const cleanName = transition.function.includes('/')
                ? transition.function.split('/').pop() || transition.function
                : transition.function;
            return cleanName.replace(/\.aleo$/, '');
        }
    }
    
    // Try execution data (for executed transactions)
    if (tx.execution) {
        if (tx.execution.transitions && Array.isArray(tx.execution.transitions) && tx.execution.transitions.length > 0) {
            const transition = tx.execution.transitions[0];
            if (transition?.function_name) {
                const cleanName = transition.function_name.includes('/')
                    ? transition.function_name.split('/').pop() || transition.function_name
                    : transition.function_name;
                return cleanName.replace(/\.aleo$/, '');
            }
            if (transition?.function) {
                const cleanName = transition.function.includes('/')
                    ? transition.function.split('/').pop() || transition.function
                    : transition.function;
                return cleanName.replace(/\.aleo$/, '');
            }
        }
        if (tx.execution.function) {
            const cleanName = tx.execution.function.includes('/')
                ? tx.execution.function.split('/').pop() || tx.execution.function
                : tx.execution.function;
            return cleanName.replace(/\.aleo$/, '');
        }
        if (tx.execution.function_name) {
            const cleanName = tx.execution.function_name.includes('/')
                ? tx.execution.function_name.split('/').pop() || tx.execution.function_name
                : tx.execution.function_name;
            return cleanName.replace(/\.aleo$/, '');
        }
    }
    
    // Try program execution format (program_id.function_name)
    if (tx.program_id && tx.function_name) {
        // Extract function name from program_id.function_name format
        const parts = tx.function_name.split('.');
        if (parts.length > 1) {
            return parts[parts.length - 1].replace(/\.aleo$/, '');
        }
        // Also try splitting by /
        if (tx.function_name.includes('/')) {
            const name = tx.function_name.split('/').pop() || tx.function_name;
            return name.replace(/\.aleo$/, '');
        }
        return tx.function_name.replace(/\.aleo$/, '');
    }
    
    // Try alternative field names
    if (tx.function_name) {
        const cleanName = tx.function_name.includes('/')
            ? tx.function_name.split('/').pop() || tx.function_name
            : tx.function_name;
        return cleanName.replace(/\.aleo$/, '');
    }
    
    // Return empty string if no function name found
    return '';
}

/**
 * Format function name for display (snake_case to Title Case)
 */
function formatFunctionName(name: string): string {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Fetch transaction history for an address
export const fetchTransactionHistory = async (
    address: string,
    network: string = "testnet"
): Promise<TransactionData[]> => {
    try {
        const explorerUrl = network === "testnet"
            ? PROVABLE_TESTNET_API
            : network === "testnet3"
            ? EXPLORER_TESTNET3_URL
            : `${EXPLORER_API_BASE}/${network}`;

        const response = await fetch(
            `${explorerUrl}/address/${address}/transactions?limit=100`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );
        
        if (!response.ok) {
            // If API not available, return empty array (fallback to wallet records)
            if (response.status === 404 || response.status === 503) {
                console.warn("[ExplorerAPI] Explorer API not available, using wallet records");
                return [];
            }
            throw new Error(`Explorer API failed: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        // Parse transactions from response
        if (!data || !Array.isArray(data)) {
            return [];
        }
        
        return data.map((tx: any) => {
            const functionName = extractFunctionName(tx);
            const programId = tx.program_id || tx.program || PROGRAM_ID;
            
            // Debug logging (only in development)
            if (process.env.NODE_ENV === 'development') {
                if (functionName) {
                    console.debug('[ExplorerAPI] Extracted function name:', {
                        txId: tx.id?.substring(0, 20) + '...',
                        functionName,
                        hasTransitions: !!tx.transitions,
                        transitionsCount: tx.transitions?.length || 0,
                        hasExecution: !!tx.execution,
                        rawFunction: tx.function,
                        rawFunctionName: tx.function_name
                    });
                } else {
                    console.warn('[ExplorerAPI] Could not extract function name from transaction:', {
                        txId: tx.id?.substring(0, 20) + '...',
                        hasTransitions: !!tx.transitions,
                        hasExecution: !!tx.execution,
                        rawFunction: tx.function,
                        rawFunctionName: tx.function_name,
                        txKeys: Object.keys(tx)
                    });
                }
            }
            
            return {
                txId: tx.id || tx.transaction_id || "",
                timestamp: tx.timestamp || Date.now(),
                type: tx.type || "unknown",
                status: tx.status || "confirmed",
                program: programId,
                function: functionName, // Original function name from contract (e.g., "claim_social_stamp", "claim_point", "claim_points")
                functionName: functionName, // Alias for consistency - always contains original snake_case name
            };
        }).filter((tx: TransactionData) => tx.txId);
        
    } catch (error) {
        console.error("[ExplorerAPI] Failed to fetch transaction history:", error);
        // Fallback: return empty array (transactions tracked via wallet)
        return [];
    }
};

// Fetch transaction details by ID
export const fetchTransactionDetails = async (
    txId: string,
    network: string = "testnet"
): Promise<TransactionData | null> => {
    try {
        const explorerUrl = network === "testnet"
            ? PROVABLE_TESTNET_API
            : network === "testnetbeta"
            ? EXPLORER_TESTNET3_URL
            : `${EXPLORER_API_BASE}/${network}`;

        const response = await fetch(
            `${explorerUrl}/transaction/${txId}`,
            {
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
            }
        );
        
        if (!response.ok) {
            return null;
        }
        
        const data = await response.json();
        
        const functionName = extractFunctionName(data);
        const programId = data.program_id || data.program || "";
        
        return {
            txId: data.id || data.transaction_id || txId,
            timestamp: data.timestamp || Date.now(),
            type: data.type || "unknown",
            status: data.status || "confirmed",
            program: programId,
            function: functionName, // Original function name from contract
            functionName: functionName, // Alias for consistency
        };
    } catch (error) {
        console.error("[ExplorerAPI] Failed to fetch transaction details:", error);
        return null;
    }
};

/** Try Provable testnet first, then Aleo testnet3. Use when tx network is uncertain. */
export const fetchTransactionDetailsFromAnyExplorer = async (txId: string): Promise<TransactionData | null> => {
    const fromProvable = await fetchTransactionDetails(txId, "testnet");
    if (fromProvable) return fromProvable;
    return fetchTransactionDetails(txId, "testnet3");
};

// Get transaction URL for explorer (we deploy on Provable testnet)
export const getTransactionUrl = (txId: string, network: string = "testnet"): string => {
    if (network === "testnet") {
        return `https://testnet.explorer.provable.com/transaction/${txId}`;
    }
    if (network === "testnet3") {
        return `https://explorer.aleo.org/testnet3/transaction/${txId}`;
    }
    return `https://explorer.aleo.org/${network}/transaction/${txId}`;
};

// Fetch program execution history (for verification requests, stamp grants, etc.)
export const fetchProgramExecutions = async (
    programId: string,
    functionName?: string,
    network: string = "testnet"
): Promise<TransactionData[]> => {
    try {
        const explorerUrl = network === "testnet"
            ? PROVABLE_TESTNET_API
            : network === "testnet3"
            ? EXPLORER_TESTNET3_URL
            : `${EXPLORER_API_BASE}/${network}`;

        let url = `${explorerUrl}/program/${programId}/executions?limit=100`;
        if (functionName) {
            url += `&function=${functionName}`;
        }
        
        const response = await fetch(url, {
            method: 'GET',
            headers: {
                'Accept': 'application/json',
            },
        });
        
        if (!response.ok) {
            return [];
        }
        
        const data = await response.json();
        
        if (!data || !Array.isArray(data)) {
            return [];
        }
        
        return data.map((exec: any) => {
            const extractedFunctionName = extractFunctionName(exec) || functionName || "";
            
            return {
                txId: exec.id || exec.transaction_id || "",
                timestamp: exec.timestamp || Date.now(),
                type: "execution",
                status: exec.status || "confirmed",
                program: programId,
                function: extractedFunctionName, // Original function name from contract
                functionName: extractedFunctionName, // Alias for consistency
            };
        }).filter((tx: TransactionData) => tx.txId);
        
    } catch (error) {
        console.error("[ExplorerAPI] Failed to fetch program executions:", error);
        return [];
    }
};

/**
 * Get display name for function (exported for use in UI components)
 * 
 * Returns user-friendly display name, but preserves original function name
 * in the TransactionData.function field for reference.
 * 
 * @param functionName - Original function name from contract (e.g., "claim_social_stamp", "claim_point")
 * @returns User-friendly display name or formatted original name
 */
export const getFunctionDisplayName = (functionName: string): string => {
    if (!functionName) return 'Unknown';
    
    // Remove program prefix if present (e.g., "zkpersona_passport_v2.aleo/claim_social_stamp" -> "claim_social_stamp")
    const cleanName = functionName.includes('/') 
        ? functionName.split('/').pop() || functionName
        : functionName;
    
    // Return mapped name or formatted original name (snake_case -> Title Case)
    return FUNCTION_NAME_MAP[cleanName] || formatFunctionName(cleanName);
};

// Note: If Explorer API is not available, the app falls back to wallet records
// which are the authoritative source for private transaction data

