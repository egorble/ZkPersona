import React, { useEffect, useState } from 'react';
import { X, Wallet, Loader2, AlertCircle } from 'lucide-react';
import { createAppKit } from '@reown/appkit/react';
import { EthersAdapter } from '@reown/appkit-adapter-ethers';
import { ethers } from 'ethers';

interface WalletConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string, provider: any) => void;
  chainId?: number; // 1 for mainnet, 11155111 for Sepolia
}

// Initialize AppKit once
let appKitInitialized = false;
let appKitInstance: any = null;

const initializeAppKit = () => {
  if (appKitInitialized || typeof window === 'undefined') return;

  const projectId = import.meta.env.VITE_WALLETCONNECT_PROJECT_ID || 'YOUR_PROJECT_ID';

  try {
    appKitInstance = createAppKit({
      adapters: [new EthersAdapter()],
      projectId: projectId === 'YOUR_PROJECT_ID' ? 'a01e2f3b960c1bb5b5161565959a' : projectId, // Demo project ID
      metadata: {
        name: 'ZkPersona',
        description: 'Zero-Knowledge Persona Verification',
        url: window.location.origin,
        icons: [`${window.location.origin}/favicon.ico`]
      },
      features: {
        analytics: true,
        email: false,
        socials: false,
        emailShowWallets: false
      }
    });

    appKitInitialized = true;
  } catch (error) {
    // Silently handle initialization errors
  }
};

export const WalletConnectModal: React.FC<WalletConnectModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  chainId = 1
}) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && !appKitInitialized) {
      initializeAppKit();
    }
  }, [isOpen]);

  const handleConnect = async () => {
    try {
      setConnecting(true);
      setError(null);

      let provider: any = null;

      // Try to use direct window.ethereum first (MetaMask, Coinbase Wallet, etc.)
      if (typeof window !== 'undefined' && (window as any).ethereum) {
        try {
          const ethereum = (window as any).ethereum;
          // Request account access
          await ethereum.request({ method: 'eth_requestAccounts' });
          provider = ethereum;
          console.log('[EVM Wallet] Connected via direct wallet extension (MetaMask/Coinbase/etc)');
        } catch (directError: any) {
          if (directError.code === 4001) {
            throw new Error('Connection rejected by user');
          }
          // If direct connection fails, try WalletConnect
          console.log('[EVM Wallet] Direct connection failed, trying WalletConnect...');
        }
      }

      // If no direct wallet, try WalletConnect
      if (!provider) {
        // Initialize AppKit if not already done
        if (!appKitInitialized) {
          initializeAppKit();
        }

        if (appKitInstance) {
          // Open WalletConnect modal
          provider = await appKitInstance.open();
          if (provider) {
            console.log('[EVM Wallet] Connected via WalletConnect');
          }
        }
      }

      if (!provider) {
        throw new Error('No EVM wallet found. Please install MetaMask, Coinbase Wallet, or another EVM wallet extension. WalletConnect requires VITE_WALLETCONNECT_PROJECT_ID in .env');
      }

      // Get address and chain ID
      let address: string;
      let currentChainId: bigint;

      // For direct wallet (window.ethereum), use direct API
      if (provider === (window as any).ethereum) {
        const accounts = await provider.request({ method: 'eth_requestAccounts' });
        if (!accounts || accounts.length === 0) {
          throw new Error('No accounts found. Please unlock your wallet.');
        }
        address = accounts[0];
        
        const chainIdHex = await provider.request({ method: 'eth_chainId' });
        currentChainId = BigInt(typeof chainIdHex === 'string' ? parseInt(chainIdHex, 16) : chainIdHex);
      } else {
        // For WalletConnect, use ethers
        const ethersProvider = new ethers.BrowserProvider(provider);
        const signer = await ethersProvider.getSigner();
        address = await signer.getAddress();
        const network = await ethersProvider.getNetwork();
        currentChainId = network.chainId;
      }

      // Check if correct chain
      if (currentChainId !== BigInt(chainId)) {
        // Try to switch network
        try {
          await provider.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: `0x${chainId.toString(16)}` }],
          });
        } catch (switchError: any) {
          if (switchError.code === 4902) {
            // Chain not added, add it
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

            await provider.request({
              method: 'wallet_addEthereumChain',
              params: [chainConfig],
            });
          } else {
            throw switchError;
          }
        }
      }

      console.log(`[WalletConnect] Successfully connected EVM wallet: ${address} on chain ${chainId}`);
      onConnect(address, provider);
      onClose();
    } catch (err: any) {
      if (err.message?.includes('rejected') || err.message?.includes('User rejected')) {
        console.log('[WalletConnect] Connection rejected by user');
        setError('Connection rejected by user');
      } else {
        const errorDetails = {
          reason: err.message || 'Unknown error',
          type: err?.constructor?.name || typeof err,
          stack: err?.stack,
          errorCode: err?.code,
          errorName: err?.name,
          chainId,
          hasAppKitInstance: !!appKitInstance,
          appKitInitialized
        };
        console.error(`[WalletConnect] Connection error. Reason: ${err.message || 'Unknown error'}`, errorDetails);
        setError(err.message || 'Failed to connect wallet');
      }
    } finally {
      setConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm transition-opacity duration-300"
      style={{ animation: 'fadeIn 0.3s ease-in' }}
      onClick={onClose}
    >
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full mx-4 p-6 relative transition-all duration-300"
        style={{ animation: 'zoomIn 0.3s ease-out' }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="text-center mb-6">
          <div className="mb-4 flex justify-center">
            <Wallet size={48} className="text-white" />
          </div>
          <h2 className="text-2xl font-bold font-mono uppercase text-white mb-2">
            Connect EVM Wallet
          </h2>
          <p className="text-neutral-400 text-sm font-mono">
            Connect your Ethereum wallet (MetaMask, Coinbase Wallet, WalletConnect, etc.)
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded text-red-400 text-sm font-mono">
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleConnect}
            disabled={connecting}
            className="w-full px-6 py-3 bg-white text-black font-mono uppercase text-sm hover:bg-neutral-100 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 hover:scale-105 active:scale-95 relative overflow-hidden"
            style={{
              animation: connecting ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined
            }}
          >
            {connecting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span>Connecting...</span>
              </>
            ) : (
              <>
                <Wallet size={16} />
                <span>Connect Wallet</span>
              </>
            )}
          </button>

          <p className="text-xs text-neutral-500 font-mono text-center">
            Supports MetaMask, Coinbase Wallet, and other EVM wallets. WalletConnect available if configured.
          </p>
        </div>
      </div>
    </div>
  );
};
