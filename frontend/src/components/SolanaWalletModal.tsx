import React, { useState, useEffect } from 'react';
import { X, Wallet, Loader2, AlertCircle } from 'lucide-react';

interface SolanaWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (address: string, provider: any) => void;
}

export const SolanaWalletModal: React.FC<SolanaWalletModalProps> = ({
  isOpen,
  onClose,
  onConnect
}) => {
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [availableWallets, setAvailableWallets] = useState<Array<{ name: string; installed: boolean; icon?: string }>>([]);

  useEffect(() => {
    if (isOpen) {
      // Check for available Solana wallets
      const wallets = [];
      
      // Check Phantom
      const phantom = (window as any).phantom?.solana;
      if (phantom) {
        wallets.push({ name: 'Phantom', installed: true });
      } else {
        wallets.push({ name: 'Phantom', installed: false });
      }

      // Check Solflare
      const solflare = (window as any).solflare;
      if (solflare) {
        wallets.push({ name: 'Solflare', installed: true });
      } else {
        wallets.push({ name: 'Solflare', installed: false });
      }

      // Check Backpack
      const backpack = (window as any).backpack;
      if (backpack) {
        wallets.push({ name: 'Backpack', installed: true });
      } else {
        wallets.push({ name: 'Backpack', installed: false });
      }

      setAvailableWallets(wallets);
    }
  }, [isOpen]);

  const handleConnect = async (walletName: string) => {
    try {
      setConnecting(true);
      setError(null);

      let provider: any = null;

      // Get the appropriate wallet provider
      if (walletName === 'Phantom') {
        provider = (window as any).phantom?.solana;
        if (!provider) {
          throw new Error('Phantom wallet not found. Please install Phantom extension.');
        }
      } else if (walletName === 'Solflare') {
        provider = (window as any).solflare;
        if (!provider) {
          throw new Error('Solflare wallet not found. Please install Solflare extension.');
        }
      } else if (walletName === 'Backpack') {
        provider = (window as any).backpack;
        if (!provider) {
          throw new Error('Backpack wallet not found. Please install Backpack extension.');
        }
      } else {
        throw new Error(`Unknown wallet: ${walletName}`);
      }

      // Connect to wallet
      const response = await provider.connect();
      
      if (!response || !response.publicKey) {
        throw new Error('Failed to connect to wallet');
      }

      const address = response.publicKey.toString();
      console.log(`[SolanaWallet] Successfully connected ${walletName} wallet: ${address}`);
      onConnect(address, provider);
      onClose();
    } catch (err: any) {
      if (err.message?.includes('rejected') || err.message?.includes('User rejected')) {
        console.log(`[SolanaWallet] Connection rejected by user for ${walletName}`);
        setError('Connection rejected by user');
      } else if (err.message?.includes('not found')) {
        // Open wallet install page
        const walletUrls: Record<string, string> = {
          'Phantom': 'https://phantom.app/',
          'Solflare': 'https://solflare.com/',
          'Backpack': 'https://www.backpack.app/'
        };
        if (walletUrls[err.message.split(' ')[0]]) {
          window.open(walletUrls[err.message.split(' ')[0]], '_blank');
        }
        console.error(`[SolanaWallet] Wallet not found: ${walletName}`);
        setError(err.message);
      } else {
        const errorDetails = {
          walletName,
          reason: err.message || 'Unknown error',
          type: err?.constructor?.name || typeof err,
          stack: err?.stack,
          errorCode: err?.code,
          errorName: err?.name
        };
        console.error(`[SolanaWallet] Connection error for ${walletName}. Reason: ${err.message || 'Unknown error'}`, errorDetails);
        setError(err.message || 'Failed to connect wallet');
      }
    } finally {
      setConnecting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full mx-4 p-6 relative">
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
            Connect Solana Wallet
          </h2>
          <p className="text-neutral-400 text-sm font-mono">
            Choose your Solana wallet to connect
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
          {availableWallets.map((wallet) => (
            <button
              key={wallet.name}
              onClick={() => handleConnect(wallet.name)}
              disabled={connecting || !wallet.installed}
              className="w-full px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white font-mono uppercase text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                {connecting ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : (
                  <Wallet size={16} />
                )}
                <span>{wallet.name}</span>
              </div>
              {!wallet.installed && (
                <span className="text-xs text-neutral-400">Install</span>
              )}
            </button>
          ))}

          <p className="text-xs text-neutral-500 font-mono text-center mt-4">
            Don't have a wallet? Install Phantom, Solflare, or Backpack extension
          </p>
        </div>
      </div>
    </div>
  );
};
