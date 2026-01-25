// Commitment generation and storage for Identity Portal
// Privacy-first: store only commitments, not raw user data

// Aleo field modulus (p = 2^249 * (2^254 - 45560315531419706090280762371685220353) + 1)
const FIELD_MODULUS = BigInt('8444461749428370424248824938781546531375899335154063827935233455917409239041');

// Secret salt (should match backend or be from env)
const SECRET_SALT = import.meta.env.VITE_SECRET_SALT || 'zkpersona-secret-salt-change-in-production';

/**
 * Platform configuration
 */
export interface PlatformConfig {
  id: number;
  name: string;
  prefix: string;
}

export const PLATFORMS: Record<string, PlatformConfig> = {
  DISCORD: { id: 1, name: 'Discord', prefix: 'discord' },
  TWITTER: { id: 2, name: 'Twitter', prefix: 'twitter' },
  GITHUB: { id: 3, name: 'GitHub', prefix: 'github' },
  LINKEDIN: { id: 4, name: 'LinkedIn', prefix: 'linkedin' },
  EMAIL: { id: 5, name: 'Email', prefix: 'email' },
  PHONE: { id: 6, name: 'Phone', prefix: 'phone' },
};

/**
 * SHA-256 hash using Web Crypto API (browser-compatible)
 */
async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hashHex;
}

/**
 * Generate commitment for social network (per spec)
 * Format: SHA-256(platform_id + user_id + salt) mod FIELD_MODULUS
 * 
 * IMPORTANT: This function must be identical on frontend and backend!
 * 
 * @param platformId - Platform ID (1=Discord, 2=Twitter...)
 * @param userId - User ID from platform (string)
 * @param salt - Secret key (optional, uses env)
 * @returns Commitment as Aleo field (string with "field" suffix)
 */
export async function generateSocialCommitment(
  platformId: number,
  userId: string,
  salt: string = SECRET_SALT
): Promise<string> {
  // 1. Create input string
  const input = `${platformId}:${userId}:${salt}`;
  
  // 2. SHA-256 hash
  const hash = await sha256(input);
  
  // 3. Convert to BigInt
  const hashBigInt = BigInt(`0x${hash}`);
  
  // 4. Modulo for Aleo field
  const commitment = hashBigInt % FIELD_MODULUS;
  
  // 5. Return as string with "field" suffix
  return `${commitment.toString()}field`;
}

/**
 * Validate commitment format
 */
export function validateCommitment(commitment: string): boolean {
  try {
    const value = commitment.replace('field', '');
    const bigInt = BigInt(value);
    return bigInt > 0n && bigInt < FIELD_MODULUS;
  } catch {
    return false;
  }
}

/**
 * Check if two commitments are equal
 */
export function commitmentEquals(a: string, b: string): boolean {
  return a.replace('field', '') === b.replace('field', '');
}

/**
 * Generate commitment hash from user data (legacy format)
 * Format: keccak256(user_id + wallet_address + timestamp)
 */
export function generateCommitment(
  userId: string,
  walletAddress: string,
  timestamp: number
): string {
  // Simple hash function (in production, use keccak256 from ethers.js)
  const data = `${userId}_${walletAddress}_${timestamp}`;
  let hash = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  // Convert to hex string (8 chars)
  return Math.abs(hash).toString(16).padStart(8, '0') + timestamp.toString(36);
}

/**
 * Platform data stored in localStorage
 */
export interface PlatformCommitment {
  commitment: string;
  score: number;
  timestamp: number;
  platformData?: {
    userId?: string;
    accountAge?: number;
    metrics?: Record<string, any>;
  };
}

/**
 * Stored identity data structure
 */
export interface StoredIdentityData {
  platforms: {
    google?: PlatformCommitment;
    twitter?: PlatformCommitment;
    wallet?: PlatformCommitment;
    github?: PlatformCommitment;
    gemini?: PlatformCommitment;
  };
  walletAddress: string;
  totalScore: number;
  lastUpdated: number;
}

const STORAGE_KEY = 'identity_portal_data';

/**
 * Save platform commitment to localStorage
 */
export function saveCommitment(
  platform: 'google' | 'twitter' | 'wallet' | 'github' | 'gemini',
  commitment: string,
  score: number,
  timestamp: number = Date.now(),
  platformData?: PlatformCommitment['platformData']
): void {
  const stored = loadIdentityData();
  
  stored.platforms[platform] = {
    commitment,
    score,
    timestamp,
    platformData
  };
  
  // Recalculate total score
  stored.totalScore = Object.values(stored.platforms).reduce(
    (sum, p) => sum + (p?.score || 0),
    0
  );
  stored.lastUpdated = Date.now();
  stored.walletAddress = stored.walletAddress || ''; // Set in main component
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

/**
 * Load identity data from localStorage
 */
export function loadIdentityData(): StoredIdentityData {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      // Invalid data, return default
    }
  }
  
  return {
    platforms: {},
    walletAddress: '',
    totalScore: 0,
    lastUpdated: 0
  };
}

/**
 * Get platform commitment
 */
export function getCommitment(
  platform: 'google' | 'twitter' | 'wallet' | 'github' | 'gemini'
): PlatformCommitment | null {
  const stored = loadIdentityData();
  return stored.platforms[platform] || null;
}

/**
 * Remove platform commitment
 */
export function removeCommitment(
  platform: 'google' | 'twitter' | 'wallet' | 'github' | 'gemini'
): void {
  const stored = loadIdentityData();
  delete stored.platforms[platform];
  
  // Recalculate total score
  stored.totalScore = Object.values(stored.platforms).reduce(
    (sum, p) => sum + (p?.score || 0),
    0
  );
  stored.lastUpdated = Date.now();
  
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

/**
 * Clear all identity data
 */
export function clearIdentityData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Update wallet address in stored data
 */
export function updateWalletAddress(walletAddress: string): void {
  const stored = loadIdentityData();
  stored.walletAddress = walletAddress;
  stored.lastUpdated = Date.now();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(stored));
}

