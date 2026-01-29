import React, { useEffect, useState, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { getVerificationStatus, submitEVMSignature } from '../utils/backendAPI';
import { useVerification } from '../hooks/useVerification';

export const VerifyCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { saveVerificationResult } = useVerification();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [verificationResult, setVerificationResult] = useState<any>(null);
  const hasStartedRef = useRef(false);

  useEffect(() => {
    const provider = searchParams.get('provider');
    const sessionId = searchParams.get('session');
    const errorParam = searchParams.get('error');

    console.log('[VerifyCallback] 🔍 Callback received:', { provider, sessionId, errorParam });

    if (errorParam) {
      const decodedError = decodeURIComponent(errorParam);
      console.error('[VerifyCallback] ❌ Error in callback:', decodedError);
      setError(decodedError);
      setStatus('error');
      // Don't auto-redirect - let user stay on page
      return;
    }

    if (!provider || !sessionId) {
      console.error('[VerifyCallback] ❌ Missing parameters:', { provider, sessionId });
      setError('Missing verification parameters');
      setStatus('error');
      // Don't auto-redirect - let user stay on page
      return;
    }

    // Prevent multiple executions using ref
    if (hasStartedRef.current) {
      console.log('[VerifyCallback] ⚠️ Already processing, skipping duplicate call');
      return;
    }
    
    hasStartedRef.current = true;
    console.log('[VerifyCallback] ✅ Starting verification process for:', provider);

    // Handle EVM callback (SIWE signature submission)
    if (provider === 'evm') {
      handleEVMCallback(sessionId);
      return;
    }

    // Handle OAuth/OpenID callbacks
    handleOAuthCallback(provider, sessionId);
  }, [searchParams]); // Remove saveVerificationResult from deps to prevent re-runs

  const handleEVMCallback = async (sessionId: string) => {
    try {
      console.log('[VerifyCallback] 🔐 EVM callback started, session:', sessionId);
      setStatus('processing');

      // Poll for verification status (signature was already submitted in VerifyEVM page)
      let attempts = 0;
      const maxAttempts = 30;
      
      const pollStatus = async () => {
        console.log(`[VerifyCallback] 🔍 Polling EVM status (attempt ${attempts + 1}/${maxAttempts})`);
        const session = await getVerificationStatus(sessionId, 'evm');
        
        console.log('[VerifyCallback] 📦 EVM session status:', { 
          status: session?.status, 
          hasResult: !!session?.result 
        });
        
        if (session && session.status === 'verified' && session.result) {
          console.log('[VerifyCallback] ✅ EVM verification successful:', {
            score: session.result.score,
            provider: 'ethereum'
          });

          // Save verification result from backend
          saveVerificationResult('ethereum', {
            score: session.result.score,
            criteria: session.result.criteria,
            metadataHash: session.result.metadataHash
          });

          console.log('[VerifyCallback] 💾 EVM verification result saved to local storage');

          // Clear temporary storage
          localStorage.removeItem('wallet_signature');
          localStorage.removeItem('wallet_message');

          setVerificationResult(session.result);
          setStatus('success');
          // Don't auto-redirect - let user stay on page
          return true;
        }

        if (session && session.status === 'failed') {
          console.error('[VerifyCallback] ❌ EVM verification failed');
          throw new Error('Verification failed');
        }

        return false;
      };

      // Poll every 500ms
      const interval = setInterval(async () => {
        attempts++;
        const done = await pollStatus();
        
        if (done || attempts >= maxAttempts) {
          clearInterval(interval);
          if (attempts >= maxAttempts && !done) {
            throw new Error('Verification timeout');
          }
        }
      }, 500);

      // Initial check
      const done = await pollStatus();
      if (done) {
        clearInterval(interval);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'EVM verification failed';
      console.error('[VerifyCallback] ❌ EVM callback error:', errorMessage, err);
      setError(errorMessage);
      setStatus('error');
      // Don't auto-redirect - let user stay on page
    }
  };

  const handleOAuthCallback = async (provider: string, sessionId: string) => {
    try {
      console.log(`[VerifyCallback] 🔐 OAuth callback started, provider: ${provider}, session: ${sessionId}`);
      setStatus('processing');

      // Poll for verification status
      let attempts = 0;
      const maxAttempts = 30;
      
      const pollStatus = async () => {
        console.log(`[VerifyCallback] 🔍 Polling ${provider} status (attempt ${attempts + 1}/${maxAttempts})`);
        const session = await getVerificationStatus(sessionId, provider);
        
        console.log(`[VerifyCallback] 📦 ${provider} session status:`, { 
          status: session?.status, 
          hasResult: !!session?.result 
        });
        
        if (session && session.status === 'verified' && session.result) {
          console.log(`[VerifyCallback] ✅ ${provider} verification successful:`, {
            score: session.result.score,
            provider
          });

          // Save verification result from backend (use backend commitment for claim_social_stamp)
          saveVerificationResult(provider, {
            score: session.result.score,
            criteria: session.result.criteria || [],
            metadataHash: session.result.commitment || session.result.metadataHash,
            commitment: session.result.commitment
          });

          // For Discord: Save session and profile (Propel-like behavior)
          if (provider === 'discord' && session.result.userId) {
            const { saveSession, saveProfile } = await import('../lib/auth');
            const userId = session.result.userId;
            const username = session.result.username || '';
            const profile = session.result.profile;

            // Create user object from Discord data
            const user = {
              id: userId,
              user_metadata: {
                full_name: profile?.discordNickname || username,
                name: profile?.discordNickname || username,
                user_name: profile?.discordUsername || username,
                avatar_url: profile?.discordAvatarUrl || '',
                sub: profile?.discordId || userId
              }
            };

            // Save session (this triggers onAuthStateChange callbacks - Propel pattern)
            saveSession({ user });
            console.log('[VerifyCallback] 💾 Discord session saved, onAuthStateChange callbacks triggered');

            // Save profile to backend (Propel-like: auto-save after auth)
            if (profile) {
              await saveProfile({
                id: userId,
                user_id: userId,
                discord_nickname: profile.discordNickname || username,
                discord_avatar_url: profile.discordAvatarUrl || ''
              });
              console.log('[VerifyCallback] 💾 Discord profile saved to backend');
            }
          }

          console.log(`[VerifyCallback] 💾 ${provider} verification result saved`);

          // Small delay to ensure backend has saved the verification
          await new Promise(resolve => setTimeout(resolve, 500));

          // Dispatch event to update main page state (triggers refreshVerifications)
          window.dispatchEvent(new Event('verification-updated'));
          console.log(`[VerifyCallback] 🔔 Dispatched verification-updated event`);

          setVerificationResult(session.result);
          setStatus('success');
          // Don't auto-redirect - let user stay on page
          return true;
        }

        if (session && session.status === 'failed') {
          console.error(`[VerifyCallback] ❌ ${provider} verification failed`);
          throw new Error('Verification failed');
        }

        return false;
      };

      // Poll every 500ms
      const interval = setInterval(async () => {
        attempts++;
        const done = await pollStatus();
        
        if (done || attempts >= maxAttempts) {
          clearInterval(interval);
          if (attempts >= maxAttempts) {
            throw new Error('Verification timeout');
          }
        }
      }, 500);

      // Initial check
      const done = await pollStatus();
      if (done) {
        clearInterval(interval);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Verification failed';
      console.error(`[VerifyCallback] ❌ ${provider} callback error:`, errorMessage, err);
      setError(errorMessage);
      setStatus('error');
      // Don't auto-redirect - let user stay on page
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div 
        className="text-center max-w-md mx-4 transition-all duration-300"
        style={{ animation: 'zoomIn 0.3s ease-out' }}
      >
        {status === 'processing' && (
          <>
            <Loader2 size={48} className="animate-spin text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-2">
              Verifying...
            </h2>
            <p className="text-neutral-400 font-mono text-sm">
              Processing verification result
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-2">
              Verification Complete!
            </h2>
            {verificationResult && (
              <div className="mt-4 p-4 bg-green-950/30 border border-green-800/50 rounded">
                <p className="text-green-400 font-mono text-sm">
                  Score: {verificationResult.score} / {verificationResult.maxScore} points
                </p>
              </div>
            )}
            <button
              onClick={() => {
                // Navigate to dashboard using React Router (preserves wallet connection)
                console.log('[VerifyCallback] 🔄 Navigating to dashboard...');
                navigate('/');
              }}
              className="mt-4 px-6 py-2 bg-green-600 hover:bg-green-700 text-white font-mono text-sm rounded transition-colors"
            >
              Go to Dashboard
            </button>
          </>
        )}

        {status === 'error' && (
          <>
            <XCircle size={48} className="text-red-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-2">
              Verification Failed
            </h2>
            <p className="text-neutral-400 font-mono text-sm mb-4">
              {error || 'An error occurred'}
            </p>
            <button
              onClick={() => window.location.reload()}
              className="mt-4 px-6 py-2 bg-red-600 hover:bg-red-700 text-white font-mono text-sm rounded transition-colors"
            >
              Try Again
            </button>
          </>
        )}
      </div>
    </div>
  );
};

