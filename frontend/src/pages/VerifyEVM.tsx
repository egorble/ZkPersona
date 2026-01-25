import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { Loader2, Wallet } from 'lucide-react';
import { connectEVMWallet, signMessage } from '../utils/evmWallet';
import { submitEVMSignature } from '../utils/backendAPI';

export const VerifyEVM: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [status, setStatus] = useState<'connecting' | 'signing' | 'submitting' | 'error'>('connecting');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const sessionId = searchParams.get('session');
    const passportId = searchParams.get('passportId');

    if (!sessionId || !passportId) {
      setError('Missing session or passport ID');
      setStatus('error');
      return;
    }

    handleEVMAuth(sessionId, passportId);
  }, [searchParams, navigate]);

  const handleEVMAuth = async (sessionId: string, passportId: string) => {
    try {
      // Step 1: Connect wallet
      setStatus('connecting');
      const walletInfo = await connectEVMWallet();

      if (!walletInfo) {
        throw new Error('Failed to connect wallet');
      }

      // Store wallet info
      localStorage.setItem('wallet_address', walletInfo.address);

      // Step 2: Create SIWE message
      const domain = window.location.host;
      const origin = window.location.origin;
      const statement = `Verify wallet ownership for Passport ${passportId}`;
      const message = `${domain} wants you to sign in with your Ethereum account:\n${walletInfo.address}\n\n${statement}\n\nURI: ${origin}\nVersion: 1\nChain ID: ${walletInfo.chainId}\nNonce: ${sessionId}\nIssued At: ${new Date().toISOString()}`;

      // Step 3: Request signature
      setStatus('signing');
      const signature = await signMessage(message, walletInfo.address);

      // Store signature for backend submission
      localStorage.setItem('wallet_signature', signature);
      localStorage.setItem('wallet_message', message);

      // Step 4: Submit to backend
      setStatus('submitting');
      await submitEVMSignature(sessionId, walletInfo.address, signature, message);

      // Redirect to callback page to poll status
      navigate(`/verify/callback?provider=evm&session=${sessionId}`);
    } catch (err: any) {
      if (err.message?.includes('rejected') || err.message?.includes('cancelled')) {
        navigate('/');
        return;
      }
      setError(err.message || 'EVM verification failed');
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="text-center max-w-md mx-4">
        <Wallet size={48} className="text-white mx-auto mb-4" />
        {status === 'connecting' && (
          <>
            <Loader2 size={32} className="animate-spin text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-2">
              Connecting Wallet...
            </h2>
          </>
        )}
        {status === 'signing' && (
          <>
            <Loader2 size={32} className="animate-spin text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-2">
              Sign Message
            </h2>
            <p className="text-neutral-400 font-mono text-sm">
              Please sign the message in your wallet
            </p>
          </>
        )}
        {status === 'submitting' && (
          <>
            <Loader2 size={32} className="animate-spin text-white mx-auto mb-4" />
            <h2 className="text-2xl font-bold font-mono uppercase text-white mb-2">
              Verifying...
            </h2>
          </>
        )}
        {status === 'error' && (
          <>
            <p className="text-red-400 font-mono">{error}</p>
            <button
              onClick={() => navigate('/')}
              className="mt-4 px-4 py-2 bg-white text-black font-mono uppercase text-sm"
            >
              Go Back
            </button>
          </>
        )}
      </div>
    </div>
  );
};

