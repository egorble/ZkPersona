import React, { useState } from 'react';
import { Stamp, StampStatus } from '../types';
import { Button } from './Button';
import { Check, X, Loader2, ChevronRight, BrainCircuit, AlertCircle, Clock } from 'lucide-react';
import { verifyHumanityWithGemini } from '../src/services/geminiService';
import { VerificationScoreCard } from '../src/components/VerificationScoreCard';
import { useVerification } from '../src/hooks/useVerification';
import { VERIFICATION_CONFIGS } from '../src/services/verificationService';
import { getPlatformStatus } from '../src/lib/expiration';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';

interface StampCardProps {
  stamp: Stamp;
  onVerify: (id: string, success: boolean) => void;
  onOpenVerificationInstructions?: (stampId: string) => void;
}

export const StampCard: React.FC<StampCardProps> = ({ stamp, onVerify, onOpenVerificationInstructions }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showScoreDetails, setShowScoreDetails] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const { publicKey } = useWallet();
  const { getVerification, verifyProvider, verifying, clearVerification } = useVerification(publicKey || undefined);
  
  const verification = getVerification(stamp.provider || stamp.id);
  const config = VERIFICATION_CONFIGS[stamp.provider || stamp.id];
  const isVerifying = verifying === (stamp.provider || stamp.id);
  const isLoading = loading || isVerifying;

  const handleVerify = async () => {
    if (stamp.provider === 'gemini' || stamp.id === 'gemini_test') {
      setModalOpen(true);
      return;
    }

    const providerId = stamp.provider || stamp.id;
    
    // For OAuth providers and EVM/Solana, open VerificationInstructions modal
    const oauthProviders = ['google', 'twitter', 'github', 'discord', 'telegram', 'ethereum', 'eth_wallet', 'solana', 'steam'];
    if (oauthProviders.includes(providerId)) {
      // If callback provided, open VerificationInstructions with this stamp
      if (onOpenVerificationInstructions) {
        onOpenVerificationInstructions(providerId);
        return;
      }
      // Fallback: show info message
      setError(`To verify ${providerId === 'ethereum' || providerId === 'eth_wallet' ? 'your wallet' : 'your account'}, please use the "Start Verification" button in the verification instructions.`);
      setTimeout(() => setError(null), 5000);
      return;
    }

    // For other providers, try direct verification
    if (['telegram', 'discord'].includes(providerId)) {
      console.error('[StampCard] Attempted direct verification for OAuth provider:', providerId);
      setError(`Please use the instructions modal to verify ${providerId}.`);
      setTimeout(() => setError(null), 5000);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await verifyProvider(providerId, {});
      onVerify(stamp.id, true);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Verification failed. Please try again.';
      setError(errorMessage);
      console.error('[StampCard] Verification error:', error);
      
      // Clear error after 5 seconds
      setTimeout(() => setError(null), 5000);
    } finally {
      setLoading(false);
    }
  };

  const handleAiSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiInput.trim()) return;

    setLoading(true);
    setAiFeedback(null);
    
    // Hardcoded philosophical question for this demo
    const question = "What makes you human and not a complex language model?";
    
    const result = await verifyHumanityWithGemini(question, aiInput);
    
    setLoading(false);
    setAiFeedback(result.feedback);
    
    if (result.success) {
      setTimeout(() => {
        setModalOpen(false);
        onVerify(stamp.id, true);
      }, 2500);
    }
  };

  // Get verification status (connected/expired/disconnected)
  // IMPORTANT: Only show connected status if wallet is actually connected
  const verificationStatus = verification?.status || getPlatformStatus(verification?.verifiedAt);
  const isExpired = verificationStatus === 'expired';
  // Only show as connected if wallet is connected AND verification exists
  const isConnected = publicKey && verificationStatus === 'connected';
  const daysRemaining = verification?.daysRemaining || 0;
  const expiryDate = verification?.expiryDate;

  const getStatusIcon = () => {
    if (isExpired) {
      return <AlertCircle className="w-5 h-5 text-orange-400" />;
    }
    switch (stamp.status) {
      case StampStatus.VERIFIED: return isConnected ? <Check className="w-5 h-5 text-green-400" /> : <AlertCircle className="w-5 h-5 text-orange-400" />;
      case StampStatus.FAILED: return <X className="w-5 h-5 text-red-400" />;
      case StampStatus.PENDING: return <Loader2 className="w-5 h-5 text-secondary animate-spin" />;
      default: return <div className="w-5 h-5 rounded-full border border-neutral-700" />;
    }
  };

  // Only show as verified if wallet is connected
  const isVerified = publicKey && (stamp.status === StampStatus.VERIFIED || isConnected);

  return (
    <>
      <div className={`
        relative group overflow-hidden border transition-all duration-300
        ${isVerified ? 'border-white/40 bg-white/5' : 'border-neutral-800 bg-surface hover:border-neutral-600'}
        flex flex-col h-full hover:scale-[1.02] active:scale-[0.98] hover:shadow-lg hover:shadow-white/10
      `}
      style={{
        animation: isLoading ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined
      }}
      >
        <div className="p-6 flex-1">
          <div className="flex justify-between items-start mb-4">
            <div className={`p-2 rounded-none border border-neutral-800 ${isVerified ? 'bg-white text-black' : 'bg-surfaceHighlight text-white'}`}>
              {stamp.icon}
            </div>
            {getStatusIcon()}
          </div>
          
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-lg font-medium text-white font-mono">{stamp.title}</h3>
            {config && (
              <div className="text-right">
                <div className="text-xs text-neutral-400 font-mono">Max</div>
                <div className="text-sm font-bold text-white font-mono">{config.maxScore} pts</div>
              </div>
            )}
          </div>
          <p className="text-sm text-secondary leading-relaxed mb-3">
            {stamp.description}
          </p>
          
          {error && (
            <div className="mb-3 p-2 bg-red-950/30 border border-red-800/50 rounded">
              <div className="flex items-center gap-2">
                <X className="w-4 h-4 text-red-400 flex-shrink-0" />
                <span className="text-xs text-red-300 font-mono">{error}</span>
              </div>
            </div>
          )}
          
          {verification?.verified && (
            <div className={`mb-3 p-2 rounded ${
              isExpired 
                ? 'bg-orange-950/30 border border-orange-800/50' 
                : 'bg-green-950/30 border border-green-800/50'
            }`}>
              <div className="flex items-center justify-between mb-1">
                <span className={`text-xs font-mono ${
                  isExpired ? 'text-orange-400' : 'text-green-400'
                }`}>
                  Score:
                </span>
                <span className={`text-sm font-bold font-mono ${
                  isExpired ? 'text-orange-400' : 'text-green-400'
                }`}>
                  {verification.score} / {config?.maxScore || stamp.scoreWeight} pts
                </span>
              </div>
              {isExpired && expiryDate && (
                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-orange-800/30">
                  <Clock className="w-3 h-3 text-orange-400" />
                  <span className="text-xs text-orange-300 font-mono">
                    Expired {expiryDate}
                  </span>
                </div>
              )}
              {isConnected && daysRemaining > 0 && (
                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-green-800/30">
                  <Clock className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-300 font-mono">
                    {daysRemaining} days remaining
                  </span>
                </div>
              )}
              {isConnected && expiryDate && daysRemaining === 0 && (
                <div className="flex items-center gap-1 mt-1 pt-1 border-t border-green-800/30">
                  <Clock className="w-3 h-3 text-green-400" />
                  <span className="text-xs text-green-300 font-mono">
                    Expires {expiryDate}
                  </span>
                </div>
              )}
            </div>
          )}
          
          {config && (
            <button
              onClick={() => setShowScoreDetails(!showScoreDetails)}
              className="text-xs text-neutral-400 hover:text-white font-mono underline mb-2"
            >
              {showScoreDetails ? 'Hide' : 'Show'} scoring criteria
            </button>
          )}
          
          {showScoreDetails && config && (
            <div className="mt-3">
              <VerificationScoreCard
                providerId={stamp.provider || stamp.id}
                currentScore={verification?.score || 0}
                achievedCriteria={verification?.criteria || []}
              />
            </div>
          )}
        </div>

        <div className="p-6 pt-0 mt-auto">
          {stamp.comingSoon ? (
            <div className="w-full py-3 text-center border border-neutral-700 bg-neutral-900/50 text-xs uppercase tracking-widest font-mono text-neutral-500 cursor-not-allowed">
              <div className="flex items-center justify-center gap-2">
                <Clock className="w-4 h-4" />
                Coming Soon
              </div>
            </div>
          ) : !isVerified && !isExpired ? (
            <Button 
              variant="outline" 
              fullWidth 
              onClick={handleVerify} 
              disabled={isLoading || stamp.comingSoon}
              className="group-hover:bg-white group-hover:text-black transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 active:scale-95 relative overflow-hidden"
              style={{
                animation: isLoading ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined
              }}
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isVerifying ? 'Verifying...' : 'Connecting...'}
                </>
              ) : (
                'Connect'
              )}
            </Button>
          ) : isExpired ? (
            <Button 
              variant="outline" 
              fullWidth 
              onClick={handleVerify} 
              disabled={isLoading}
              className="border-orange-600 text-orange-400 hover:bg-orange-950 hover:border-orange-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {isVerifying ? 'Verifying...' : 'Reconnecting...'}
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 mr-2" />
                  Reconnect
                </>
              )}
            </Button>
          ) : (
            <div className="space-y-2">
              <div className="w-full py-3 text-center border border-green-800/50 bg-green-950/20 text-xs uppercase tracking-widest font-mono text-green-400">
                <div className="flex items-center justify-center gap-2">
                  <Check className="w-4 h-4" />
                  Connected
                </div>
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => {
                    if (onOpenVerificationInstructions) {
                      onOpenVerificationInstructions(stamp.provider || stamp.id);
                    }
                  }}
                  className="text-xs py-2 border-neutral-700 hover:border-white hover:bg-white hover:text-black"
                >
                  Change
                </Button>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={async () => {
                    const providerId = stamp.provider || stamp.id;
                    console.log(`[StampCard] 🔌 Disconnecting ${providerId}...`);
                    try {
                      await clearVerification(providerId);
                      console.log(`[StampCard] ✅ Disconnected ${providerId}`);
                      // Dispatch event to refresh verifications
                      window.dispatchEvent(new Event('verification-updated'));
                    } catch (error) {
                      console.error(`[StampCard] ❌ Error disconnecting ${providerId}:`, error);
                    }
                  }}
                  className="text-xs py-2 border-red-700 text-red-400 hover:border-red-500 hover:bg-red-950"
                >
                  Disconnect
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* AI Challenge Modal */}
      {modalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-opacity duration-300"
          style={{ animation: 'fadeIn 0.3s ease-in' }}
          onClick={() => setModalOpen(false)}
        >
          <div 
            className="bg-black border border-neutral-700 max-w-lg w-full p-8 relative shadow-2xl transition-all duration-300"
            style={{ animation: 'zoomIn 0.3s ease-out' }}
            onClick={(e) => e.stopPropagation()}
          >
            <button 
              onClick={() => setModalOpen(false)} 
              className="absolute top-4 right-4 text-neutral-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="mb-6 flex items-center gap-3 text-white">
              <BrainCircuit className="w-6 h-6" />
              <h2 className="text-xl font-mono uppercase">AI Turing Test</h2>
            </div>

            <p className="text-neutral-400 mb-6 font-mono text-sm leading-6">
              To obtain this stamp, prove your humanity. AI will analyze your answer for creativity and imperfection.
            </p>

            <form onSubmit={handleAiSubmit} className="space-y-6">
              <div>
                <label className="block text-sm text-white mb-2 font-medium">
                  Question: What makes you human and not a complex language model?
                </label>
                <textarea 
                  className="w-full bg-surfaceHighlight border border-neutral-700 text-white p-4 focus:outline-none focus:border-white min-h-[120px] text-sm font-sans"
                  placeholder="Write something a machine wouldn't invent..."
                  value={aiInput}
                  onChange={(e) => setAiInput(e.target.value)}
                />
              </div>

              {aiFeedback && (
                <div className={`p-4 border text-sm ${aiFeedback.includes("Error") ? 'border-red-900 bg-red-900/10 text-red-200' : 'border-neutral-700 bg-neutral-900 text-neutral-300'}`}>
                  <span className="block font-mono text-xs uppercase opacity-50 mb-1">System Verdict:</span>
                  {aiFeedback}
                </div>
              )}

              <Button 
                fullWidth 
                disabled={loading || !aiInput} 
                type="submit"
                className="hover:scale-105 active:scale-95"
                style={{
                  animation: loading ? 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' : undefined
                }}
              >
                {loading ? <Loader2 className="animate-spin w-4 h-4" /> : 'Submit for Analysis'}
              </Button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

