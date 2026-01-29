import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle } from 'lucide-react';
import { useVerification } from '../hooks/useVerification';
import { sendOAuthRedirect } from '../utils/oauthRedirect';
import { getVerificationStatus, VerificationSession } from '../utils/backendAPI';

export const OAuthCallback: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { verifyProvider, saveVerificationResult } = useVerification();
  const [status, setStatus] = useState<'processing' | 'success' | 'error'>('processing');
  const [error, setError] = useState<string | null>(null);
  const [pollingInterval, setPollingInterval] = useState<NodeJS.Timeout | null>(null);

  // Backend-centric flow: Poll status from backend
  const handleBackendCallback = useCallback(async (provider: string, sessionId: string) => {
    try {
      setStatus('processing');

      // Poll backend for verification status
      const pollStatus = async (): Promise<VerificationSession | null> => {
        try {
          const result = await getVerificationStatus(sessionId, provider);
          if (!result) {
            return null;
          }

          return result;
        } catch (err) {
          return null;
        }
      };

      // Initial poll
      let sessionData = await pollStatus();

      // If not ready yet, start polling every 1 second
      if (!sessionData || sessionData.status === 'in_progress') {
        const interval = setInterval(async () => {
          const data = await pollStatus();
          
          if (data) {
            if (data.status === 'verified' && data.result) {
              // Verification complete!
              clearInterval(interval);
              setPollingInterval(null);

              // Save verification result
              // Backend returns criteria as array of { condition, points, description? }
              const criteria = Array.isArray(data.result.criteria) 
                ? data.result.criteria.map(c => ({
                    condition: c.condition || String(c.condition || ''),
                    points: c.points || 0,
                    description: c.description || ''
                  }))
                : [];

              saveVerificationResult(data.result.provider, {
                score: data.result.score || 0,
                criteria,
                metadataHash: data.result.metadataHash
              });

              console.log(`[OAuthCallback] Successfully verified ${data.result.provider}. Score: ${data.result.score || 0}`);
              setStatus('success');
              setTimeout(() => navigate('/'), 2000);
            } else if (data.status === 'failed') {
              // Verification failed
              clearInterval(interval);
              setPollingInterval(null);
              
              const errorDetails = {
                provider,
                sessionId,
                reason: 'Backend returned failed status',
                status: data.status,
                sessionData: data
              };
              console.error(`[OAuthCallback] Verification failed. Reason: Backend returned failed status`, errorDetails);
              setError('Verification failed. Please try again.');
              setStatus('error');
              setTimeout(() => navigate('/'), 3000);
            }
          }
        }, 1000); // Poll every 1 second

        setPollingInterval(interval);

        // Timeout after 60 seconds
        setTimeout(() => {
          if (interval) {
            clearInterval(interval);
            setPollingInterval(null);
            const errorDetails = {
              provider,
              sessionId,
              reason: 'Polling timeout after 60 seconds',
              timeout: '60 seconds',
              pollingInterval: '1 second'
            };
            console.error(`[OAuthCallback] Verification timeout. Reason: Polling exceeded 60 second timeout`, errorDetails);
            setError('Verification timeout. Please try again.');
            setStatus('error');
            setTimeout(() => navigate('/'), 3000);
          }
        }, 60000);
      } else if (sessionData.status === 'verified' && sessionData.result) {
        // Already verified
        // Backend returns criteria as array of { condition, points, description? }
        const criteria = Array.isArray(sessionData.result.criteria) 
          ? sessionData.result.criteria.map(c => ({
              condition: c.condition || String(c.condition || ''),
              points: c.points || 0,
              description: c.description || ''
            }))
          : [];

        saveVerificationResult(sessionData.result.provider, {
          score: sessionData.result.score || 0,
          criteria,
          metadataHash: sessionData.result.metadataHash
        });

        console.log(`[OAuthCallback] Already verified ${sessionData.result.provider}. Score: ${sessionData.result.score || 0}`);
        setStatus('success');
        setTimeout(() => navigate('/'), 2000);
      } else if (sessionData.status === 'failed') {
        const errorDetails = {
          provider,
          sessionId,
          reason: 'Backend returned failed status on initial poll',
          status: sessionData.status,
          sessionData
        };
        console.error(`[OAuthCallback] Verification failed. Reason: Backend returned failed status`, errorDetails);
        setError('Verification failed. Please try again.');
        setStatus('error');
        setTimeout(() => navigate('/'), 3000);
      }
    } catch (err) {
      const errorDetails = {
        provider,
        sessionId,
        reason: err instanceof Error ? err.message : 'Unknown error',
        type: err instanceof Error ? err.constructor.name : typeof err,
        stack: err instanceof Error ? err.stack : undefined
      };
      console.error(`[OAuthCallback] Error during verification. Reason: ${err instanceof Error ? err.message : 'Unknown error'}`, errorDetails);
      setError(err instanceof Error ? err.message : 'Verification failed');
      setStatus('error');
      setTimeout(() => navigate('/'), 3000);
    }
  }, [saveVerificationResult, navigate]);

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleSteamCallback = useCallback(async (params: URLSearchParams) => {
    try {
      setStatus('processing');
      
      // Steam OpenID validation
      // In production, this should be validated on backend
      const claimedId = params.get('openid.claimed_id');
      const identity = params.get('openid.identity');
      
      if (!claimedId || !identity) {
        const errorDetails = {
          reason: 'Missing required Steam OpenID parameters',
          hasClaimedId: !!claimedId,
          hasIdentity: !!identity,
          params: Object.fromEntries(params.entries())
        };
        console.error('[OAuthCallback] Steam verification failed. Reason: Invalid Steam OpenID response', errorDetails);
        throw new Error('Invalid Steam OpenID response');
      }
      
      // Extract Steam ID from claimed_id (format: https://steamcommunity.com/openid/id/7656119...)
      const steamIdMatch = claimedId.match(/\/id\/(\d+)$/);
      if (!steamIdMatch) {
        const errorDetails = {
          reason: 'Could not extract Steam ID from claimed_id',
          claimedId,
          identity
        };
        console.error('[OAuthCallback] Steam verification failed. Reason: Could not extract Steam ID', errorDetails);
        throw new Error('Could not extract Steam ID');
      }
      
      const steamId = steamIdMatch[1];
      
      // Verify Steam account
      console.log(`[OAuthCallback] Verifying Steam account: ${steamId}`);
      await verifyProvider('steam', { address: steamId });
      
      console.log('[OAuthCallback] Successfully verified Steam account');
      setStatus('success');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      const errorDetails = {
        reason: err instanceof Error ? err.message : 'Unknown error',
        type: err instanceof Error ? err.constructor.name : typeof err,
        stack: err instanceof Error ? err.stack : undefined,
        params: Object.fromEntries(params.entries())
      };
      console.error(`[OAuthCallback] Steam verification failed. Reason: ${err instanceof Error ? err.message : 'Unknown error'}`, errorDetails);
      setError(err instanceof Error ? err.message : 'Steam verification failed');
      setStatus('error');
      setTimeout(() => navigate('/'), 3000);
    }
  }, [verifyProvider, navigate]);
  
  const handleOAuthCallback = useCallback(async (providerId: string, code: string, state: string) => {
    try {
      setStatus('processing');
      
      // Check if this is a popup window (opened from main window)
      const isPopup = window.opener !== null;
      
      // If popup window, send data via BroadcastChannel to main window
      if (isPopup) {
        sendOAuthRedirect(providerId, code, state);
        setStatus('success');
        return; // Don't redirect in popup
      }
      
      // Main window flow (fallback or direct callback)
      // Verify state to prevent CSRF attacks
      const storedState = localStorage.getItem(`oauth_state_${providerId}`);
      if (!state || !storedState || state !== storedState) {
        const errorDetails = {
          providerId,
          reason: 'OAuth state parameter mismatch or missing',
          hasState: !!state,
          hasStoredState: !!storedState,
          stateMatch: state === storedState
        };
        console.error(`[OAuthCallback] OAuth callback failed. Reason: Invalid OAuth state parameter`, errorDetails);
        throw new Error('Invalid OAuth state parameter');
      }
      
      const walletId = state.includes('_') ? state.split('_').slice(1).join('_') : 'default';
      localStorage.setItem('wallet_id', walletId);
      localStorage.removeItem(`oauth_state_${providerId}`);

      // Get redirect URI
      const redirectUri = import.meta.env.VITE_OAUTH_REDIRECT_URI || 
                         `${window.location.origin}/oauth/callback?provider=${providerId}`;

      // Exchange code for access token
      // NOTE: In production, this should be done via backend API
      const { exchangeCodeForToken } = await import('../utils/oauthHelper');
      let accessToken: string;
      
      try {
        accessToken = await exchangeCodeForToken(providerId, code, redirectUri);
      } catch (tokenError) {
        // If client-side token exchange fails, show helpful error
        const errorMsg = tokenError instanceof Error ? tokenError.message : String(tokenError);
        const errorDetails = {
          providerId,
          reason: errorMsg,
          type: tokenError instanceof Error ? tokenError.constructor.name : typeof tokenError,
          stack: tokenError instanceof Error ? tokenError.stack : undefined,
          redirectUri
        };
        console.error(`[OAuthCallback] Token exchange failed. Reason: ${errorMsg}`, errorDetails);
        if (errorMsg.includes('client_secret') || errorMsg.includes('Client Secret')) {
          setError('OAuth token exchange requires backend API. Client Secret cannot be used in frontend. Please set up a backend endpoint for /api/oauth/token');
        } else {
          setError(`Token exchange failed: ${errorMsg}`);
        }
        setStatus('error');
        setTimeout(() => navigate('/'), 5000);
        return;
      }

      // Verify provider with access token
      console.log(`[OAuthCallback] Verifying ${providerId} with access token`);
      await verifyProvider(providerId, { accessToken });
      
      console.log(`[OAuthCallback] Successfully verified ${providerId}`);
      setStatus('success');
      setTimeout(() => navigate('/'), 2000);
    } catch (err) {
      const errorDetails = {
        providerId,
        reason: err instanceof Error ? err.message : 'Unknown error',
        type: err instanceof Error ? err.constructor.name : typeof err,
        stack: err instanceof Error ? err.stack : undefined,
        hasCode: !!code,
        hasState: !!state
      };
      console.error(`[OAuthCallback] OAuth callback failed. Reason: ${err instanceof Error ? err.message : 'Unknown error'}`, errorDetails);
      setError(err instanceof Error ? err.message : 'OAuth callback failed');
      setStatus('error');
      setTimeout(() => navigate('/'), 3000);
    }
  }, [verifyProvider, navigate]);

  useEffect(() => {
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const provider = searchParams.get('provider');
    const session = searchParams.get('session');
    const errorParam = searchParams.get('error');
    const openidMode = searchParams.get('openid.mode'); // Steam OpenID
    
    // Handle error parameter (from backend redirect)
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      setStatus('error');
      setTimeout(() => navigate('/'), 3000);
      return;
    }

    // Handle Steam OpenID callback (direct, not via backend)
    if (openidMode === 'id_res') {
      handleSteamCallback(searchParams);
      return;
    }

    // Backend-centric flow: provider + session (backend redirect)
    // Format: /verify/callback?provider=twitter&session=SESSION_ID
    if (provider && session) {
      handleBackendCallback(provider, session);
      return;
    }

    // Legacy direct OAuth callback: code + provider (fallback)
    // Format: /oauth/callback?provider=twitter&code=...&state=...
    if (code && provider) {
      handleOAuthCallback(provider, code, state || '');
      return;
    }

    // Steam via backend (provider=steam&session=...)
    if (provider === 'steam' && session) {
      handleBackendCallback('steam', session);
      return;
    }

    // No valid parameters
    setError('Missing OAuth parameters. Expected: provider + session (backend flow) or provider + code (direct flow)');
    setStatus('error');
    setTimeout(() => navigate('/'), 3000);
  }, [searchParams, navigate, handleSteamCallback, handleOAuthCallback, handleBackendCallback]);

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
              Processing OAuth...
            </h2>
            <p className="text-neutral-400 font-mono text-sm">
              Completing verification
            </p>
          </>
        )}

        {status === 'success' && (
          <>
            <CheckCircle size={48} className="text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-2">
              Verification Complete!
            </h2>
            <p className="text-neutral-400 font-mono text-sm">
              Redirecting...
            </p>
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
            <p className="text-neutral-500 font-mono text-xs">
              Redirecting...
            </p>
          </>
        )}
      </div>
    </div>
  );
};

