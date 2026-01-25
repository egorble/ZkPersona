import React from 'react';
import { X, Wallet, AlertCircle } from 'lucide-react';

interface WalletRequiredModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConnect: () => void;
  action?: string; // Optional: specific action that requires wallet (e.g., "view profile", "view transaction history")
}

export const WalletRequiredModal: React.FC<WalletRequiredModalProps> = ({
  isOpen,
  onClose,
  onConnect,
  action = "perform this action"
}) => {
  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
      onClick={onClose}
      style={{ animation: 'fadeIn 0.3s ease-in' }}
    >
      <div 
        className="bg-black border border-neutral-700 max-w-md w-full p-8 relative shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        style={{ animation: 'zoomIn 0.3s ease-out' }}
      >
        <button 
          onClick={onClose} 
          className="absolute top-4 right-4 text-neutral-500 hover:text-white transition-colors"
        >
          <X size={20} />
        </button>

        <div className="mb-6 flex items-center gap-4">
          <div className="p-3 bg-yellow-900/30 border border-yellow-800/50 rounded">
            <AlertCircle className="w-6 h-6 text-yellow-500" />
          </div>
          <div>
            <h2 className="text-xl font-mono uppercase text-white mb-1">Wallet Not Connected</h2>
            <p className="text-neutral-400 text-sm font-mono">
              Wallet connection required to {action}
            </p>
          </div>
        </div>

        <div className="space-y-4">
          <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
            <p className="text-white font-mono text-sm leading-relaxed">
              Please connect your wallet first to proceed. 
              Without a connected wallet, it's impossible to access wallet-related features and data.
            </p>
          </div>

          <div className="flex items-center gap-3 p-3 bg-neutral-900 border border-neutral-800 rounded">
            <Wallet className="w-5 h-5 text-neutral-400" />
            <div>
              <p className="text-white font-mono text-xs uppercase mb-1">How to connect:</p>
              <p className="text-neutral-400 font-mono text-xs">
                Click the "Connect Wallet" button in the top right corner of the screen
              </p>
            </div>
          </div>

          <div className="flex gap-3 mt-6">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-neutral-800 text-neutral-300 font-mono uppercase text-sm hover:bg-neutral-700 hover:text-white transition-colors border border-neutral-700"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                // Dispatch event to open wallet modal (used by App.tsx)
                window.dispatchEvent(new CustomEvent('open-wallet-modal'));
                onConnect();
                onClose();
              }}
              className="flex-1 px-6 py-3 bg-white text-black font-mono uppercase text-sm hover:bg-neutral-100 transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
