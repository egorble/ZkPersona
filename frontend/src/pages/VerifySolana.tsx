import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Wallet, AlertCircle } from 'lucide-react';
import { connectSolanaWallet, signSolanaMessage } from '../utils/solanaWallet';
import { verifyWallet } from '../utils/backendAPI';

export const VerifySolana: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'connecting' | 'signing' | 'submitting' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session');
    const walletId = searchParams.get('walletId') || searchParams.get('passportId');

    if (!sessionId || !walletId) {
      setError('Missing session or wallet ID');
      setStatus('error');
      return;
    }

    handleSolanaAuth(sessionId, walletId);
  }, [searchParams]);

  const handleSolanaAuth = async (sessionId: string, walletId: string) => {
    try {
      // Step 1: Connect wallet
      setStatus('connecting');
      const walletInfo = await connectSolanaWallet();

      if (!walletInfo) {
        throw new Error('Failed to connect wallet');
      }

      // Store wallet info
      localStorage.setItem('wallet_address', walletInfo.address);
      localStorage.setItem('wallet_provider', 'solana');

      // Step 2: Create SIWE-like message
      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = 'Verify wallet ownership for this app';
      const message = `${domain} wants you to sign in with your Solana account:\n${walletInfo.address}\n\n${statement}\n\nURI: ${origin}\nVersion: 1\nNonce: ${sessionId}\nIssued At: ${new Date().toISOString()}`;

      // Step 3: Request signature
      setStatus('signing');
      const signature = await signSolanaMessage(message, walletInfo.address);

      // Store signature for backend submission
      localStorage.setItem('wallet_signature', signature);
      localStorage.setItem('wallet_message', message);

      // Step 4: Verify wallet (sync endpoint - no sessions needed)
      setStatus('submitting');
      const result = await verifyWallet('solana', walletInfo.address, signature, message, walletId);

      // Store result in localStorage for parent component to pick up
      localStorage.setItem(`verification_result_solana`, JSON.stringify({
        ...result,
        commitment: result.commitment || ''
      }));

      // Dispatch event to notify parent component
      window.dispatchEvent(new Event('verification-updated'));

      // Redirect back to main app
      navigate('/');
    } catch (err: any) {
      if (err.message?.includes('rejected') || err.message?.includes('cancelled')) {
        navigate('/');
        return;
      }
      setError(err.message || 'Solana verification failed');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-black flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-md w-full p-8 text-center">
        {status === 'connecting' && (
          <>
            <div className="mb-6 text-white">
              <Loader2 size={64} className="animate-spin mx-auto" />
            </div>
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-4">
              Connecting Solana Wallet
            </h2>
            <p className="text-neutral-400 text-sm font-mono">
              Please approve the connection in your wallet
            </p>
          </>
        )}

        {status === 'signing' && (
          <>
            <div className="mb-6 text-white">
              <Loader2 size={64} className="animate-spin mx-auto" />
            </div>
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-4">
              Sign Message
            </h2>
            <p className="text-neutral-400 text-sm font-mono">
              Please sign the message in your wallet to verify ownership
            </p>
          </>
        )}

        {status === 'submitting' && (
          <>
            <div className="mb-6 text-white">
              <Loader2 size={64} className="animate-spin mx-auto" />
            </div>
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-4">
              Verifying Wallet
            </h2>
            <p className="text-neutral-400 text-sm font-mono">
              Analyzing your wallet data...
            </p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="mb-6 text-red-500">
              <AlertCircle size={64} className="mx-auto" />
            </div>
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-4">
              Verification Failed
            </h2>
            <p className="text-neutral-400 text-sm font-mono mb-6">
              {error || 'An error occurred during verification'}
            </p>
            <button
              onClick={() => navigate('/')}
              className="px-6 py-3 bg-white text-black font-mono uppercase text-sm hover:bg-neutral-100 transition-colors"
            >
              Return Home
            </button>
          </>
        )}
      </div>
    </div>
  );
};
