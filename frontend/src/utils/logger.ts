// Console logger with compact formatting for admin operations

const log = {
    admin: {
        createStamp: (stampId: string, name: string) => 
            console.log(`[ADMIN] ✅ Created stamp #${stampId}: ${name}`),
        editStamp: (stampId: string, name: string) => 
            console.log(`[ADMIN] ✏️  Edited stamp #${stampId}: ${name}`),
        deleteStamp: (stampId: string) => 
            console.log(`[ADMIN] 🗑️  Deleted stamp #${stampId}`),
        createTask: (taskId: string, stampId: string) => 
            console.log(`[ADMIN] ✅ Created task #${taskId} for stamp #${stampId}`),
        editTask: (taskId: string) => 
            console.log(`[ADMIN] ✏️  Edited task #${taskId}`),
        deleteTask: (taskId: string) => 
            console.log(`[ADMIN] 🗑️  Deleted task #${taskId}`),
        grantStamp: (user: string, stampId: string) => 
            console.log(`[ADMIN] 🎖️  Granted stamp #${stampId} to ${user.slice(0, 8)}...`),
        addAdmin: (address: string) => 
            console.log(`[ADMIN] ➕ Added admin: ${address.slice(0, 8)}...`),
        removeAdmin: (address: string) => 
            console.log(`[ADMIN] ➖ Removed admin: ${address.slice(0, 8)}...`),
    },
    user: {
        setupComplete: (address: string) => 
            console.log(`[USER] ✅ Setup complete: ${address.slice(0, 8)}...`),
        requestVerification: (stampId: string) => 
            console.log(`[USER] 🔍 Requested verification for stamp #${stampId}`),
    },
    wallet: {
        connected: (address: string) => 
            console.log(`[WALLET] 🔗 Connected: ${address.slice(0, 8)}...`),
        disconnected: () => 
            console.log(`[WALLET] 🔌 Disconnected`),
        connecting: () => 
            console.log(`[WALLET] ⏳ Connecting...`),
    },
    transaction: {
        signing: () => 
            console.log(`[TX] ✍️  Signing transaction...`),
        confirmed: (txId: string) => {
            console.log(`[TX] ✅ Confirmed: ${txId}`);
            if (!txId.startsWith("at")) {
                console.warn(`[TX] This may be a request ID, not the on-chain tx id. Check Leo Wallet → History for the real transaction.`);
            }
        },
        failed: (error: string) => 
            console.error(`[TX] ❌ Failed: ${error}`),
    },
    error: (context: string, message: string) => 
        console.error(`[ERROR] ${context}: ${message}`),
};

export const logger = log;

