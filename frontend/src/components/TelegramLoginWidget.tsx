import React, { useEffect, useRef } from 'react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';

interface TelegramLoginWidgetProps {
  botName: string;
  onAuth: (data: any) => void;
  onError?: (error: string) => void;
}

export const TelegramLoginWidget: React.FC<TelegramLoginWidgetProps> = ({
  botName,
  onAuth,
  onError
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { publicKey } = useWallet();

  useEffect(() => {
    if (!containerRef.current || !publicKey) return;

    // Load Telegram Login Widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.setAttribute('data-telegram-login', botName);
    script.setAttribute('data-size', 'large');
    script.setAttribute('data-onauth', 'onTelegramAuth(user)');
    script.setAttribute('data-request-access', 'write');
    script.async = true;

    // Create global callback function
    (window as any).onTelegramAuth = (user: any) => {
      console.log('[Telegram Widget] Auth data received:', user);
      onAuth(user);
    };

    containerRef.current.appendChild(script);

    return () => {
      // Cleanup
      if (containerRef.current && script.parentNode) {
        script.parentNode.removeChild(script);
      }
      delete (window as any).onTelegramAuth;
    };
  }, [botName, publicKey, onAuth]);

  if (!publicKey) {
    return (
      <div className="p-4 bg-yellow-900/30 border border-yellow-800/50 rounded">
        <p className="text-yellow-400 text-sm font-mono">
          Please connect your wallet first to verify Telegram account.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      <p className="text-neutral-400 text-sm font-mono text-center">
        Click the button below to authorize with Telegram:
      </p>
      <div ref={containerRef} className="flex justify-center" />
    </div>
  );
};


