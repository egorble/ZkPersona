import React, { useEffect, useState } from 'react';
import { X, ExternalLink, Check, Loader2, AlertCircle, Wallet, Coins, Clock } from 'lucide-react';
import { GlobalLoader } from './GlobalLoader';
import { getVerificationInstructions, initiateOAuth } from '../utils/verificationProviders';
import { VerificationScoreCard } from './VerificationScoreCard';
import { useVerification } from '../hooks/useVerification';
import { VERIFICATION_CONFIGS } from '../services/verificationService';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletAdapterNetwork, Transaction } from '@demox-labs/aleo-wallet-adapter-base';
import { requestTransactionWithRetry } from '../utils/walletUtils';
import { SolanaWalletModal } from './SolanaWalletModal';
import { connectEVMWallet, signMessage } from '../utils/evmWallet';
import { connectSolanaWallet, signSolanaMessage } from '../utils/solanaWallet';
import { startVerification, verifyWallet, VerificationResult } from '../utils/backendAPI';
import { providerToPlatformId } from '../utils/platformMapping';
import { PROGRAM_ID } from '../deployed_program';

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
  const { publicKey, wallet } = useWallet();
  const adapter = wallet?.adapter as any;
  const network = WalletAdapterNetwork.TestnetBeta;
  const { verifications, verifying, getVerification, saveVerificationResult } = useVerification(publicKey || undefined);
  const [connectingWallet, setConnectingWallet] = useState<string | null>(null);
  const [connectedWalletInfo, setConnectedWalletInfo] = useState<{ address: string; provider: string } | null>(null);
  const [showWalletRequiredModal, setShowWalletRequiredModal] = useState(false);
  const [showEVMWalletModal, setShowEVMWalletModal] = useState(false);
  const [showSolanaWalletModal, setShowSolanaWalletModal] = useState(false);
  const [currentWalletId, setCurrentWalletId] = useState<string | null>(null);
  
  // GITCOIN PASSPORT MODEL: Verification result state (not stored in localStorage)
  const [verificationResults, setVerificationResults] = useState<Record<string, VerificationResult & { commitment: string }>>({});
  const [claimingProvider, setClaimingProvider] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [successModalProvider, setSuccessModalProvider] = useState<string | null>(null);

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

  // GITCOIN PASSPORT MODEL: No OAuth callback handling - all done via postMessage

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

    const walletId = publicKey || 
                      localStorage.getItem('wallet_id') || 
                      localStorage.getItem('aleo_public_key') || 
                      'default';
    localStorage.setItem('wallet_id', walletId);

    // Normalize provider ID
    const providerId = stampId === 'eth_wallet' ? 'evm' : stampId;

    // Handle EVM Wallet - DISABLED (Coming Soon)
    if (stampId === 'ethereum' || stampId === 'eth_wallet') {
      alert('EVM Wallet verification is coming soon. Please check back later.');
      return;
    }

    if (stampId === 'solana') {
      setCurrentWalletId(walletId);
      setShowSolanaWalletModal(true);
      return;
    }

    // Handle OAuth providers (Discord, Twitter) - Popup flow
    if (['discord', 'twitter'].includes(stampId)) {
      try {
        setIsVerifying(stampId);
        setIsLoading(true);
        console.log(`[Verification] Starting OAuth verification for ${stampId}`);
        const result = await startVerification(stampId, walletId);
        
        // Store result in component state (for immediate UI update)
        setVerificationResults(prev => ({
          ...prev,
          [stampId]: { ...result, commitment: result.commitment || '' }
        }));
        
        // IMPORTANT: Save to persistent storage via useVerification hook
        // This ensures result persists after page reload
        saveVerificationResult(stampId, {
          score: result.score,
          criteria: result.criteria || [],
          metadataHash: result.commitment || ''
        });
        
        console.log(`[Verification] Successfully verified ${stampId}. Score: ${result.score}, Commitment: ${result.commitment}`);
        console.log(`[Verification] Result saved to persistent storage`);
        setSuccessModalProvider(stampId);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        
        // Check for connection errors
        const isConnectionError = errorMsg.includes('connection refused') || 
                                  errorMsg.includes('ERR_CONNECTION_REFUSED') ||
                                  errorMsg.includes('Cannot connect to backend') ||
                                  errorMsg.includes('Backend server');
        
        const errorDetails = {
          provider: stampId,
          walletId,
          message: errorMsg,
          stack: errorStack,
          type: error instanceof Error ? error.constructor.name : typeof error,
          isConnectionError,
          backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
          possibleCauses: isConnectionError ? [
            'Backend server is not running',
            'Backend server is not accessible',
            'Network connectivity issues'
          ] : undefined
        };
        
        console.error(`[Verification] Failed to verify ${stampId}. Reason: ${errorMsg}`, errorDetails);
        
        // Show user-friendly error message
        const userMessage = isConnectionError 
          ? `Cannot connect to backend server. Please ensure the backend server is running on ${errorDetails.backendUrl}`
          : `Failed to verify ${stampId}: ${errorMsg}`;
        
        alert(userMessage);
      } finally {
        setIsVerifying(null);
        setIsLoading(false);
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

  // Одна транзакція claim_verification: поінти на підключений акаунт, без паспорта та ініціалізації
  const handleClaimPoints = async (provider: string, _fromSuccessModal?: boolean) => {
    if (!publicKey || !adapter?.requestTransaction) {
      alert('Please connect Aleo wallet first');
      return;
    }

    let result = verificationResults[provider];
    if (!result) {
      const persisted = getVerification(provider);
      if (persisted?.verified && persisted?.commitment) {
        result = {
          score: persisted.score,
          commitment: persisted.commitment,
          criteria: persisted.criteria || []
        };
      }
    }
    if (!result || !result.commitment) {
      alert('Verify first (e.g. connect Discord), then click Claim Points.');
      return;
    }

    const platformId = providerToPlatformId(provider);
    if (platformId === 0) {
      alert(`Unsupported provider: ${provider}`);
      return;
    }

    let commitment = result.commitment;
    if (!commitment.endsWith('field')) commitment = commitment + 'field';
    const points = Math.round(Number(result.score)) || 1;
    const pointsU64 = `${points}u64`;

    try {
      setClaimingProvider(provider);
      console.log(`[Claim Points] Claiming ${points} pts for ${provider}`);
      console.log(`[Claim Points] Transaction Inputs: [${platformId}u8, ${commitment}, ${pointsU64}]`);
      console.log(`[Claim Points] Program ID: ${PROGRAM_ID}`);

      const transaction = Transaction.createTransaction(
        publicKey,
        WalletAdapterNetwork.Testnet,
        PROGRAM_ID,
        'claim_verification',
        [`${platformId}u8`, commitment, pointsU64],
        50_000,
        false
      );

      const txId = await requestTransactionWithRetry(adapter, transaction, {
        timeout: 60_000,
        maxRetries: 3
      });
      console.log(`[Claim Points] Successfully claimed ${result.score} points for ${provider}. Transaction ID: ${txId}`);

      const explorerUrl = `https://testnet.explorer.provable.com/transaction/${txId}`;
      const msg = txId.startsWith("at")
        ? `Points claimed!\n\nProvider: ${provider}\nPoints: ${result.score}\n\nTransaction: ${txId.slice(0, 12)}...\n\nOpen in explorer: ${explorerUrl}`
        : `Points claimed!\n\nProvider: ${provider}\nPoints: ${result.score}\n\nIf the transaction doesn't appear in the explorer, open Leo Wallet → Transaction history and open the transaction there to get the real tx id.`;
      alert(msg);
      if (txId.startsWith("at")) {
        window.open(explorerUrl, "_blank");
      }
      
      setVerificationResults(prev => {
        const next = { ...prev };
        delete next[provider];
        return next;
      });
      setClaimingProvider(null);
    } catch (error: any) {
      console.error(`[Claim Points] Failed for ${provider}:`, error?.message || error);
      alert(error?.message || 'Failed to claim points. Try again.');
      setClaimingProvider(null);
    }
  };

  if (isLoading && isVerifying) {
    return (
      <GlobalLoader 
        fullScreen 
        message={`Verifying ${isVerifying}...`}
      />
    );
  }

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 overflow-y-auto"
      style={{ animation: 'fadeIn 0.3s ease-in' }}
    >
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-4xl w-full mx-4 my-8 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl"
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
              // Show stamps that need verification OR verified with commitment (Telegram/Solana/Discord) so user can Claim
              const unverifiedStamps = selectedStamps.filter((stampId) => {
                const verificationId = stampId === 'eth_wallet' ? 'ethereum' : stampId;
                const verification = getVerification(verificationId);
                const isConnected = verification?.verified && verification.status === 'connected';
                const canClaim = verification?.commitment && ['twitter', 'solana', 'discord'].includes(stampId);
                return !isConnected || canClaim;
              });

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
                      {/* Show "Coming Soon" message for EVM */}
                      {isEVM && (
                        <div className="mt-2 p-3 bg-neutral-900 border border-neutral-700 rounded text-sm">
                          <div className="flex items-center gap-2 text-neutral-400">
                            <Clock size={14} />
                            <span className="font-mono text-xs">EVM Wallet verification is coming soon</span>
                          </div>
                        </div>
                      )}
                      {/* Show connected wallet info for Solana */}
                      {isSolana && connectedWalletInfo && (
                        <div className="mt-2 p-3 bg-neutral-900 border border-neutral-700 rounded text-sm">
                          <div className="flex items-center gap-2 text-neutral-300">
                            <span className="font-mono text-xs">Connected:</span>
                            <span className="font-mono text-white">{connectedWalletInfo.address.slice(0, 6)}...{connectedWalletInfo.address.slice(-4)}</span>
                            <span className="text-neutral-500">via {connectedWalletInfo.provider}</span>
                          </div>
                        </div>
                      )}
                      {/* Single card: verified state and/or claim points (no duplicate blocks) */}
                      {(verification?.verified || verificationResults[stampId]) && (
                        <div className="mt-2 p-3 bg-green-950/30 border border-green-800/50 rounded">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-green-400 font-mono text-sm flex items-center gap-1.5">
                              <Check size={14} className="shrink-0" />
                              Verified
                            </span>
                            <span className="text-green-400 font-bold font-mono">
                              {(verificationResults[stampId]?.score ?? verification?.score) ?? 0} / {config?.maxScore || 35} pts
                            </span>
                          </div>
                          {((verificationResults[stampId]?.criteria ?? verification?.criteria) || []).length > 0 && (
                            <div className="mt-2 space-y-1">
                              {((verificationResults[stampId]?.criteria ?? verification?.criteria) || []).map((criterion: { condition: string; points: number }, idx: number) => (
                                <div key={idx} className="text-xs text-green-300 font-mono flex items-center gap-1.5">
                                  <span className="text-green-500">-</span>
                                  {criterion.condition}: +{criterion.points} pts
                                </div>
                              ))}
                            </div>
                          )}
                          {['twitter', 'solana', 'discord'].includes(stampId) && (verification?.commitment || verificationResults[stampId]?.commitment) && (
                            <>
                              <div className="mt-3 p-2 bg-green-900/20 border border-green-700/30 rounded text-xs text-green-300 font-mono">
                                Claim points to add them to your wallet on-chain.
                              </div>
                              <button
                                onClick={() => handleClaimPoints(stampId)}
                                disabled={claimingProvider === stampId || !publicKey}
                                className="mt-3 w-full px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-neutral-800 disabled:text-neutral-400 text-white font-mono uppercase text-sm flex items-center justify-center gap-2"
                              >
                                {claimingProvider === stampId ? (
                                  <>
                                    <Loader2 size={14} className="animate-spin" />
                                    Claiming...
                                  </>
                                ) : (
                                  <>
                                    <Coins size={14} />
                                    Claim Points
                                  </>
                                )}
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => {
                        // Disable EVM wallet verification
                        if (stampId === 'ethereum' || stampId === 'eth_wallet') {
                          return;
                        }
                        handleStartVerification(stampId);
                      }}
                      disabled={
                        isVerifying === stampId || 
                        connectingWallet === stampId || 
                        isConnected ||
                        successModalProvider === stampId ||
                        (stampId === 'ethereum' || stampId === 'eth_wallet')
                      }
                      className={`px-4 py-2 font-mono uppercase text-sm relative overflow-hidden flex items-center justify-center gap-2 ${
                        (stampId === 'ethereum' || stampId === 'eth_wallet')
                          ? 'bg-neutral-900 text-neutral-500 border border-neutral-800 cursor-not-allowed'
                          : isConnected
                          ? 'bg-green-950 text-green-400 border border-green-800 cursor-not-allowed'
                          : isVerifying === stampId || connectingWallet === stampId
                          ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
                          : 'bg-white text-black hover:bg-neutral-100 hover:scale-105 active:scale-95'
                      }`}
                      style={{
                        animation: isVerifying === stampId || connectingWallet === stampId 
                          ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' 
                          : undefined
                      }}
                    >
                      {(stampId === 'ethereum' || stampId === 'eth_wallet') ? (
                        <>
                          <Clock size={14} className="inline mr-2" />
                          Coming Soon
                        </>
                      ) : connectingWallet === stampId ? (
                        <>
                          <Loader2 size={14} className="inline animate-spin mr-2" />
                          Connecting Wallet...
                        </>
                      ) : isVerifying === stampId ? (
                        <>
                          <Loader2 size={14} className="inline animate-spin mr-2" />
                          Verifying...
                        </>
                      ) : isConnected ? (
                        <>
                          <Check size={14} className="shrink-0" />
                          Verified ({verification.score} pts)
                        </>
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

      {/* Success modal: "Connected successfully" + Claim points button (no auto-claim) */}
      {successModalProvider && (() => {
        const res = verificationResults[successModalProvider];
        const name = successModalProvider === 'discord' ? 'Discord' : successModalProvider === 'twitter' ? 'Twitter' : 'Solana';
        return (
          <div
            className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/80"
            onClick={() => setSuccessModalProvider(null)}
          >
            <div
              className="bg-neutral-900 border border-neutral-700 rounded-lg max-w-md w-full p-8 relative shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setSuccessModalProvider(null)}
                className="absolute top-4 right-4 text-neutral-400 hover:text-white transition-colors"
              >
                <X size={22} />
              </button>
              <div className="text-center pt-2">
                <div className="mb-4">
                  <Check size={56} className="text-green-500 mx-auto" />
                </div>
                <h2 className="text-xl font-mono font-bold text-white uppercase mb-1">
                  {name} connected successfully
                </h2>
                <p className="text-neutral-400 font-mono text-sm mb-6">
                  Score: <span className="text-white font-semibold">{res?.score ?? 0}</span> pts
                </p>
                <p className="text-neutral-500 font-mono text-xs mb-6">
                  Claim points to add them to your wallet on-chain.
                </p>
                <button
                  onClick={async () => {
                    if (!successModalProvider || !res) return;
                    try {
                      await handleClaimPoints(successModalProvider, true);
                      setSuccessModalProvider(null);
                    } catch {
                      // keep modal open so user can retry
                    }
                  }}
                  disabled={claimingProvider === successModalProvider || !publicKey || !res}
                  className="inline-flex items-center justify-center gap-2 px-8 py-3 bg-white text-black font-mono uppercase text-sm font-semibold hover:bg-neutral-100 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {claimingProvider === successModalProvider ? (
                    <>
                      <Loader2 size={18} className="animate-spin" />
                      Claiming...
                    </>
                  ) : (
                    <>
                      <Coins size={18} />
                      Claim points
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {showWalletRequiredModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80"
          style={{ animation: 'fadeIn 0.3s ease-in' }}
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
                className="w-full px-6 py-3 bg-white text-black font-mono uppercase text-sm hover:bg-neutral-100 relative overflow-hidden"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}

      {/* EVM WalletConnect Modal - DISABLED (Coming Soon) */}
      {/* <WalletConnectModal
        isOpen={showEVMWalletModal}
        onClose={() => {
          setShowEVMWalletModal(false);
          setCurrentWalletId(null);
        }}
        onConnect={async (address, provider) => {
          if (!currentWalletId) return;
          
          try {
            setConnectingWallet('eth_wallet');
            setIsLoading(true);

            // Create SIWE message
            const domain = window.location.host;
            const origin = window.location.origin;
            const statement = 'Verify wallet ownership for this app';
            const message = `${domain} wants you to sign in with your Ethereum account:\n${address}\n\n${statement}\n\nURI: ${origin}\nVersion: 1\nChain ID: 1\nNonce: ${Date.now()}\nIssued At: ${new Date().toISOString()}`;

            // Sign message
            const ethersProvider = new (await import('ethers')).BrowserProvider(provider);
            const signer = await ethersProvider.getSigner();
            const signature = await signer.signMessage(message);

            // Verify wallet (sync, no sessions)
            console.log(`[Verification] Verifying EVM wallet: ${address}`);
            const result = await verifyWallet('evm', address, signature, message, currentWalletId);

            // Store result
            setVerificationResults(prev => ({
              ...prev,
              'ethereum': { ...result, commitment: result.commitment || '' }
            }));
            console.log(`[Verification] Successfully verified EVM wallet. Score: ${result.score}, Commitment: ${result.commitment}`);

            // Close modal
            setShowEVMWalletModal(false);
            setCurrentWalletId(null);
            setConnectingWallet(null);
            setIsLoading(false);
          } catch (error: any) {
            const errorMsg = error.message || 'Unknown error';
            const isConnectionError = errorMsg.includes('connection refused') || 
                                      errorMsg.includes('ERR_CONNECTION_REFUSED') ||
                                      errorMsg.includes('Cannot connect to backend') ||
                                      errorMsg.includes('Backend server');
            
            const errorDetails = {
              walletAddress: address,
              walletId: currentWalletId,
              reason: errorMsg,
              type: error?.constructor?.name || typeof error,
              stack: error?.stack,
              errorCode: error?.code,
              errorName: error?.name,
              isConnectionError,
              backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
              possibleCauses: isConnectionError ? [
                'Backend server is not running',
                'Backend server is not accessible',
                'Network connectivity issues'
              ] : undefined
            };
            console.error(`[Verification] Failed to verify EVM wallet. Reason: ${errorMsg}`, errorDetails);
            
            const userMessage = isConnectionError 
              ? `Cannot connect to backend server. Please ensure the backend server is running on ${errorDetails.backendUrl}`
              : errorMsg;
            
            alert(userMessage);
            setConnectingWallet(null);
            setIsLoading(false);
          }
        }}
        chainId={1}
      /> */}

      {/* Solana Wallet Modal */}
      <SolanaWalletModal
        isOpen={showSolanaWalletModal}
        onClose={() => {
          setShowSolanaWalletModal(false);
          setCurrentWalletId(null);
        }}
        onConnect={async (address, provider) => {
          if (!currentWalletId) return;
          
          try {
            setConnectingWallet('solana');
            setIsLoading(true);

            // Create SIWE-like message
            const domain = window.location.host;
            const origin = window.location.origin;
            const statement = 'Verify wallet ownership for this app';
            const message = `${domain} wants you to sign in with your Solana account:\n${address}\n\n${statement}\n\nURI: ${origin}\nVersion: 1\nNonce: ${Date.now()}\nIssued At: ${new Date().toISOString()}`;

            // Sign message
            const messageBytes = new TextEncoder().encode(message);
            const signedMessage = await provider.signMessage(messageBytes, 'utf8');
            const signature = Array.from(signedMessage.signature)
              .map(b => b.toString(16).padStart(2, '0'))
              .join('');

            // Verify wallet (sync, no sessions)
            console.log(`[Verification] Verifying Solana wallet: ${address}`);
            const result = await verifyWallet('solana', address, signature, message, currentWalletId);

            setVerificationResults(prev => ({
              ...prev,
              'solana': { ...result, commitment: result.commitment || '' }
            }));
            saveVerificationResult('solana', {
              score: result.score,
              criteria: result.criteria || [],
              metadataHash: result.commitment || ''
            });
            console.log(`[Verification] Successfully verified Solana wallet. Score: ${result.score}, Commitment: ${result.commitment}`);

            setShowSolanaWalletModal(false);
            setCurrentWalletId(null);
            setConnectingWallet(null);
            setIsLoading(false);
            setSuccessModalProvider('solana');
          } catch (error: any) {
            const errorMsg = error.message || 'Unknown error';
            const isConnectionError = errorMsg.includes('connection refused') || 
                                      errorMsg.includes('ERR_CONNECTION_REFUSED') ||
                                      errorMsg.includes('Cannot connect to backend') ||
                                      errorMsg.includes('Backend server');
            
            const errorDetails = {
              walletAddress: address,
              walletId: currentWalletId,
              reason: errorMsg,
              type: error?.constructor?.name || typeof error,
              stack: error?.stack,
              errorCode: error?.code,
              errorName: error?.name,
              isConnectionError,
              backendUrl: import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001',
              possibleCauses: isConnectionError ? [
                'Backend server is not running',
                'Backend server is not accessible',
                'Network connectivity issues'
              ] : undefined
            };
            console.error(`[Verification] Failed to verify Solana wallet. Reason: ${errorMsg}`, errorDetails);
            
            const userMessage = isConnectionError 
              ? `Cannot connect to backend server. Please ensure the backend server is running on ${errorDetails.backendUrl}`
              : errorMsg;
            
            alert(userMessage);
            setConnectingWallet(null);
            setIsLoading(false);
          }
        }}
      />
    </div>
  );
};

