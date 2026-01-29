import React from 'react';

export enum StampStatus {
  LOCKED = 'LOCKED',
  PENDING = 'PENDING',
  VERIFIED = 'VERIFIED',
  FAILED = 'FAILED'
}

// Original Stamp type for UI (with icon, title, etc.)
export interface Stamp {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  scoreWeight: number;
  status: StampStatus;
  provider: 'google' | 'twitter' | 'ethereum' | 'gemini' | 'github' | 'discord' | 'telegram' | 'solana';
  // Aleo fields (optional, for mapping)
  stamp_id?: number;
  platform_id?: number; // u8 in contract; used for claim_social_stamp
  name?: string;
  category?: string;
  points?: number;
  is_active?: boolean;
  earned?: boolean;
  comingSoon?: boolean; // If true, show "Coming Soon" and disable verification
}

export interface UserState {
  isConnected: boolean;
  address: string | null;
  score: number;
  stamps: Record<string, StampStatus>;
}

