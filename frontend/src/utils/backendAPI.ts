// Backend API client for verification system
// Backend URL: uses production URL from .env or fallback to localhost
// For production: set VITE_BACKEND_URL in .env.production or .env
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
  commitment?: string;
}

/**
 * Check if backend server is accessible
 */
const checkBackendAvailability = async (): Promise<boolean> => {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
    
    const response = await fetch(`${BACKEND_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-cache'
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error: any) {
    // Connection refused, timeout, or other network error
    return false;
  }
};

/**
 * Start verification flow for a provider (OAuth popup)
 * Opens OAuth flow in popup window and returns result via postMessage
 */
// Track active OAuth popups to prevent duplicates
const activeOAuthPopups = new Map<string, Window>();

export const startVerification = (provider: string, walletId: string): Promise<VerificationResult> => {
  return new Promise(async (resolve, reject) => {
    const popupKey = `${provider}_${walletId}`;
    if (activeOAuthPopups.has(popupKey)) {
      const existingPopup = activeOAuthPopups.get(popupKey);
      if (existingPopup && !existingPopup.closed) {
        console.log(`[OAuth] Popup already open for ${provider}, focusing existing window...`);
        existingPopup.focus();
        const checkInterval = setInterval(() => {
          if (existingPopup.closed) {
            clearInterval(checkInterval);
            activeOAuthPopups.delete(popupKey);
          }
        }, 500);
        return;
      } else {
        activeOAuthPopups.delete(popupKey);
      }
    }
    
    console.log(`[OAuth] Starting verification for provider: ${provider}, walletId: ${walletId}`);
    
    // Check if backend is available before opening popup
    console.log(`[OAuth] Checking backend availability at ${BACKEND_URL}...`);
    const isBackendAvailable = await checkBackendAvailability();
    
    if (!isBackendAvailable) {
      const errorDetails = {
        provider,
        walletId,
        reason: 'Backend server is not accessible (ERR_CONNECTION_REFUSED)',
        backendUrl: BACKEND_URL,
        possibleCauses: [
          `Backend server is not running on ${BACKEND_URL}`,
          'Backend server is not accessible',
          'Network connectivity issues',
          'Firewall or proxy blocking connection'
        ],
        solution: `Please start the backend server on ${BACKEND_URL}`
      };
      console.error(`[OAuth] Cannot start verification. Reason: Backend server is not accessible`, errorDetails);
      reject(new Error(`Backend server is not running or not accessible at ${BACKEND_URL}. Please start the backend server.`));
      return;
    }
    
    console.log(`[OAuth] Backend is available, opening OAuth popup...`);
    const url = `${BACKEND_URL}/auth/${provider}/start?walletId=${encodeURIComponent(walletId)}`;
    const popup = window.open(url, 'oauth', 'width=600,height=700');
    
    if (!popup) {
      const errorDetails = {
        provider,
        walletId,
        reason: 'Popup window blocked by browser',
        url,
        backendUrl: BACKEND_URL
      };
      console.error('[OAuth] Failed to open popup window. Reason: Popup blocked by browser', errorDetails);
      reject(new Error('Popup blocked. Please allow popups for this site.'));
      return;
    }
    
    // Cleanup if popup is closed manually
    let checkClosed: NodeJS.Timeout;
    
    // Listen for postMessage from popup
    const messageHandler = (event: MessageEvent) => {
      // 🔐 SECURITY: Accept messages from backend URL or frontend origin
      // Backend might be on ngrok, so we need to accept both
      const backendOrigin = new URL(BACKEND_URL).origin;
      const frontendOrigin = window.location.origin;
      
      // Accept messages from backend (ngrok) or frontend origin
      if (event.origin !== backendOrigin && event.origin !== frontendOrigin) {
        console.log('[OAuth] Ignoring message from unauthorized origin:', event.origin, 'Expected:', backendOrigin, 'or', frontendOrigin);
        return;
      }
      
      // 🔐 SECURITY: Validate message structure
      if (!event.data || typeof event.data !== 'object') {
        return;
      }
      
      // 🔐 SECURITY: Validate message type
      if (event.data.type === 'oauth-complete') {
        // 🔐 SECURITY: Validate result structure
        if (!event.data.result || typeof event.data.result !== 'object') {
          return;
        }
        
        const result = event.data.result;
        if (typeof result.score !== 'number' || !result.commitment || typeof result.commitment !== 'string') {
          return;
        }
        
        console.log(`[OAuth] Successfully verified ${provider}. Score: ${result.score}, Commitment: ${result.commitment}`);
        messageReceived = true;
        if (checkClosed) clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        // Don't close popup here - let backend close it after sending message
        // Small delay to ensure message is processed
        setTimeout(() => {
          if (!popup.closed) popup.close();
        }, 500);
        resolve(result);
      } else if (event.data.type === 'oauth-error') {
        const errorDetails = {
          provider,
          walletId,
          reason: event.data.error || 'OAuth verification failed',
          errorType: event.data.type,
          popupClosed: popup.closed,
          errorData: event.data
        };
        console.error(`[OAuth] Verification failed for ${provider}. Reason: ${event.data.error || 'OAuth verification failed'}`, errorDetails);
        if (checkClosed) clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        if (!popup.closed) popup.close();
        reject(new Error(event.data.error || 'OAuth verification failed'));
      }
    };
    
    window.addEventListener('message', messageHandler);
    
    // Track if we received a message
    let messageReceived = false;
    
    checkClosed = setInterval(() => {
      if (popup.closed) {
        clearInterval(checkClosed);
        window.removeEventListener('message', messageHandler);
        
        // If we received a message before popup closed, don't treat it as an error
        if (messageReceived) {
          console.log(`[OAuth] Popup closed after successful verification`);
          return;
        }
        
        // Popup was closed - could be user action or connection error
        // Since we already checked backend availability, this is likely user action
        const errorDetails = {
          provider,
          walletId,
          reason: 'Popup window was closed by user before completing OAuth flow',
          popupClosed: true,
          backendUrl: BACKEND_URL,
          note: 'Backend availability was checked before opening popup. If verification completed, check if result was received.'
        };
        console.error(`[OAuth] Popup was closed. Reason: User closed popup window before completing verification`, errorDetails);
        reject(new Error('OAuth popup was closed. If verification completed successfully, please refresh the page.'));
      }
    }, 1000);
    
    // Cleanup after 5 minutes
    setTimeout(() => {
      clearInterval(checkClosed);
      window.removeEventListener('message', messageHandler);
      if (!popup.closed) {
        popup.close();
      }
      const errorDetails = {
        provider,
        walletId,
        reason: 'OAuth verification timeout after 5 minutes',
        timeout: '5 minutes',
        popupClosed: popup.closed,
        backendUrl: BACKEND_URL
      };
      console.error(`[OAuth] Verification timeout. Reason: OAuth flow exceeded 5 minute timeout`, errorDetails);
      reject(new Error('OAuth verification timeout'));
    }, 5 * 60 * 1000);
  });
};

/**
 * Verify wallet (EVM/Solana) - sync endpoint
 */
export const verifyWallet = async (
  type: 'evm' | 'solana',
  address: string,
  signature: string,
  message: string,
  walletId: string
): Promise<VerificationResult> => {
  console.log(`[API] Verifying ${type} wallet: ${address}`);
  
  try {
    const response = await fetch(`${BACKEND_URL}/verify/wallet`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        type,
        address,
        signature,
        message,
        walletId
      })
    });

    if (!response.ok) {
      const error = await response.json();
      const errorDetails = {
        walletType: type,
        walletAddress: address,
        walletId,
        httpStatus: response.status,
        httpStatusText: response.statusText,
        reason: error.error || 'Failed to verify wallet',
        errorResponse: error,
        backendUrl: BACKEND_URL
      };
      console.error(`[API] Wallet verification failed for ${type}. Reason: ${error.error || 'Failed to verify wallet'}`, errorDetails);
      throw new Error(error.error || 'Failed to verify wallet');
    }

    const result = await response.json();
    console.log(`[API] Successfully verified ${type} wallet. Score: ${result.score}, Commitment: ${result.commitment || 'N/A'}`);
    return {
      verified: true,
      provider: type === 'evm' ? 'ethereum' : 'solana',
      score: result.score,
      criteria: result.criteria || [],
      maxScore: result.maxScore || result.score,
      commitment: result.commitment || ''
    };
  } catch (error: any) {
    // Handle network errors (ERR_CONNECTION_REFUSED, etc.)
    if (error.message?.includes('Failed to fetch') || 
        error.message?.includes('ERR_CONNECTION_REFUSED') ||
        error.message?.includes('NetworkError') ||
        error.name === 'TypeError' && error.message?.includes('fetch')) {
      const errorDetails = {
        walletType: type,
        walletAddress: address,
        walletId,
        reason: 'Backend server connection refused - server is not running or not accessible',
        errorMessage: error.message,
        errorName: error.name,
        backendUrl: BACKEND_URL,
        possibleCauses: [
          `Backend server is not running on ${BACKEND_URL}`,
          'Backend server is not accessible',
          'Network connectivity issues',
          'Firewall or proxy blocking connection'
        ]
      };
      console.error(`[API] Wallet verification failed for ${type}. Reason: Backend connection refused`, errorDetails);
      throw new Error(`Cannot connect to backend server at ${BACKEND_URL}. Please ensure the backend server is running.`);
    }
    
    // Re-throw other errors
    const errorDetails = {
      walletType: type,
      walletAddress: address,
      walletId,
      reason: error.message || 'Unknown error',
      type: error?.constructor?.name || typeof error,
      stack: error?.stack,
      backendUrl: BACKEND_URL
    };
    console.error(`[API] Wallet verification failed for ${type}. Reason: ${error.message || 'Unknown error'}`, errorDetails);
    throw error;
  }
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
      return null;
    }
    return await response.json();
  } catch (error) {
    return null;
  }
};

// Legacy functions removed - use verifyWallet instead

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
    return null;
  }
};

/**
 * Get all verifications for a user from backend
 */
export const getUserVerifications = async (userId: string): Promise<any[]> => {
  try {
    // Create AbortController for timeout (more compatible than AbortSignal.timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
    const response = await fetch(`${BACKEND_URL}/user/${encodeURIComponent(userId)}/verifications`, {
      signal: controller.signal
    });
    
    clearTimeout(timeoutId);
    if (!response.ok) {
      if (response.status === 404) {
        return [];
      }
      throw new Error(`Failed to fetch verifications: ${response.status}`);
    }
    const data = await response.json();
    return data.verifications || [];
  } catch (error: any) {
    // Silently handle all errors (backend might not be running, timeout, etc.)
    if (error.name === 'AbortError') {
      // Timeout - backend is not responding
      return [];
    }
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
        return false;
      }
      throw new Error(`Failed to delete verification: ${response.status}`);
    }
    
    const data = await response.json();
    return data.deleted === true;
  } catch (error) {
    throw error;
  }
};

