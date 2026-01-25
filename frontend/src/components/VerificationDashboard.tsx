// Verification Dashboard Component
// Shows verification status for each provider with explicit user-driven flows

import React, { useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  Loader2, 
  Wallet, 
  MessageCircle,
  Video, 
  MessageSquare, 
  AlertCircle
} from 'lucide-react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { useVerification } from '../hooks/useVerification';
import { VERIFICATION_CONFIGS } from '../services/verificationService';
import { WalletRequiredModal } from './WalletRequiredModal';

export type VerificationStatus = 'idle' | 'in_progress' | 'verified' | 'failed';

interface ProviderStatus {
  id: string;
  name: string;
  icon: React.ReactNode;
  status: VerificationStatus;
  score: number;
  maxScore: number;
  error?: string;
}

interface VerificationDashboardProps {
  passportId?: string;
  onVerify: (providerId: string) => void;
}

export const VerificationDashboard: React.FC<VerificationDashboardProps> = ({
  passportId,
  onVerify
}) => {
  const { publicKey } = useWallet();
  const { verifications, getVerification, verifying } = useVerification(publicKey || undefined);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  if (!publicKey) {
    return (
      <>
        <div className="p-8 border border-neutral-800 bg-surface text-center">
          <p className="text-neutral-400 font-mono text-sm mb-4">Connect your wallet to view verification dashboard</p>
          <button
            onClick={handleConnectWallet}
            className="px-6 py-3 bg-white text-black font-mono uppercase text-sm hover:bg-neutral-100 transition-colors"
          >
            Connect Wallet
          </button>
        </div>
        <WalletRequiredModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onConnect={handleConnectWallet}
          action="view verification dashboard"
        />
      </>
    );
  }

  const providers: Array<{
    id: string;
    name: string;
    icon: React.ReactNode;
    category: 'onchain' | 'social' | 'other';
  }> = [
    { id: 'ethereum', name: 'EVM Wallet', icon: <Wallet size={20} />, category: 'onchain' },
    { id: 'solana', name: 'Solana Wallet', icon: <Wallet size={20} />, category: 'onchain' },
    { id: 'discord', name: 'Discord', icon: <MessageSquare size={20} />, category: 'social' },
    { id: 'telegram', name: 'Telegram', icon: <MessageCircle size={20} />, category: 'social' },
    { id: 'tiktok', name: 'TikTok', icon: <Video size={20} />, category: 'social' },
  ];

  const getProviderStatus = (providerId: string): ProviderStatus => {
    const verification = getVerification(providerId);
    const config = VERIFICATION_CONFIGS[providerId];
    const isVerifying = verifying === providerId;

    let status: VerificationStatus = 'idle';
    if (isVerifying) {
      status = 'in_progress';
    } else if (verification?.verified) {
      status = 'verified';
    } else if (verification?.status === 'expired') {
      status = 'idle'; // Expired = needs re-verification
    }

    return {
      id: providerId,
      name: providers.find(p => p.id === providerId)?.name || providerId,
      icon: providers.find(p => p.id === providerId)?.icon || <Globe size={20} />,
      status,
      score: verification?.score || 0,
      maxScore: config?.maxScore || 0,
      error: verification?.status === 'failed' ? 'Verification failed' : undefined
    };
  };

  const filteredProviders = providers.filter(p => {
    if (selectedCategory === 'all') return true;
    return p.category === selectedCategory;
  });

  return (
    <div className="space-y-6">
      {/* Category Filters */}
      <div className="flex flex-wrap gap-3">
        <button
          onClick={() => setSelectedCategory('all')}
          className={`px-4 py-2 font-mono uppercase text-sm transition-all ${
            selectedCategory === 'all'
              ? 'bg-white text-black'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
          }`}
        >
          All Platforms
        </button>
        <button
          onClick={() => setSelectedCategory('social')}
          className={`px-4 py-2 font-mono uppercase text-sm transition-all ${
            selectedCategory === 'social'
              ? 'bg-white text-black'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
          }`}
        >
          Social Networks
        </button>
        <button
          onClick={() => setSelectedCategory('onchain')}
          className={`px-4 py-2 font-mono uppercase text-sm transition-all ${
            selectedCategory === 'onchain'
              ? 'bg-white text-black'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
          }`}
        >
          On-chain
        </button>
        <button
          onClick={() => setSelectedCategory('other')}
          className={`px-4 py-2 font-mono uppercase text-sm transition-all ${
            selectedCategory === 'other'
              ? 'bg-white text-black'
              : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
          }`}
        >
          Other
        </button>
      </div>

      {/* Provider Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProviders.map((provider) => {
          const status = getProviderStatus(provider.id);
          
          return (
            <div
              key={provider.id}
              className="border border-neutral-800 rounded-lg p-6 bg-neutral-950 hover:border-neutral-700 transition-colors"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-neutral-900 border border-neutral-800 rounded">
                    {provider.icon}
                  </div>
                  <div>
                    <h3 className="font-mono font-bold text-white text-sm uppercase">
                      {status.name}
                    </h3>
                    <p className="text-xs text-neutral-500 font-mono mt-1">
                      Max: {status.maxScore} pts
                    </p>
                  </div>
                </div>
                
                {/* Status Icon */}
                <div className="flex-shrink-0">
                  {status.status === 'verified' && (
                    <CheckCircle className="w-5 h-5 text-green-500" />
                  )}
                  {status.status === 'in_progress' && (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  )}
                  {status.status === 'failed' && (
                    <XCircle className="w-5 h-5 text-red-500" />
                  )}
                  {status.status === 'idle' && (
                    <AlertCircle className="w-5 h-5 text-neutral-500" />
                  )}
                </div>
              </div>

              {/* Score Display */}
              {status.status === 'verified' && (
                <div className="mb-4 p-3 bg-green-950/30 border border-green-800/50 rounded">
                  <div className="flex items-center justify-between">
                    <span className="text-green-400 font-mono text-xs">Score</span>
                    <span className="text-green-400 font-bold font-mono">
                      {status.score} / {status.maxScore}
                    </span>
                  </div>
                </div>
              )}

              {/* Error Display */}
              {status.error && (
                <div className="mb-4 p-3 bg-red-950/30 border border-red-800/50 rounded">
                  <p className="text-red-400 font-mono text-xs">{status.error}</p>
                </div>
              )}

              {/* Action Button */}
              <button
                onClick={() => onVerify(provider.id)}
                disabled={status.status === 'in_progress' || status.status === 'verified'}
                className={`w-full px-4 py-2 font-mono uppercase text-sm transition-all ${
                  status.status === 'verified'
                    ? 'bg-green-950 text-green-400 border border-green-800 cursor-not-allowed'
                    : status.status === 'in_progress'
                    ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                    : 'bg-white text-black hover:bg-neutral-100'
                }`}
              >
                {status.status === 'in_progress' ? (
                  <>
                    <Loader2 size={14} className="inline animate-spin mr-2" />
                    Verifying...
                  </>
                ) : status.status === 'verified' ? (
                  <>
                    <CheckCircle size={14} className="inline mr-2" />
                    Verified ({status.score} pts)
                  </>
                ) : (
                  'Start Verification'
                )}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
};

