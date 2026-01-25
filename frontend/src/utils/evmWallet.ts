// EVM Wallet Connection Utilities
// Supports MetaMask, WalletConnect, and other EIP-1193 compatible wallets

export interface EVMWalletInfo {
  address: string;
  chainId: number;
  provider: any; // EIP-1193 provider
}

/**
 * Request connection to EVM wallet (MetaMask, WalletConnect, etc.)
 */
export const connectEVMWallet = async (): Promise<EVMWalletInfo | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  // Safe access to window.ethereum with protection against redefinition conflicts
  let ethereum = (window as any).ethereum;
  
  // Check if ethereum is already defined and not configurable (conflict protection)
  const descriptor = Object.getOwnPropertyDescriptor(window, 'ethereum');
  if (descriptor && !descriptor.configurable) {
    console.warn('[EVM Wallet] window.ethereum is already defined and not configurable, using existing instance');
  }

  if (!ethereum) {
    // Try to open WalletConnect or show instructions
    throw new Error('No EVM wallet found. Please install MetaMask or connect via WalletConnect.');
  }

  try {
    // Request account access
    const accounts = await ethereum.request({ method: 'eth_requestAccounts' });
    
    if (!accounts || accounts.length === 0) {
      throw new Error('No accounts found. Please unlock your wallet.');
    }

    const address = accounts[0];
    
    // Get chain ID
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    const chainIdNumber = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;

    return {
      address,
      chainId: chainIdNumber,
      provider: ethereum
    };
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('Wallet connection rejected by user.');
    }
    throw error;
  }
};

/**
 * Check if EVM wallet is already connected
 */
export const getConnectedEVMWallet = async (): Promise<EVMWalletInfo | null> => {
  if (typeof window === 'undefined') {
    return null;
  }

  const ethereum = (window as any).ethereum;

  if (!ethereum) {
    return null;
  }

  try {
    const accounts = await ethereum.request({ method: 'eth_accounts' });
    
    if (!accounts || accounts.length === 0) {
      return null;
    }

    const address = accounts[0];
    const chainId = await ethereum.request({ method: 'eth_chainId' });
    const chainIdNumber = typeof chainId === 'string' ? parseInt(chainId, 16) : chainId;

    return {
      address,
      chainId: chainIdNumber,
      provider: ethereum
    };
  } catch (error) {
    return null;
  }
};

/**
 * Switch to Ethereum Mainnet (chainId: 1) or Sepolia Testnet (chainId: 11155111)
 */
export const switchToEthereumNetwork = async (chainId: number = 1): Promise<void> => {
  if (typeof window === 'undefined') {
    return;
  }

  const ethereum = (window as any).ethereum;

  if (!ethereum) {
    throw new Error('No EVM wallet found.');
  }

  try {
    await ethereum.request({
      method: 'wallet_switchEthereumChain',
      params: [{ chainId: `0x${chainId.toString(16)}` }],
    });
  } catch (switchError: any) {
    // This error code indicates that the chain has not been added to MetaMask
    if (switchError.code === 4902) {
      // Try to add the chain
      const chainConfig = chainId === 1 ? {
        chainId: '0x1',
        chainName: 'Ethereum Mainnet',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://eth.llamarpc.com'],
        blockExplorerUrls: ['https://etherscan.io']
      } : {
        chainId: '0xaa36a7',
        chainName: 'Sepolia',
        nativeCurrency: { name: 'ETH', symbol: 'ETH', decimals: 18 },
        rpcUrls: ['https://sepolia.infura.io/v3/'],
        blockExplorerUrls: ['https://sepolia.etherscan.io']
      };

      await ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [chainConfig],
      });
    } else {
      throw switchError;
    }
  }
};

/**
 * Get wallet provider name
 */
export const getWalletProviderName = (): string | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  const ethereum = (window as any).ethereum;

  if (!ethereum) {
    return null;
  }

  // Check for known providers
  if (ethereum.isMetaMask) {
    return 'MetaMask';
  }
  if (ethereum.isCoinbaseWallet) {
    return 'Coinbase Wallet';
  }
  if (ethereum.isBraveWallet) {
    return 'Brave Wallet';
  }
  if (ethereum.isTrust) {
    return 'Trust Wallet';
  }
  if (ethereum.isRabby) {
    return 'Rabby';
  }
  if (ethereum.isPhantom) {
    return 'Phantom';
  }

  return 'EVM Wallet';
};

/**
 * Get all available EVM wallet providers
 */
export const getAvailableWallets = (): Array<{ name: string; icon?: string; provider: any }> => {
  if (typeof window === 'undefined') {
    return [];
  }

  const wallets: Array<{ name: string; icon?: string; provider: any }> = [];
  const ethereum = (window as any).ethereum;

  if (!ethereum) {
    return [];
  }

  // Check for known providers
  if (ethereum.isMetaMask) {
    wallets.push({ name: 'MetaMask', provider: ethereum });
  }
  if (ethereum.isCoinbaseWallet) {
    wallets.push({ name: 'Coinbase Wallet', provider: ethereum });
  }
  if (ethereum.isBraveWallet) {
    wallets.push({ name: 'Brave Wallet', provider: ethereum });
  }
  if (ethereum.isTrust) {
    wallets.push({ name: 'Trust Wallet', provider: ethereum });
  }
  if (ethereum.isRabby) {
    wallets.push({ name: 'Rabby', provider: ethereum });
  }
  if (ethereum.isPhantom) {
    wallets.push({ name: 'Phantom', provider: ethereum });
  }

  // If no specific provider detected, add generic EVM wallet
  if (wallets.length === 0 && ethereum) {
    wallets.push({ name: 'EVM Wallet', provider: ethereum });
  }

  return wallets;
};

/**
 * Sign a message with connected EVM wallet
 * Used for wallet ownership verification
 */
export const signMessage = async (
  message: string,
  address?: string
): Promise<string> => {
  if (typeof window === 'undefined') {
    throw new Error('Window is not available');
  }

  const ethereum = (window as any).ethereum;

  if (!ethereum) {
    throw new Error('No EVM wallet found');
  }

  try {
    // If address not provided, get from connected accounts
    let signerAddress = address;
    if (!signerAddress) {
      const accounts = await ethereum.request({ method: 'eth_accounts' });
      if (!accounts || accounts.length === 0) {
        throw new Error('No connected account found');
      }
      signerAddress = accounts[0];
    }

    // Sign message using personal_sign
    const signature = await ethereum.request({
      method: 'personal_sign',
      params: [message, signerAddress],
    });

    return signature;
  } catch (error: any) {
    if (error.code === 4001) {
      throw new Error('Message signing rejected by user');
    }
    throw error;
  }
};

