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
        
        return data.map((tx: any) => ({
            txId: tx.id || tx.transaction_id || "",
            timestamp: tx.timestamp || Date.now(),
            type: tx.type || "unknown",
            status: tx.status || "confirmed",
            program: tx.program || PROGRAM_ID,
            function: tx.function || "",
        })).filter((tx: TransactionData) => tx.txId);
        
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
        
        return {
            txId: data.id || data.transaction_id || txId,
            timestamp: data.timestamp || Date.now(),
            type: data.type || "unknown",
            status: data.status || "confirmed",
            program: data.program || "",
            function: data.function || "",
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
        
        return data.map((exec: any) => ({
            txId: exec.id || exec.transaction_id || "",
            timestamp: exec.timestamp || Date.now(),
            type: "execution",
            status: exec.status || "confirmed",
            program: programId,
            function: exec.function || functionName || "",
        })).filter((tx: TransactionData) => tx.txId);
        
    } catch (error) {
        console.error("[ExplorerAPI] Failed to fetch program executions:", error);
        return [];
    }
};

// Note: If Explorer API is not available, the app falls back to wallet records
// which are the authoritative source for private transaction data

