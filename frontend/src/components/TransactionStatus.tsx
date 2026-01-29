import React, { useEffect, useState } from 'react';
import { Loader2, CheckCircle, XCircle, ExternalLink } from 'lucide-react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletRequiredModal } from './WalletRequiredModal';
import { fetchTransactionDetailsFromAnyExplorer, getFunctionDisplayName } from '../utils/explorerAPI';

// Add keyframes for animations
const style = document.createElement('style');
style.textContent = `
  @keyframes pulse-bar {
    0%, 100% { width: 30%; opacity: 0.6; }
    50% { width: 70%; opacity: 1; }
  }
  .animate-pulse-bar {
    animation: pulse-bar 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
  }
`;
if (!document.head.querySelector('style[data-transaction-status]')) {
  style.setAttribute('data-transaction-status', 'true');
  document.head.appendChild(style);
}

export type TransactionStatusType = 'pending' | 'confirmed' | 'failed' | 'waiting';

interface TransactionStatusProps {
  txId: string | null;
  status: TransactionStatusType;
  onConfirm: () => void;
  onError: () => void;
  functionName?: string; // Optional: function name to display
}

export const TransactionStatus: React.FC<TransactionStatusProps> = ({
  txId,
  status,
  onConfirm,
  onError,
  functionName: propFunctionName
}) => {
  const { publicKey } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [dots, setDots] = useState('');
  const [transactionFunctionName, setTransactionFunctionName] = useState<string | null>(null);

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  // If wallet is not connected, show wallet required modal instead
  if (!publicKey) {
    return (
      <WalletRequiredModal
        isOpen={true}
        onClose={onError}
        onConnect={handleConnectWallet}
        action="view transaction status"
      />
    );
  }

  useEffect(() => {
    if (status === 'waiting') {
      const interval = setInterval(() => {
        setDots(prev => {
          if (prev.length >= 3) return '';
          return prev + '.';
        });
      }, 500);
      return () => clearInterval(interval);
    }
  }, [status]);

  const [isClosing, setIsClosing] = useState(false);

  // Fetch transaction details to get function name (try Provable, then Aleo testnet3)
  useEffect(() => {
    if (txId && !propFunctionName) {
      fetchTransactionDetailsFromAnyExplorer(txId)
        .then(txDetails => {
          if (txDetails?.function || txDetails?.functionName) {
            setTransactionFunctionName(txDetails.function || txDetails.functionName || null);
          }
        })
        .catch(() => {
          // Silent fail - not critical
        });
    } else if (propFunctionName) {
      setTransactionFunctionName(propFunctionName);
    }
  }, [txId, propFunctionName]);

  const displayFunctionName = transactionFunctionName 
    ? getFunctionDisplayName(transactionFunctionName)
    : null;

  useEffect(() => {
    // Close immediately after signing (pending status)
    if (status === 'pending') {
      const timer = setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          onConfirm();
        }, 300); // Wait for fade-out animation
      }, 1000); // Show "Transaction Signed" for 1 second
      return () => clearTimeout(timer);
    }
    if (status === 'confirmed') {
      const timer = setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          onConfirm();
        }, 300);
      }, 2000);
      return () => clearTimeout(timer);
    }
    if (status === 'failed') {
      const timer = setTimeout(() => {
        setIsClosing(true);
        setTimeout(() => {
          onError();
        }, 300);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [status, onConfirm, onError]);

  // Provable testnet (we deploy there) and Aleo testnet3 (Leo Wallet may use either)
  const provableUrl = txId
    ? `https://testnet.explorer.provable.com/transaction/${txId}`
    : null;
  const aleoExplorerUrl = txId
    ? `https://explorer.aleo.org/testnet3/transaction/${txId}`
    : null;

  return (
    <div 
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/80 ${
        isClosing ? 'opacity-0' : 'opacity-100'
      }`}
      style={{
        animation: isClosing ? 'fadeOut 0.3s ease-out' : 'fadeIn 0.3s ease-in'
      }}
    >
      <div 
        className={`bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full mx-4 p-8 shadow-2xl ${
          isClosing ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
        }`}
        style={{
          animation: isClosing ? 'zoomOut 0.3s ease-out' : 'zoomIn 0.3s ease-out'
        }}
      >
        <div className="flex flex-col items-center text-center">
          {status === 'waiting' && (
            <>
              <div className="mb-6 text-white">
                <Loader2 size={64} className="animate-spin mx-auto" />
              </div>
              <h3 className="text-2xl font-bold font-mono uppercase text-white mb-3 animate-pulse">
                Waiting for Wallet{dots}
              </h3>
              <p className="text-neutral-300 text-sm font-mono mb-4">
                Please confirm the transaction in your Leo Wallet
              </p>
              <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div className="bg-white h-full animate-pulse-bar" style={{ width: '60%' }}></div>
              </div>
            </>
          )}

          {status === 'pending' && (
            <>
              <div className="mb-4 text-green-500 animate-in" style={{ animation: 'zoomIn 0.3s ease-out' }}>
                <CheckCircle size={48} />
              </div>
              <h3 className="text-xl font-bold font-mono uppercase text-white mb-2">
                Transaction Signed!
              </h3>
              {transactionFunctionName && (
                <div className="text-neutral-300 text-xs font-mono mb-2 space-y-1">
                  <p>Function: <span className="text-white">{transactionFunctionName}</span></p>
                  {displayFunctionName !== transactionFunctionName && (
                    <p className="text-neutral-400">({displayFunctionName})</p>
                  )}
                </div>
              )}
              <p className="text-neutral-400 text-sm font-mono mb-4">
                Your transaction has been signed and submitted to the blockchain
              </p>
              {txId && (
                <div className="flex flex-col gap-2">
                  <a
                    href={provableUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:text-neutral-300 flex items-center gap-2 font-mono underline"
                  >
                    View on Provable Explorer
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href={aleoExplorerUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-400 hover:text-neutral-300 flex items-center gap-2 font-mono underline"
                  >
                    View on Aleo Explorer (testnet3)
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
              <p className="text-xs text-neutral-500 font-mono mt-4">
                Closing automatically...
              </p>
            </>
          )}

          {status === 'confirmed' && (
            <>
              <div className="mb-4 text-green-500">
                <CheckCircle size={48} />
              </div>
              <h3 className="text-xl font-bold font-mono uppercase text-white mb-2">
                Transaction Confirmed!
              </h3>
              {transactionFunctionName && (
                <div className="text-neutral-300 text-xs font-mono mb-2 space-y-1">
                  <p>Function: <span className="text-white">{transactionFunctionName}</span></p>
                  {displayFunctionName !== transactionFunctionName && (
                    <p className="text-neutral-400">({displayFunctionName})</p>
                  )}
                </div>
              )}
              <p className="text-neutral-400 text-sm font-mono mb-4">
                {transactionFunctionName === 'claim_points' 
                  ? 'Claim points setup complete. You can now claim.'
                  : 'Transaction confirmed successfully'}
              </p>
              {txId && (
                <div className="flex flex-col gap-2">
                  <a
                    href={provableUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:text-neutral-300 flex items-center gap-2 font-mono underline"
                  >
                    View on Provable Explorer
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href={aleoExplorerUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-400 hover:text-neutral-300 flex items-center gap-2 font-mono underline"
                  >
                    View on Aleo Explorer (testnet3)
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </>
          )}

          {status === 'failed' && (
            <>
              <div className="mb-4 text-red-500">
                <XCircle size={48} />
              </div>
              <h3 className="text-xl font-bold font-mono uppercase text-white mb-2">
                Transaction Failed
              </h3>
              <p className="text-neutral-400 text-sm font-mono mb-4">
                The transaction could not be completed. Please try again.
              </p>
              {txId && (
                <div className="flex flex-col gap-2">
                  <a
                    href={provableUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-white hover:text-neutral-300 flex items-center gap-2 font-mono underline"
                  >
                    View on Provable Explorer
                    <ExternalLink size={14} />
                  </a>
                  <a
                    href={aleoExplorerUrl || '#'}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-neutral-400 hover:text-neutral-300 flex items-center gap-2 font-mono underline"
                  >
                    View on Aleo Explorer (testnet3)
                    <ExternalLink size={14} />
                  </a>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

