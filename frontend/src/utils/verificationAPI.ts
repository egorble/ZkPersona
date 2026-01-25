// Verification API Client
// Following Gitcoin Passport fetchVerifiableCredential pattern

import axios from 'axios';

export type RequestPayload = {
  type: string;
  types: string[];
  version: string;
  address: string;
  proofs: Record<string, string>;
  signatureType?: string;
};

export type VerifiedResponse = {
  verified: boolean;
  provider: string;
  userId?: string;
  username?: string;
  score?: number;
  criteria?: Record<string, any>;
  commitment?: string;
  maxScore?: number;
  errors?: string[];
};

export type VerificationResponse = {
  credentials: VerifiedResponse[];
};

/**
 * Fetch verifiable credential from backend
 * Following Gitcoin Passport fetchVerifiableCredential pattern
 * 
 * This calls backend /verify endpoint with OAuth code
 * and returns verification result
 * 
 * @param backendUrl - Backend API URL (default: http://localhost:3001)
 * @param payload - Request payload with provider type and proofs
 * @returns Promise with verification response
 */
export const fetchVerifiableCredential = async (
  backendUrl: string = 'http://localhost:3001',
  payload: RequestPayload
): Promise<VerificationResponse> => {
  try {
    const verifyUrl = `${backendUrl}/verify`;
    
    console.log('[Verification] 📤 Sending verification request:', {
      type: payload.type,
      types: payload.types,
      address: payload.address?.substring(0, 10) + '...'
    });

    const response = await axios.post<VerificationResponse>(
      verifyUrl,
      { payload },
      {
        headers: {
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('[Verification] ✅ Verification response received:', {
      credentialsCount: response.data.credentials?.length || 0
    });

    return response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const errorMessage = error.response?.data?.error || error.message;
      console.error('[Verification] ❌ Verification error:', errorMessage);
      throw new Error(`Verification failed: ${errorMessage}`);
    }
    throw error;
  }
};

/**
 * Fetch verifiable credential with fallback error handling
 * Following Gitcoin Passport fetchVerifiableCredentialWithFallback pattern
 * 
 * @param backendUrl - Backend API URL
 * @param payload - Request payload
 * @param onError - Optional error handler callback
 * @returns Promise with verification response
 */
export const fetchVerifiableCredentialWithFallback = async (
  backendUrl: string = 'http://localhost:3001',
  payload: RequestPayload,
  onError?: (error: Error) => void
): Promise<VerificationResponse> => {
  try {
    return await fetchVerifiableCredential(backendUrl, payload);
  } catch (error) {
    const err = error instanceof Error ? error : new Error(String(error));
    
    if (onError) {
      onError(err);
    }
    
    // Re-throw for caller to handle
    throw err;
  }
};

