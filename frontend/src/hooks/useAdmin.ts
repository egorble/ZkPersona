import { useState, useEffect } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletAdapterNetwork, Transaction } from "@demox-labs/aleo-wallet-adapter-base";
import { PROGRAM_ID } from "../deployed_program";
import { stringToField, hashString } from "../utils/aleo";
import { logger } from "../utils/logger";

type WalletAdapterExtras = {
    requestTransaction?: (tx: Transaction) => Promise<string>;
};

export const useAdmin = () => {
    const { publicKey, wallet } = useWallet();
    const adapter = wallet?.adapter as unknown as WalletAdapterExtras | undefined;
    const network = WalletAdapterNetwork.TestnetBeta;
    
    const [isAdmin, setIsAdmin] = useState(false);
    const [checking, setChecking] = useState(true);

    // Check if user is admin via blockchain API
    const checkAdminStatus = async () => {
        if (!publicKey) {
            setIsAdmin(false);
            setChecking(false);
            return;
        }

        try {
            // Check admin status via View Function API
            const { checkAdminStatus: checkAdmin } = await import("../utils/aleoAPI");
            const isAdminResult = await checkAdmin(publicKey);
            setIsAdmin(isAdminResult);
            
            // Also cache in localStorage for quick access
            if (isAdminResult) {
                const adminAddresses = JSON.parse(localStorage.getItem("admin_addresses") || "[]");
                if (!adminAddresses.includes(publicKey)) {
                    adminAddresses.push(publicKey);
                    localStorage.setItem("admin_addresses", JSON.stringify(adminAddresses));
                }
            }
        } catch (error) {
            console.error("[useAdmin] Failed to check admin status via API, falling back to localStorage:", error);
            // Fallback to localStorage
            const adminAddresses = JSON.parse(localStorage.getItem("admin_addresses") || "[]");
            setIsAdmin(adminAddresses.includes(publicKey));
        } finally {
            setChecking(false);
        }
    };

    useEffect(() => {
        checkAdminStatus();
    }, [publicKey]);

    // Admin operations
    // NOTE: create_stamp transition only takes points (u64) as parameter
    // Stamp metadata (name, description, category) are NOT stored on-chain
    // Only points and is_active are stored (public metadata)
    const createStamp = async (
        name: string,
        description: string,
        category: string,
        points: number
    ): Promise<string | null> => {
        if (!publicKey || !adapter?.requestTransaction) {
            throw new Error("Wallet not connected");
        }

        try {
            logger.admin.createStamp("pending", name);

            // create_stamp transition signature: create_stamp(public points: u64) -> (u32, Future)
            // Only points are stored on-chain (public metadata)
            // Name, description, category are stored off-chain (not part of ZK system)
            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "create_stamp",
                [
                    `${points}u64`,  // Only points stored on-chain
                ],
                50000,
                false
            );

            const txId = await adapter.requestTransaction(transaction);
            
            if (txId) {
                logger.transaction.confirmed(txId);
                // NOTE: Name, description, category should be stored off-chain
                // They are not part of the ZK system (privacy-first design)
                return txId;
            }
            
            return null;
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            throw error;
        }
    };

    const editStamp = async (
        stampId: number,
        name: string,
        description: string,
        category: string,
        points: number,
        isActive: boolean
    ): Promise<string | null> => {
        if (!publicKey || !adapter?.requestTransaction) {
            throw new Error("Wallet not connected");
        }

        try {
            logger.admin.editStamp(stampId.toString(), name);

            // edit_stamp transition signature: edit_stamp(public stamp_id: u32, public points: u64, public is_active: bool) -> Future
            // Only points and is_active are stored on-chain (public metadata)
            // Name, description, category are stored off-chain
            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "edit_stamp",
                [
                    `${stampId}u32`,
                    `${points}u64`,
                    isActive ? "true" : "false",
                ],
                50000,
                false
            );

            const txId = await adapter.requestTransaction(transaction);
            
            if (txId) {
                logger.transaction.confirmed(txId);
                // NOTE: Name, description, category should be stored off-chain
                return txId;
            }
            
            return null;
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            throw error;
        }
    };

    const deleteStamp = async (stampId: number): Promise<string | null> => {
        if (!publicKey || !adapter?.requestTransaction) {
            throw new Error("Wallet not connected");
        }

        try {
            logger.admin.deleteStamp(stampId.toString());

            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "delete_stamp",
                [`${stampId}u32`],
                50000,
                false
            );

            const txId = await adapter.requestTransaction(transaction);
            
            if (txId) {
                logger.transaction.confirmed(txId);
                return txId;
            }
            
            return null;
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            throw error;
        }
    };

    const createTask = async (
        stampId: number,
        taskType: number,
        requirement: string,
        verificationData: string
    ): Promise<string | null> => {
        if (!publicKey || !adapter?.requestTransaction) {
            throw new Error("Wallet not connected");
        }

        try {
            logger.admin.createTask("pending", stampId.toString());

            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "create_task",
                [
                    `${stampId}u32`,
                    `${taskType}u8`,
                    stringToField(requirement),
                    stringToField(verificationData),
                ],
                50000,
                false
            );

            const txId = await adapter.requestTransaction(transaction);
            
            if (txId) {
                logger.transaction.confirmed(txId);
                return txId;
            }
            
            return null;
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            throw error;
        }
    };

    const editTask = async (
        taskId: number,
        stampId: number,
        taskType: number,
        requirement: string,
        verificationData: string,
        isActive: boolean
    ): Promise<string | null> => {
        if (!publicKey || !adapter?.requestTransaction) {
            throw new Error("Wallet not connected");
        }

        try {
            logger.admin.editTask(taskId.toString());

            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "edit_task",
                [
                    `${taskId}u32`,
                    `${stampId}u32`,
                    `${taskType}u8`,
                    stringToField(requirement),
                    stringToField(verificationData),
                    isActive ? "true" : "false",
                ],
                50000,
                false
            );

            const txId = await adapter.requestTransaction(transaction);
            
            if (txId) {
                logger.transaction.confirmed(txId);
                return txId;
            }
            
            return null;
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            throw error;
        }
    };

    const deleteTask = async (taskId: number): Promise<string | null> => {
        if (!publicKey || !adapter?.requestTransaction) {
            throw new Error("Wallet not connected");
        }

        try {
            logger.admin.deleteTask(taskId.toString());

            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "delete_task",
                [`${taskId}u32`],
                50000,
                false
            );

            const txId = await adapter.requestTransaction(transaction);
            
            if (txId) {
                logger.transaction.confirmed(txId);
                return txId;
            }
            
            return null;
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            throw error;
        }
    };

    // Issue stamp as PRIVATE record to user
    // Admin never sees user's passport state
    // Stamp is minted directly to user's wallet
    // NOTE: user_passport record must be provided by user wallet
    const issueStamp = async (
        user: string,
        stampId: number,
        userPassportRecord: string  // Private passport record from user's wallet
    ): Promise<string | null> => {
        if (!publicKey || !adapter?.requestTransaction) {
            throw new Error("Wallet not connected");
        }

        try {
            logger.admin.grantStamp(user, stampId.toString());

            // issue_stamp takes private passport record, public user address, and public stamp_id
            // Returns StampRecord as private record to user's wallet
            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "issue_stamp",
                [
                    userPassportRecord,  // Private passport record (from user)
                    user,                // Public user address
                    `${stampId}u32`,     // Public stamp ID
                ],
                50000,
                false
            );

            const txId = await adapter.requestTransaction(transaction);
            
            if (txId) {
                logger.transaction.confirmed(txId);
                // StampRecord is returned as private record to user's wallet
                // Admin never sees the full record - privacy preserved
                return txId;
            }
            
            return null;
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            throw error;
        }
    };

    return {
        isAdmin,
        checking,
        checkAdminStatus,
        createStamp,
        editStamp,
        deleteStamp,
        createTask,
        editTask,
        deleteTask,
        issueStamp,  // Changed from verifyAndGrantStamp - now issues private records
    };
};

