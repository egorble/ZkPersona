// Type definitions for ZkPersona

export interface Stamp {
    stamp_id: number;
    name: string;
    description: string;
    category: string;
    points: number;
    is_active: boolean;
    created_at?: number;
    earned?: boolean;
    earned_at?: number;
}

export interface Task {
    task_id: number;
    stamp_id: number;
    task_type: number; // 1=Discord, 2=Twitter, 3=Transaction, 4=Custom
    requirement: string;
    verification_data: string;
    is_active: boolean;
}

export interface VerificationRequest {
    request_id: number;
    user: string;
    stamp_id: number;
    proof: string;
    requested_at: number;
    status: number; // 0=pending, 1=approved, 2=rejected
}

export interface PassportData {
    owner: string;
    total_stamps: number;
    total_points: number;
    humanity_score: number;
    created_at: number;
    updated_at: number;
}

export interface UserStamp {
    passport_owner: string;
    stamp_id: number;
    earned_at: number;
    verification_hash: string;
    is_verified: boolean;
}

