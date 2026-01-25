
import React from 'react';
import { ExternalLink, Shield, Vote, Wallet, Rocket, Users } from 'lucide-react';
import { Button } from './Button';

const DAPPS = [
  {
    name: 'Snapshot Governance',
    category: 'DAO',
    description: 'Use your VERIF score to filter out sybil voters in critical proposals.',
    minScore: 25,
    icon: <Vote className="w-6 h-6" />,
  },
  {
    name: 'Gitcoin Grants',
    category: 'Funding',
    description: 'Boost your quadratic funding matching multiplier with a high humanity score.',
    minScore: 35,
    icon: <Rocket className="w-6 h-6" />,
  },
  {
    name: 'Lens Protocol',
    category: 'Social',
    description: 'Get the "Verified Human" badge on your social profile and reduce spam.',
    minScore: 20,
    icon: <Users className="w-6 h-6" />,
  },
  {
    name: 'Optimism RetroPGF',
    category: 'Rewards',
    description: 'Eligibility for public goods funding rewards for verified developers.',
    minScore: 40,
    icon: <Shield className="w-6 h-6" />,
  },
  {
    name: 'Safe Multisig',
    category: 'Security',
    description: 'Enhance multisig security by requiring hardware-verified biological signers.',
    minScore: 50,
    icon: <Wallet className="w-6 h-6" />,
  }
];

export const Ecosystem: React.FC<{ userScore: number }> = ({ userScore }) => {
  return (
    <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div className="mb-10">
        <h2 className="text-3xl font-bold tracking-tight text-white mb-2 font-mono">INTEGRATIONS</h2>
        <p className="text-neutral-500 font-mono text-sm">Connect your identity to the decentralized web.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {DAPPS.map((dapp) => {
          const isEligible = userScore >= dapp.minScore;
          return (
            <div key={dapp.name} className={`p-8 border flex flex-col transition-all duration-300 ${
              isEligible ? 'border-neutral-800 bg-surface' : 'border-neutral-900 bg-black opacity-60'
            }`}>
              <div className="flex justify-between items-start mb-6">
                <div className="p-3 bg-neutral-900 border border-neutral-800 text-white">
                  {dapp.icon}
                </div>
                <div className="flex flex-col items-end">
                  <span className="text-[10px] uppercase font-mono tracking-widest text-neutral-500 mb-1">Min Score</span>
                  <span className={`font-mono font-bold ${isEligible ? 'text-white' : 'text-neutral-600'}`}>{dapp.minScore}</span>
                </div>
              </div>

              <h3 className="text-xl font-bold text-white mb-2 font-mono uppercase tracking-tight">{dapp.name}</h3>
              <p className="text-sm text-neutral-400 mb-8 leading-relaxed">
                {dapp.description}
              </p>

              <div className="mt-auto flex items-center justify-between">
                <span className="text-[10px] font-mono text-neutral-600 uppercase tracking-widest">
                  {dapp.category}
                </span>
                <Button variant={isEligible ? "outline" : "ghost"} size="sm" className="gap-2">
                  Launch <ExternalLink size={14} />
                </Button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

