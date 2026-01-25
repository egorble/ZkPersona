// Explorer API utilities for fetching transaction history

import { PROGRAM_ID } from "../deployed_program";

const EXPLORER_API_BASE = "https://api.explorer.aleo.org/v1";
const EXPLORER_TESTNET_URL = `${EXPLORER_API_BASE}/testnet3`;

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
 * Function name mapping for display
 * Maps contract function names to user-friendly display names
 */
/**
 * Function name mapping for user-friendly display names
 * Maps original contract function names (snake_case) to display names
 */
const FUNCTION_NAME_MAP: Record<string, string> = {
    // User functions
    'create_passport': 'Create Passport',
    'aggregate_stamps': 'Aggregate Stamps',
    'prove_access': 'Prove Access',
    'claim_social_stamp': 'Connect Social Network', // e.g., connect_discord, connect_twitter
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
function extractFunctionName(tx: any): string {
    // Try direct function field first
    if (tx.function && typeof tx.function === 'string' && tx.function.length > 0) {
        // Remove program prefix if present (e.g., "zkpersona_passport_v2.aleo/create_passport" -> "create_passport")
        const cleanName = tx.function.includes('/') 
            ? tx.function.split('/').pop() || tx.function
            : tx.function;
        return cleanName;
    }
    
    // Try transitions array (standard Aleo transaction structure)
    if (tx.transitions && Array.isArray(tx.transitions) && tx.transitions.length > 0) {
        // Get the first transition's function name (main function)
        const transition = tx.transitions[0];
        if (transition?.function_name) {
            const cleanName = transition.function_name.includes('/')
                ? transition.function_name.split('/').pop() || transition.function_name
                : transition.function_name;
            return cleanName;
        }
        if (transition?.function) {
            const cleanName = transition.function.includes('/')
                ? transition.function.split('/').pop() || transition.function
                : transition.function;
            return cleanName;
        }
    }
    
    // Try execution data
    if (tx.execution) {
        if (tx.execution.transitions && Array.isArray(tx.execution.transitions)) {
            const transition = tx.execution.transitions[0];
            if (transition?.function_name) {
                const cleanName = transition.function_name.includes('/')
                    ? transition.function_name.split('/').pop() || transition.function_name
                    : transition.function_name;
                return cleanName;
            }
        }
        if (tx.execution.function) {
            const cleanName = tx.execution.function.includes('/')
                ? tx.execution.function.split('/').pop() || tx.execution.function
                : tx.execution.function;
            return cleanName;
        }
    }
    
    // Try program execution format
    if (tx.program_id && tx.function_name) {
        // Extract function name from program_id.function_name format
        const parts = tx.function_name.split('.');
        if (parts.length > 1) {
            return parts[parts.length - 1];
        }
        // Also try splitting by /
        if (tx.function_name.includes('/')) {
            return tx.function_name.split('/').pop() || tx.function_name;
        }
        return tx.function_name;
    }
    
    // Try alternative field names
    if (tx.function_name) {
        const cleanName = tx.function_name.includes('/')
            ? tx.function_name.split('/').pop() || tx.function_name
            : tx.function_name;
        return cleanName;
    }
    
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

// Fetch transaction history for an address via Provable Explorer API
export const fetchTransactionHistory = async (
    address: string,
    network: string = "testnet3"
): Promise<TransactionData[]> => {
    try {
        const explorerUrl = network === "testnet3" 
            ? EXPLORER_TESTNET_URL 
            : `${EXPLORER_API_BASE}/${network}`;
        
        // Fetch transactions for the address
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
            if (functionName && process.env.NODE_ENV === 'development') {
                console.debug('[ExplorerAPI] Extracted function name:', {
                    txId: tx.id?.substring(0, 20) + '...',
                    functionName,
                    hasTransitions: !!tx.transitions,
                    transitionsCount: tx.transitions?.length || 0
                });
            }
            
            return {
                txId: tx.id || tx.transaction_id || "",
                timestamp: tx.timestamp || Date.now(),
                type: tx.type || "unknown",
                status: tx.status || "confirmed",
                program: programId,
                function: functionName, // Original function name from contract (e.g., "claim_social_stamp", "claim_point")
                functionName: functionName, // Alias for consistency
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
    network: string = "testnet3"
): Promise<TransactionData | null> => {
    try {
        const explorerUrl = network === "testnet3" 
            ? EXPLORER_TESTNET_URL 
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

// Get transaction URL for explorer
export const getTransactionUrl = (txId: string, network: string = "testnet3"): string => {
    if (network === "testnet3") {
        return `https://explorer.aleo.org/testnet3/transaction/${txId}`;
    }
    return `https://explorer.aleo.org/${network}/transaction/${txId}`;
};

// Fetch program execution history (for verification requests, stamp grants, etc.)
export const fetchProgramExecutions = async (
    programId: string,
    functionName?: string,
    network: string = "testnet3"
): Promise<TransactionData[]> => {
    try {
        const explorerUrl = network === "testnet3" 
            ? EXPLORER_TESTNET_URL 
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
 */
export const getFunctionDisplayName = (functionName: string): string => {
    if (!functionName) return 'Unknown';
    
    // Remove program prefix if present
    const cleanName = functionName.includes('/') 
        ? functionName.split('/').pop() || functionName
        : functionName;
    
    // Return mapped name or formatted original name
    return FUNCTION_NAME_MAP[cleanName] || formatFunctionName(cleanName);
};

/**
 * Format function name for display (snake_case to Title Case)
 */
function formatFunctionName(name: string): string {
    return name
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

// Note: If Explorer API is not available, the app falls back to wallet records
// which are the authoritative source for private transaction data

