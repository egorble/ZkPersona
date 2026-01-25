import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Check, Loader2, AlertCircle, Wallet } from 'lucide-react';
import { getVerificationInstructions, initiateOAuth } from '../utils/verificationProviders';
import { VerificationScoreCard } from './VerificationScoreCard';
import { useVerification } from '../hooks/useVerification';
import { VERIFICATION_CONFIGS } from '../services/verificationService';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';

interface VerificationInstructionsProps {
  isOpen: boolean;
  onClose: () => void;
  selectedStamps: string[];
  onStartVerification: (stampId: string) => void;
}

export const VerificationInstructions: React.FC<VerificationInstructionsProps> = ({
  isOpen,
  onClose,
  selectedStamps,
  onStartVerification
}) => {
  const { publicKey } = useWallet();
  const { verifications, verifyProvider, verifying, getVerification } = useVerification(publicKey || undefined);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [connectedWalletInfo, setConnectedWalletInfo] = useState<{ address: string; provider: string } | null>(null);
  const [showWalletRequiredModal, setShowWalletRequiredModal] = useState(false);

  // Load connected wallet info on mount and when modal opens
  useEffect(() => {
    if (isOpen) {
      const address = localStorage.getItem('wallet_address');
      const provider = localStorage.getItem('wallet_provider');
      if (address && provider) {
        setConnectedWalletInfo({ address, provider });
      }
    }
  }, [isOpen]);

  // Check for OAuth callback
  useEffect(() => {
    if (!isOpen) return;

    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('code');
    const state = urlParams.get('state');
    const providerId = urlParams.get('provider');

    if (code && state && providerId) {
      // OAuth callback - exchange code for token and verify
      handleOAuthCallback(providerId, code, state);
    }
  }, [isOpen]);

  const handleOAuthCallback = async (providerId: string, code: string, state: string) => {
    try {
      // TODO: Exchange code for access token via backend
      // For now, mock - in production this should be done server-side
      
      // After getting access token, verify provider
      // const accessToken = await exchangeCodeForToken(providerId, code);
      // await verifyProvider(providerId, { accessToken });
      
      // Remove callback params from URL
      window.history.replaceState({}, '', window.location.pathname);
    } catch (error) {
      console.error('[OAuth] Callback error:', error);
    }
  };

  if (!isOpen) return null;

  const handleStartVerification = async (stampId: string) => {
    // Check if wallet is connected
    if (!publicKey) {
      setShowWalletRequiredModal(true);
      return;
    }

    // Check if already verified
    const existing = getVerification(stampId);
    if (existing?.verified && existing.status === 'connected') {
      alert(`Already verified. Score: ${existing.score} points.`);
      return;
    }

    // Get passport ID from connected wallet (use full publicKey, not truncated)
    const passportId = publicKey || 
                      localStorage.getItem('passport_id') || 
                      localStorage.getItem('aleo_public_key') || 
                      'default';
    
    if (!publicKey) {
      console.error('[VerificationInstructions] ❌ No publicKey available for passportId');
    }
    
    console.log('[VerificationInstructions] 📝 Using passportId:', {
      hasPublicKey: !!publicKey,
      passportId: passportId.substring(0, 20) + '...',
      passportIdLength: passportId.length
    });
    
    localStorage.setItem('passport_id', passportId);

    // Normalize provider ID
    const providerId = stampId === 'eth_wallet' ? 'evm' : stampId;

    // Handle EVM Wallet (SIWE via backend)
    if (stampId === 'ethereum' || stampId === 'eth_wallet') {
      setConnectingWallet(stampId);
      try {
        // Start backend verification flow - redirects to /verify/evm
        const { startVerification } = await import('../utils/backendAPI');
        
        console.log(`[EVM] 🔐 Starting EVM verification via backend...`);
        startVerification('evm', passportId);
        // Note: startVerification redirects, so code below won't execute
        return;
      } catch (error) {
        console.error('[EVM] Error starting verification:', error);
        alert('Failed to start verification. Please try again.');
        setConnectingWallet(null);
      }
      return;
    }

    // Handle Solana Wallet (via backend)
    if (stampId === 'solana') {
      setConnectingWallet(stampId);
      try {
        // Start backend verification flow - redirects to /verify/solana
        const { startVerification } = await import('../utils/backendAPI');
        
        console.log(`[Solana] 🔐 Starting Solana verification via backend...`);
        startVerification('solana', passportId);
        // Note: startVerification redirects, so code below won't execute
        return;
      } catch (error) {
        console.error('[Solana] Error starting verification:', error);
        alert('Failed to start verification. Please try again.');
        setConnectingWallet(null);
      }
      return;
    }

    // Handle OAuth providers (Discord, Telegram, TikTok) - All via backend
    if (['discord', 'telegram', 'tiktok'].includes(stampId)) {
      try {
        const { startVerification } = await import('../utils/backendAPI');
        
        // Use backend for all OAuth providers (no frontend env needed)
        console.log(`[OAuth] 🔐 Starting ${stampId} OAuth flow via backend...`);
        startVerification(stampId, passportId);
        return;
      } catch (error) {
        console.error(`[OAuth] Error starting ${stampId} verification:`, error);
        const errorMsg = error instanceof Error ? error.message : String(error);
        alert(`Failed to start ${stampId} verification: ${errorMsg}\n\nPlease check backend configuration.`);
      }
      return;
    }
    
    // For other providers (EVM wallet, etc.)
    const provider = getVerificationInstructions(stampId);
    if (provider.steps.length > 0) {
      alert(`Verification for ${provider.provider} requires manual setup. Please follow the instructions above.`);
    }
    
    // For other providers (blockchain, AI), trigger verification flow
    onStartVerification(stampId);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md overflow-y-auto transition-opacity duration-300"
      style={{ animation: 'fadeIn 0.3s ease-in' }}
    >
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all duration-300"
        style={{ animation: 'zoomIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-2xl font-bold font-mono uppercase text-white">
              Verification Instructions
            </h2>
            <p className="text-neutral-400 text-sm mt-1 font-mono">
              Follow these steps to verify your selected methods
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="space-y-8">
            {(() => {
              // Filter out already connected providers
              const unverifiedStamps = selectedStamps.filter((stampId) => {
                const verificationId = stampId === 'eth_wallet' ? 'ethereum' : stampId;
                const verification = getVerification(verificationId);
                const isConnected = verification?.verified && verification.status === 'connected';
                return !isConnected;
              });

              // If all are already verified, show message
              if (unverifiedStamps.length === 0 && selectedStamps.length > 0) {
                return (
                  <div className="text-center py-12">
                    <div className="mb-4">
                      <Check size={48} className="text-green-500 mx-auto" />
                    </div>
                    <h3 className="text-xl font-bold font-mono uppercase text-white mb-2">
                      All Selected Providers Verified
                    </h3>
                    <p className="text-neutral-400 text-sm font-mono">
                      All selected verification methods are already connected and verified.
                    </p>
                  </div>
                );
              }

              return unverifiedStamps.map((stampId) => {
              const instructions = getVerificationInstructions(stampId);
              // Normalize stampId for verification lookup
              const verificationId = stampId === 'eth_wallet' ? 'ethereum' : stampId;
              const verification = getVerification(verificationId);
              const isVerifying = verifying === verificationId;
              const isEVM = stampId === 'ethereum' || stampId === 'eth_wallet';
              const isSolana = stampId === 'solana';
              const config = VERIFICATION_CONFIGS[verificationId] || VERIFICATION_CONFIGS[stampId];
              
              const isConnected = verification?.verified && verification.status === 'connected';
              
              // Debug log
              if (isConnected) {
                console.log(`[VerificationInstructions] ✅ ${stampId} (${verificationId}) is connected - hiding instructions`);
              }
              
              return (
                <div
                  key={stampId}
                  className="border border-neutral-800 rounded-lg p-6 bg-neutral-950 space-y-4"
                >
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold font-mono uppercase text-white mb-2">
                        {instructions.provider}
                      </h3>
                      {/* Show connected wallet info for EVM and Solana */}
                      {(isEVM || isSolana) && connectedWalletInfo && (
                        <div className="mt-2 p-3 bg-neutral-900 border border-neutral-700 rounded text-sm">
                          <div className="flex items-center gap-2 text-neutral-300">
                            <span className="font-mono text-xs">Connected:</span>
                            <span className="font-mono text-white">{connectedWalletInfo.address.slice(0, 6)}...{connectedWalletInfo.address.slice(-4)}</span>
                            <span className="text-neutral-500">via {connectedWalletInfo.provider}</span>
                          </div>
                        </div>
                      )}
                      {/* Show verification result */}
                      {verification?.verified && (
                        <div className="mt-2 p-3 bg-green-950/30 border border-green-800/50 rounded">
                          <div className="flex items-center justify-between">
                            <span className="text-green-400 font-mono text-sm">✓ Verified</span>
                            <span className="text-green-400 font-bold font-mono">{verification.score} / {config?.maxScore || 35} pts</span>
                          </div>
                          {verification.criteria && verification.criteria.length > 0 && (
                            <div className="mt-2 space-y-1">
                              {verification.criteria.map((criterion, idx) => (
                                <div key={idx} className="text-xs text-green-300 font-mono">
                                  • {criterion.condition}: +{criterion.points} pts
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => handleStartVerification(stampId)}
                      disabled={isVerifying || connectingWallet === stampId || isConnected}
                      className={`px-4 py-2 font-mono uppercase text-sm transition-colors ${
                        isConnected
                          ? 'bg-green-950 text-green-400 border border-green-800 cursor-not-allowed'
                          : isVerifying || connectingWallet === stampId
                          ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-neutral-100'
                      }`}
                    >
                      {connectingWallet === stampId ? (
                        <>
                          <Loader2 size={14} className="inline animate-spin mr-2" />
                          Connecting Wallet...
                        </>
                      ) : isVerifying ? (
                        <>
                          <Loader2 size={14} className="inline animate-spin mr-2" />
                          Verifying...
                        </>
                      ) : isConnected ? (
                        `✓ Verified (${verification.score} pts)`
                      ) : (
                        'Start Verification'
                      )}
                    </button>
                  </div>

                  {/* Score Card */}
                  <VerificationScoreCard
                    providerId={stampId}
                    currentScore={verification?.score || 0}
                    achievedCriteria={verification?.criteria || []}
                  />
                </div>
              );
              });
            })()}
          </div>
        </div>
      </div>

      {/* Wallet Required Modal */}
      {showWalletRequiredModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md"
          onClick={() => setShowWalletRequiredModal(false)}
        >
          <div 
            className="bg-black border border-neutral-700 max-w-md w-full p-8 relative shadow-2xl"
            onClick={(e) => e.stopPropagation()}
            style={{ animation: 'zoomIn 0.3s ease-out' }}
          >
            <button 
              onClick={() => setShowWalletRequiredModal(false)} 
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
                  Wallet connection required for verification
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 bg-neutral-900 border border-neutral-800 rounded">
                <p className="text-white font-mono text-sm leading-relaxed">
                  Please connect your wallet first to proceed with verification. 
                  Without a connected wallet, it's impossible to save verification results and earn points.
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

              <button
                onClick={() => setShowWalletRequiredModal(false)}
                className="w-full px-6 py-3 bg-white text-black font-mono uppercase text-sm hover:bg-neutral-100 transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

