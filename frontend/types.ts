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
  provider: 'google' | 'twitter' | 'ethereum' | 'gemini' | 'github';
  // Aleo fields (optional, for mapping)
  stamp_id?: number;
  name?: string;
  category?: string;
  points?: number;
  is_active?: boolean;
  earned?: boolean;
}

export interface UserState {
  isConnected: boolean;
  address: string | null;
  score: number;
  stamps: Record<string, StampStatus>;
}

