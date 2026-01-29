import React from 'react';
import { Loader2 } from 'lucide-react';

interface GlobalLoaderProps {
  message?: string;
  fullScreen?: boolean;
}

export const GlobalLoader: React.FC<GlobalLoaderProps> = ({ 
  message = 'Loading...', 
  fullScreen = false 
}) => {
  return (
    <div 
      className={`flex items-center justify-center ${
        fullScreen ? 'fixed inset-0 z-[9999] bg-black/90' : 'w-full h-full min-h-[200px]'
      }`}
      style={{ animation: 'fadeIn 0.2s ease-in' }}
    >
      <div className="text-center">
        <div className="relative mb-6">
          <Loader2 
            size={fullScreen ? 64 : 48} 
            className="animate-spin text-white mx-auto"
            style={{ 
              animation: 'spin 1s linear infinite',
              filter: 'drop-shadow(0 0 8px rgba(255,255,255,0.3))'
            }}
          />
          {/* Pulsing ring */}
          <div 
            className="absolute inset-0 rounded-full border-2 border-white/20"
            style={{
              width: fullScreen ? '80px' : '60px',
              height: fullScreen ? '80px' : '60px',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              animation: 'pulse-ring 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}
          />
        </div>
        <p className="text-white font-mono text-sm uppercase tracking-wider animate-pulse">
          {message}
        </p>
        {/* Progress bar */}
        <div className="mt-4 w-48 h-1 bg-neutral-900 rounded-full overflow-hidden mx-auto">
          <div 
            className="h-full bg-white animate-pulse-bar"
            style={{ animation: 'pulse-bar 2s cubic-bezier(0.4, 0, 0.6, 1) infinite' }}
          />
        </div>
      </div>
    </div>
  );
};
