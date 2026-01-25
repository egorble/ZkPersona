// Backend API client for verification system

const BACKEND_URL = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

export interface VerificationSession {
  provider: string;
  status: 'in_progress' | 'verified' | 'failed';
  result?: VerificationResult;
}

export interface VerificationResult {
  verified: boolean;
  provider: string;
  userId?: string;
  username?: string;
  score: number;
  criteria: Array<{ condition?: string; points: number; description?: string }>;
  metadataHash?: string;
  maxScore: number;
}

/**
 * Start verification flow for a provider
 * Redirects user to backend OAuth/OpenID endpoint
 */
export const startVerification = (provider: string, passportId: string) => {
  const url = `${BACKEND_URL}/auth/${provider}/start?passportId=${encodeURIComponent(passportId)}`;
  window.location.href = url;
};

/**
 * Get verification status from backend
 */
export const getVerificationStatus = async (sessionId: string, provider?: string): Promise<VerificationSession | null> => {
  try {
    // Use provider-specific endpoint if provider is known
    const endpoint = provider 
      ? `${BACKEND_URL}/auth/${provider}/status?session=${encodeURIComponent(sessionId)}`
      : `${BACKEND_URL}/verify/status?session=${encodeURIComponent(sessionId)}`;
    
    const response = await fetch(endpoint);
    if (!response.ok) {
      console.warn(`[Backend API] Status request failed: ${response.status} for ${endpoint}`);
      return null;
    }
    return await response.json();
  } catch (error) {
    console.error('[Backend API] Error fetching status:', error);
    return null;
  }
};

/**
 * Submit EVM wallet signature to backend
 */
export const submitEVMSignature = async (
  sessionId: string,
  address: string,
  signature: string,
  message: string
): Promise<void> => {
  const response = await fetch(`${BACKEND_URL}/auth/evm/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      address,
      signature,
      message,
      state: sessionId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify EVM wallet');
  }

  // Backend processes and stores result in session
  // Frontend will poll status
};

/**
 * Submit Solana wallet signature to backend
 */
export const submitSolanaSignature = async (
  sessionId: string,
  address: string,
  signature: string,
  message: string
): Promise<void> => {
  const response = await fetch(`${BACKEND_URL}/auth/solana/callback`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      address,
      signature,
      message,
      state: sessionId
    })
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Failed to verify Solana wallet');
  }

  // Backend processes and stores result in session
  // Frontend will poll status
};

/**
 * Get user profile (Discord, etc.)
 */
export const getUserProfile = async (userId: string): Promise<any | null> => {
  try {
    const response = await fetch(`${BACKEND_URL}/user/${encodeURIComponent(userId)}/profile`);
    if (!response.ok) {
      if (response.status === 404) {
        return null;
      }
      throw new Error(`Failed to fetch profile: ${response.status}`);
    }
    const data = await response.json();
    return data.profile;
  } catch (error) {
    console.error('[Backend API] Error fetching profile:', error);
    return null;
  }
};

/**
 * Get all verifications for a user from backend
 */
export const getUserVerifications = async (userId: string): Promise<any[]> => {
  try {
    const response = await fetch(`${BACKEND_URL}/user/${encodeURIComponent(userId)}/verifications`);
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch verifications: ${response.status}`);
    }
    const data = await response.json();
    return data.verifications || [];
  } catch (error) {
    console.error('[Backend API] Error fetching verifications:', error);
    return [];
  }
};

/**
 * Delete a verification for a user from backend
 */
export const deleteUserVerification = async (userId: string, provider: string): Promise<boolean> => {
  try {
    const response = await fetch(`${BACKEND_URL}/user/${encodeURIComponent(userId)}/verifications/${encodeURIComponent(provider)}`, {
      method: 'DELETE'
    });
    
    if (!response.ok) {
      if (response.status === 404) {
        console.warn(`[Backend API] Verification not found: ${provider} for user ${userId?.substring(0, 10)}...`);
        return false;
      }
      throw new Error(`Failed to delete verification: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`[Backend API] ✅ Verification deleted:`, data);
    return data.deleted === true;
  } catch (error) {
    console.error('[Backend API] Error deleting verification:', error);
    throw error;
  }
};

