// Sample data for testing and initial setup
import { Stamp, Task } from "../types";

export const sampleStamps: Stamp[] = [
    {
        stamp_id: 1,
        name: "Discord Verified",
        description: "Connected and verified Discord account",
        category: "Social",
        points: 10,
        is_active: true,
        created_at: Date.now() / 1000,
    },
    {
        stamp_id: 2,
        name: "Twitter Verified",
        description: "Connected and verified Twitter account",
        category: "Social",
        points: 10,
        is_active: true,
        created_at: Date.now() / 1000,
    },
    {
        stamp_id: 3,
        name: "First Transaction",
        description: "Completed first transaction on Aleo network",
        category: "Transaction",
        points: 5,
        is_active: true,
        created_at: Date.now() / 1000,
    },
    {
        stamp_id: 4,
        name: "Identity Verified",
        description: "Completed identity verification process",
        category: "Identity",
        points: 20,
        is_active: true,
        created_at: Date.now() / 1000,
    },
];

export const sampleTasks: Task[] = [
    {
        task_id: 1,
        stamp_id: 1,
        task_type: 1, // Discord
        requirement: "Connect your Discord account and verify ownership",
        verification_data: "discord_username_hash",
        is_active: true,
    },
    {
        task_id: 2,
        stamp_id: 2,
        task_type: 2, // Twitter
        requirement: "Connect your Twitter account and verify ownership",
        verification_data: "twitter_handle_hash",
        is_active: true,
    },
    {
        task_id: 3,
        stamp_id: 3,
        task_type: 3, // Transaction
        requirement: "Complete any transaction on Aleo network",
        verification_data: "transaction_hash",
        is_active: true,
    },
];

// Initialize sample data in localStorage (only if empty)
export const initializeSampleData = () => {
    if (!localStorage.getItem("stamps")) {
        localStorage.setItem("stamps", JSON.stringify(sampleStamps));
        console.log("✅ Initialized sample stamps");
    }

    if (!localStorage.getItem("tasks")) {
        localStorage.setItem("tasks", JSON.stringify(sampleTasks));
        console.log("✅ Initialized sample tasks");
    }
};

