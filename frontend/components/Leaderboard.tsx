
import React, { useState } from 'react';
import { Trophy, Medal, User, Zap } from 'lucide-react';
import { useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { WalletRequiredModal } from '../src/components/WalletRequiredModal';

const MOCK_LEADERS = [
  { rank: 1, address: '0x821...3e1a', score: 98.5, stamps: 12, status: 'Pioneer' },
  { rank: 2, address: '0x4f2...a902', score: 94.2, stamps: 10, status: 'Verified' },
  { rank: 3, address: '0x11a...9c22', score: 89.0, stamps: 9, status: 'Verified' },
  { rank: 4, address: '0xde0...f431', score: 85.5, stamps: 8, status: 'Verified' },
  { rank: 5, address: '0x77c...b112', score: 82.1, stamps: 7, status: 'Verified' },
  { rank: 6, address: '0xac1...d330', score: 78.4, stamps: 7, status: 'Human' },
  { rank: 7, address: '0x551...e449', score: 75.0, stamps: 6, status: 'Human' },
];

export const Leaderboard: React.FC = () => {
  const { publicKey } = useWallet();
  const [showWalletModal, setShowWalletModal] = useState(false);

  const handleConnectWallet = () => {
    setShowWalletModal(true);
  };

  if (!publicKey) {
    return (
      <>
        <div className="animate-in fade-in duration-500">
          <div className="mb-10">
            <h2 className="text-3xl font-bold tracking-tight text-white mb-2 font-mono">GLOBAL RANKING</h2>
            <p className="text-neutral-500 font-mono text-sm">The most trusted biological entities in the network.</p>
          </div>
          <div className="border border-neutral-800 bg-surface p-12 text-center">
            <p className="text-neutral-400 font-mono text-sm mb-4">Connect your wallet to view the leaderboard</p>
            <button
              onClick={handleConnectWallet}
              className="px-6 py-3 bg-white text-black font-mono uppercase text-sm hover:bg-neutral-100 transition-colors"
            >
              Connect Wallet
            </button>
          </div>
        </div>
        <WalletRequiredModal
          isOpen={showWalletModal}
          onClose={() => setShowWalletModal(false)}
          onConnect={handleConnectWallet}
          action="view the leaderboard"
        />
      </>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2 font-mono">GLOBAL RANKING</h2>
        <p className="text-neutral-500 font-mono text-sm">The most trusted biological entities in the network.</p>
      </div>

      <div className="border border-neutral-800 bg-surface divide-y divide-neutral-900">
        <div className="grid grid-cols-12 p-4 text-[10px] uppercase tracking-widest text-neutral-500 font-mono bg-neutral-900/50">
          <div className="col-span-1">Rank</div>
          <div className="col-span-5">Identity</div>
          <div className="col-span-2 text-center">Score</div>
          <div className="col-span-2 text-center">Stamps</div>
          <div className="col-span-2 text-right">Status</div>
        </div>

        {MOCK_LEADERS.map((leader) => (
          <div key={leader.rank} className="grid grid-cols-12 p-6 items-center hover:bg-white/5 transition-colors group">
            <div className="col-span-1 font-mono text-lg font-bold text-neutral-600 group-hover:text-white">
              #{leader.rank}
            </div>
            <div className="col-span-5 flex items-center gap-3">
              <div className="w-10 h-10 border border-neutral-800 bg-neutral-900 flex items-center justify-center">
                {leader.rank === 1 ? <Trophy className="w-5 h-5 text-yellow-500" /> : <User className="w-5 h-5 text-neutral-600" />}
              </div>
              <span className="font-mono text-sm text-neutral-300">{leader.address}</span>
            </div>
            <div className="col-span-2 text-center font-mono font-bold text-white">
              {leader.score}
            </div>
            <div className="col-span-2 text-center text-neutral-400 font-mono text-sm">
              {leader.stamps}
            </div>
            <div className="col-span-2 text-right">
              <span className={`text-[10px] px-2 py-1 border font-mono uppercase tracking-tighter ${
                leader.rank === 1 ? 'border-white text-white bg-white/10' : 'border-neutral-800 text-neutral-500'
              }`}>
                {leader.status}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-8 p-6 border border-dashed border-neutral-800 flex items-center gap-4 bg-white/5">
        <Zap className="text-white animate-pulse" />
        <p className="text-sm text-neutral-400 font-mono">
          Top 100 users receive a multiplier on all zkPersona ecosystem rewards.
        </p>
      </div>
    </div>
  );
};

