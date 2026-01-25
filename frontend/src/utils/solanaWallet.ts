// Solana Wallet Connection Utilities
// Supports Phantom, Solflare, and other Solana wallets

export interface SolanaWalletInfo {
  address: string;
  publicKey: any; // Solana PublicKey object
  provider: any; // Solana wallet provider
}

/**
 * Request connection to Solana wallet (Phantom, Solflare, etc.)
 */
export const connectSolanaWallet = async (): Promise<SolanaWalletInfo | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  // Check for Phantom wallet
  const phantom = (window as any).phantom?.solana;
  const solflare = (window as any).solflare;
  
  let provider = phantom || solflare;

  if (!provider) {
    throw new Error('No Solana wallet found. Please install Phantom or Solflare wallet.');
  }

  try {
    // Request connection
    const response = await provider.connect();
    
    if (!response || !response.publicKey) {
      throw new Error('Failed to connect to Solana wallet');
    }

    const address = response.publicKey.toString();

    return {
      address,
      publicKey: response.publicKey,
      provider
    };
  } catch (error: any) {
    if (error.code === 4001 || error.message?.includes('reject')) {
      throw new Error('Wallet connection rejected by user.');
    }
    throw error;
  }
};

/**
 * Check if Solana wallet is already connected
 */
export const getConnectedSolanaWallet = async (): Promise<SolanaWalletInfo | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const phantom = (window as any).phantom?.solana;
  const solflare = (window as any).solflare;
  
  const provider = phantom || solflare;

  if (!provider) {
    return null;
  }

  try {
    // Check if already connected
    if (provider.isConnected) {
      const publicKey = provider.publicKey;
      if (publicKey) {
        return {
          address: publicKey.toString(),
          publicKey,
          provider
        };
      }
    }
    
    return null;
  } catch (error) {
    return null;
  }
};

/**
 * Sign a message with connected Solana wallet
 * Used for wallet ownership verification
 */
export const signSolanaMessage = async (
  message: string,
  address?: string
): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  const phantom = (window as any).phantom?.solana;
  const solflare = (window as any).solflare;
  
  const provider = phantom || solflare;

  if (!provider) {
    throw new Error('No Solana wallet found');
  }

  try {
    // Convert message to Uint8Array
    const messageBytes = new TextEncoder().encode(message);
    
    // Sign message
    const signedMessage = await provider.signMessage(messageBytes, 'utf8');
    
    // Return signature as base58 string
    // Solana signatures are typically base58 encoded
    if (signedMessage.signature) {
      // If using @solana/web3.js, convert to base58
      // For now, return as hex string
      return Array.from(signedMessage.signature)
        .map(b => b.toString(16).padStart(2, '0'))
        .join('');
    }
    
    throw new Error('Failed to get signature from wallet');
  } catch (error: any) {
    if (error.code === 4001 || error.message?.includes('reject')) {
      throw new Error('Message signing rejected by user');
    }
    throw error;
  }
};

/**
 * Get wallet provider name
 */
export const getSolanaWalletProviderName = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const phantom = (window as any).phantom?.solana;
  const solflare = (window as any).solflare;

  if (phantom) {
    return 'Phantom';
  }
  if (solflare) {
    return 'Solflare';
  }

  return null;
};

/**
 * Disconnect Solana wallet
 */
export const disconnectSolanaWallet = async (): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  const phantom = (window as any).phantom?.solana;
  const solflare = (window as any).solflare;
  
  const provider = phantom || solflare;

  if (provider && provider.disconnect) {
    try {
      await provider.disconnect();
    } catch (error) {
      console.warn('[Solana] Error disconnecting wallet:', error);
    }
  }
};
