import React, { useState, useEffect, useMemo } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { WalletProvider, useWallet } from '@demox-labs/aleo-wallet-adapter-react';
import { LeoWalletAdapter } from '@demox-labs/aleo-wallet-adapter-leo';
import { DecryptPermission, WalletAdapterNetwork, WalletNotSelectedError, WalletName } from '@demox-labs/aleo-wallet-adapter-base';
import { PROGRAM_ID } from './src/deployed_program';
import { usePassport } from './src/hooks/usePassport';
import { useStamps } from './src/hooks/useStamps';
import { Stamp, StampStatus, UserState } from './types';
import { StampCard } from './components/StampCard';
import { Button } from './components/Button';
import { Leaderboard } from './components/Leaderboard';
import { Ecosystem } from './components/Ecosystem';
import { StampSelectionModal, StampOption } from './src/components/StampSelectionModal';
import { TransactionStatus as TransactionStatusComponent, TransactionStatusType as TxStatus } from './src/components/TransactionStatus';
import { VerificationInstructions } from './src/components/VerificationInstructions';
import { WalletRequiredModal } from './src/components/WalletRequiredModal';
import { useVerification } from './src/hooks/useVerification';
import { OAuthCallback } from './src/pages/OAuthCallback';
import { VerifyCallback } from './src/pages/VerifyCallback';
import { VerifyEVM } from './src/pages/VerifyEVM';
import { 
  ShieldCheck, 
  Bitcoin, 
  MessageSquare,
  MessageCircle,
  Video,
  Fingerprint,
  Zap,
  Lock,
  ArrowRight,
  Terminal,
  BrainCircuit,
  ScanFace,
  Database,
  Network,
  Cpu,
  CheckCircle,
  Users,
  Code,
  Layers,
  Box,
  Share2,
  LayoutDashboard,
  Trophy,
  AppWindow,
  Wallet,
  X,
  Loader2,
  Gamepad2
} from 'lucide-react';

// --- Static Data (fallback stamps) ---
const INITIAL_STAMPS: Stamp[] = [
  {
    id: 'eth_wallet',
    title: 'ETH Transaction',
    description: 'Transaction history on the Ethereum network. Minimum 0.01 ETH balance required.',
    icon: <Bitcoin size={24} />,
    scoreWeight: 25,
    status: StampStatus.LOCKED,
    provider: 'ethereum'
  },
  {
    id: 'discord',
    title: 'Discord',
    description: 'Verify genuine Discord engagement and Sybil resistance. Bonus points for Aleo official server membership.',
    icon: <MessageSquare size={24} />,
    scoreWeight: 7.8, // 2.8 base + 5 for Aleo server
    status: StampStatus.LOCKED,
    provider: 'discord'
  },
  {
    id: 'telegram',
    title: 'Telegram',
    description: 'Verify your Telegram account and activity.',
    icon: <MessageCircle size={24} />,
    scoreWeight: 10,
    status: StampStatus.LOCKED,
    provider: 'telegram'
  },
  {
    id: 'tiktok',
    title: 'TikTok',
    description: 'Verify your TikTok account and engagement.',
    icon: <Video size={24} />,
    scoreWeight: 10,
    status: StampStatus.LOCKED,
    provider: 'tiktok'
  }
];

// --- Sub-components ---

const Header = ({ 
  isConnected, 
  onConnect, 
  onDisconnect,
  address,
  onNavClick
}: { 
  isConnected: boolean; 
  onConnect: () => void; 
  onDisconnect?: () => void;
  address: string | null;
  onNavClick?: (view: 'landing' | 'app') => void;
}) => (
  <header className="fixed top-0 w-full z-40 bg-black/80 backdrop-blur-md border-b border-neutral-900">
    <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
      <div 
        className="flex items-center gap-2 cursor-pointer group" 
        onClick={() => onNavClick && onNavClick('landing')}
      >
        <ShieldCheck className="w-8 h-8 text-white group-hover:scale-110 transition-transform" />
        <span className="text-xl font-bold tracking-tighter text-white">VERIF</span>
      </div>
      
      <div className="flex items-center gap-6">
        <nav className="hidden md:flex gap-8 text-sm font-mono text-neutral-400">
          <a href="#features" className="hover:text-white transition-colors">FEATURES</a>
          <a href="#how-it-works" className="hover:text-white transition-colors">HOW IT WORKS</a>
          <a href="#ecosystem" className="hover:text-white transition-colors">ECOSYSTEM</a>
        </nav>
        
        {isConnected ? (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 bg-neutral-900 px-4 py-2 rounded-full border border-neutral-800">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="font-mono text-xs text-neutral-300">{address?.slice(0, 6)}...{address?.slice(-4)}</span>
            </div>
            {onDisconnect && (
              <button
                onClick={onDisconnect}
                className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 hover:border-neutral-600 text-neutral-300 hover:text-white font-mono text-xs uppercase transition-colors rounded-full"
                title="Disconnect wallet"
              >
                <X size={14} className="inline mr-1" />
                Disconnect
              </button>
            )}
          </div>
        ) : (
          <Button size="sm" onClick={onConnect}>
            <Wallet className="w-4 h-4 mr-2" />
            Connect Wallet
          </Button>
        )}
      </div>
    </div>
  </header>
);

const FeatureCard = ({ icon, title, text }: { icon: React.ReactNode, title: string, text: string }) => (
  <div className="p-8 border border-neutral-800 bg-surface hover:border-neutral-600 transition-colors group h-full flex flex-col">
    <div className="mb-6 p-3 bg-neutral-900 w-fit border border-neutral-800 group-hover:bg-white group-hover:text-black transition-colors">
      {icon}
    </div>
    <h3 className="text-xl font-mono text-white mb-3 uppercase">{title}</h3>
    <p className="text-neutral-400 leading-relaxed text-sm flex-grow">
      {text}
    </p>
  </div>
);

const StatItem = ({ value, label }: { value: string, label: string }) => (
  <div className="flex flex-col items-center justify-center p-8 border-r border-neutral-900 last:border-r-0 border-b md:border-b-0">
    <span className="text-4xl md:text-5xl font-bold text-white mb-2 font-mono tracking-tighter">{value}</span>
    <span className="text-xs uppercase tracking-widest text-neutral-500 font-mono">{label}</span>
  </div>
);

const StepCard = ({ number, title, text }: { number: string, title: string, text: string }) => (
  <div className="flex flex-col gap-4 p-6 border-l border-neutral-800 hover:border-white transition-colors hover:bg-white/5">
    <div className="font-mono text-5xl text-neutral-800 font-bold select-none mb-2">
      {number}
    </div>
    <div>
      <h4 className="text-lg text-white font-mono mb-2 uppercase">{title}</h4>
      <p className="text-neutral-400 text-sm leading-relaxed">
        {text}
      </p>
    </div>
  </div>
);

const LandingPage = ({ onEnterApp }: { onEnterApp: () => void }) => (
  <div className="flex flex-col w-full bg-background overflow-x-hidden">
    
    {/* Hero Section */}
    <div className="min-h-screen flex flex-col justify-center items-center pt-20 relative border-b border-neutral-900">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-white opacity-[0.02] rounded-full blur-[120px] pointer-events-none" />
      
      <div className="max-w-4xl mx-auto px-6 text-center z-10 relative mt-20 md:mt-0">
        <div className="inline-flex items-center gap-2 px-3 py-1 border border-neutral-800 rounded-full mb-8 bg-black/50 backdrop-blur-sm">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          <span className="text-xs uppercase tracking-widest text-neutral-400 font-mono">Verif Protocol v1.0 Live</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-9xl font-bold tracking-tighter text-white mb-8 leading-[0.9]">
          Identity. <br />
          <span className="text-neutral-600">Verified.</span>
        </h1>
        
        <p className="text-lg md:text-xl text-neutral-400 max-w-2xl mx-auto mb-12 leading-relaxed font-light">
          The decentralized consensus layer for humanity. 
          Aggregate credentials, prove you are human, and preserve your privacy with zero-knowledge proofs and Gemini AI.
        </p>
        
        <div className="flex flex-col md:flex-row gap-4 justify-center items-center mb-20">
          <Button size="lg" onClick={onEnterApp} className="group min-w-[200px]">
            Launch App 
            <ArrowRight className="ml-2 w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </Button>
          <Button size="lg" variant="outline" className="min-w-[200px]">
            Read Whitepaper
          </Button>
        </div>
      </div>

      <div className="w-full border-t border-neutral-900 bg-surface/50 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto grid grid-cols-1 md:grid-cols-3">
          <StatItem value="1.2M+" label="Unique Humans" />
          <StatItem value="$500M" label="Sybil Fraud Prevented" />
          <StatItem value="85+" label="Integrated DApps" />
        </div>
      </div>
    </div>

    {/* Features Grid */}
    <div id="features" className="py-24 border-b border-neutral-900 bg-surface">
      <div className="max-w-7xl mx-auto px-6">
        <div className="mb-16">
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-6 tracking-tight">System Architecture</h2>
          <p className="text-neutral-400 max-w-2xl text-lg">
            Built on the principles of self-sovereign identity. You own your data. You control your proofs. We just verify the math.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-neutral-900 border border-neutral-900">
          <FeatureCard 
            icon={<Lock className="w-6 h-6" />}
            title="Zero-Knowledge"
            text="Prove you meet requirements without revealing sensitive data. Your biometric hash and social IDs never leave your device."
          />
          <FeatureCard 
            icon={<Zap className="w-6 h-6" />}
            title="AI Turing Test"
            text="Advanced semantic analysis powered by Gemini detects subtle nuances in human language that bots cannot replicate."
          />
          <FeatureCard 
            icon={<Fingerprint className="w-6 h-6" />}
            title="Sybil Resistance"
            text="Aggregated confidence score from multiple providers makes creating fake identities exponentially expensive."
          />
          <FeatureCard 
            icon={<Share2 className="w-6 h-6" />}
            title="Cross-Chain"
            text="Verify once, use everywhere. Your Proof-of-Humanity SBT is readable on Ethereum, Optimism, Arbitrum, and Polygon."
          />
          <FeatureCard 
            icon={<Box className="w-6 h-6" />}
            title="Modular Stamps"
            text="Pluggable verification modules allow communities to define their own trust thresholds and requirements."
          />
          <FeatureCard 
            icon={<Users className="w-6 h-6" />}
            title="Community Governance"
            text="The protocol parameters and weight of each stamp are determined by the VERIF DAO."
          />
        </div>
      </div>
    </div>

    {/* How It Works */}
    <div id="how-it-works" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
        <div>
          <h2 className="text-3xl md:text-5xl font-bold text-white mb-8 tracking-tight">Verification Flow</h2>
          <div className="space-y-4">
            <StepCard 
              number="01" 
              title="Connect Identity" 
              text="Link your digital footprint: Social accounts, Git history, and on-chain activity." 
            />
            <StepCard 
              number="02" 
              title="Prove Humanity" 
              text="Complete the AI Turing challenge or biometric liveness check to confirm biological existence." 
            />
            <StepCard 
              number="03" 
              title="Mint Passport" 
              text="Generate a privacy-preserving Soulbound Token (SBT) that acts as your universal pass." 
            />
          </div>
        </div>
        
        {/* Visual Decoration */}
        <div className="relative h-[600px] border border-neutral-800 bg-surfaceHighlight p-8 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}></div>
          
          <div className="relative z-10 w-64 h-80 bg-black border border-neutral-700 flex flex-col shadow-2xl">
            <div className="h-40 bg-neutral-900 border-b border-neutral-800 flex items-center justify-center">
              <ScanFace className="w-16 h-16 text-neutral-700" />
            </div>
            <div className="p-6 space-y-4">
              <div className="h-2 w-3/4 bg-neutral-800 rounded"></div>
              <div className="h-2 w-1/2 bg-neutral-800 rounded"></div>
              <div className="mt-8 flex justify-between items-center">
                <div className="w-8 h-8 rounded-full bg-neutral-800"></div>
                <div className="px-3 py-1 bg-white text-black text-[10px] font-mono font-bold uppercase">Verified</div>
              </div>
            </div>
            
            {/* Floating Elements */}
            <div className="absolute -right-12 -top-12 bg-white text-black p-4 font-mono text-xs border border-neutral-400 shadow-[4px_4px_0px_0px_rgba(255,255,255,0.2)]">
              ZK-PROOF: VALID
            </div>
            <div className="absolute -left-8 -bottom-8 bg-surfaceHighlight text-white p-4 font-mono text-xs border border-neutral-700 shadow-[4px_4px_0px_0px_rgba(50,50,50,1)]">
               SCORE: 88.5
            </div>
          </div>
        </div>
      </div>
    </div>

    {/* Ecosystem Marquee */}
    <div id="ecosystem" className="py-20 border-y border-neutral-900 bg-surface overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
        <p className="font-mono text-sm text-neutral-500 uppercase tracking-widest">Trusted by 100+ Ecosystem Partners</p>
      </div>
      <div className="flex gap-12 justify-center items-center opacity-50 grayscale hover:grayscale-0 transition-all duration-500">
         {/* Placeholder Logos using Text/Icons for demo */}
         <div className="flex items-center gap-2 text-xl font-bold"><Database /> DAObase</div>
         <div className="flex items-center gap-2 text-xl font-bold"><Network /> Optimism</div>
         <div className="flex items-center gap-2 text-xl font-bold"><Layers /> Gitcoin</div>
         <div className="flex items-center gap-2 text-xl font-bold"><Cpu /> Galxe</div>
         <div className="flex items-center gap-2 text-xl font-bold"><Code /> Lens</div>
      </div>
    </div>

    {/* Footer Call to Action */}
    <div className="py-32 bg-background flex flex-col items-center text-center px-6">
      <h2 className="text-4xl md:text-6xl font-bold text-white mb-8 tracking-tighter">Ready to prove you exist?</h2>
      <p className="text-neutral-400 max-w-xl mb-10 text-lg">
        Join the network of verified humans. Secure your spot in the future of digital identity today.
      </p>
      <Button size="lg" onClick={onEnterApp}>
        Launch Application
      </Button>
    </div>

    <footer className="border-t border-neutral-900 bg-black py-12">
      <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-6">
        <div className="flex items-center gap-2">
          <ShieldCheck className="w-6 h-6 text-white" />
          <span className="text-lg font-bold tracking-tighter text-white">VERIF</span>
        </div>
        <div className="flex gap-8 text-sm text-neutral-500 font-mono">
          <a href="#" className="hover:text-white transition-colors">Discord</a>
          <a href="#" className="hover:text-white transition-colors">Telegram</a>
          <a href="#" className="hover:text-white transition-colors">TikTok</a>
          <a href="#" className="hover:text-white transition-colors">Mirror</a>
        </div>
        <div className="text-neutral-600 text-xs font-mono">
          © 2024 VERIF PROTOCOL LABS
        </div>
      </div>
    </footer>
  </div>
);

type DashboardTab = 'stamps' | 'leaderboard' | 'ecosystem';

const Dashboard = ({ user, onVerifyStamp }: { user: UserState; onVerifyStamp: (id: string, success: boolean) => void }) => {
  const { publicKey } = useWallet();
  const { hasPassport, createPassport, loading: passportLoading, checkPassport } = usePassport();
  const { stamps: aleoStamps, userStamps, loading: stampsLoading } = useStamps();
  const { verifications, getTotalScore } = useVerification(publicKey || undefined);
  const [stamps, setStamps] = useState<Stamp[]>(INITIAL_STAMPS);
  const [activeTab, setActiveTab] = useState<DashboardTab>('stamps');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showStampSelection, setShowStampSelection] = useState(false);
  const [showTransactionStatus, setShowTransactionStatus] = useState(false);
  const [showVerificationInstructions, setShowVerificationInstructions] = useState(false);
  const [selectedStamps, setSelectedStamps] = useState<string[]>([]);
  const [transactionId, setTransactionId] = useState<string | null>(null);
  const [transactionStatus, setTransactionStatus] = useState<TxStatus>('waiting');

  // Map Aleo stamps to UI stamps
  useEffect(() => {
    if (aleoStamps.length > 0) {
      const mappedStamps: Stamp[] = aleoStamps.map((aleoStamp, index) => {
        // Map stamp_id to provider/icon
        const iconMap = [
          <Globe size={24} />,
          <Twitter size={24} />,
          <Bitcoin size={24} />,
          <Github size={24} />,
          <ScanFace size={24} />,
          <BrainCircuit size={24} />,
        ];
        const providerMap: Array<'ethereum' | 'discord' | 'telegram' | 'tiktok'> = [
          'ethereum', 'discord', 'telegram', 'tiktok'
        ];
        
        const isEarned = userStamps.includes(aleoStamp.stamp_id);
        const provider = providerMap[index % providerMap.length] || 'discord';
        
        // Check if verified via verification system
        const verification = verifications[provider] || verifications[aleoStamp.stamp_id];
        const isVerified = isEarned || (verification?.verified && verification.status === 'connected');
        
        return {
          id: `stamp_${aleoStamp.stamp_id}`,
          title: aleoStamp.name,
          description: aleoStamp.description,
          icon: iconMap[index % iconMap.length] || <Globe size={24} />,
          scoreWeight: aleoStamp.points,
          status: isVerified ? StampStatus.VERIFIED : StampStatus.LOCKED,
          provider: provider,
          stamp_id: aleoStamp.stamp_id,
          name: aleoStamp.name,
          category: aleoStamp.category,
          points: aleoStamp.points,
          is_active: aleoStamp.is_active,
          earned: isEarned,
        };
      });
      setStamps(mappedStamps);
    } else {
      // Use initial stamps if no Aleo stamps - update based on verifications
      setStamps(INITIAL_STAMPS.map(stamp => {
        const verification = verifications[stamp.provider] || verifications[stamp.id];
        const isVerified = verification?.verified && verification.status === 'connected';
        return {
        ...stamp,
          status: isVerified ? StampStatus.VERIFIED : (user.stamps[stamp.id] || StampStatus.LOCKED)
        };
      }));
    }
  }, [aleoStamps, userStamps, user.stamps, verifications]);

  // Update user score from verifications
  useEffect(() => {
    const totalScore = getTotalScore();
    if (totalScore > 0) {
      // Update user score through parent component
      onVerifyStamp('', true); // Trigger update
    }
  }, [verifications, getTotalScore, onVerifyStamp]);
  
  // Listen for verification updates and refresh state
  useEffect(() => {
    const handleVerificationUpdate = () => {
      console.log('[App] 🔔 Verification update event received, refreshing state...');
      // Force re-check passport
      if (checkPassport) {
        checkPassport();
      }
      // Trigger state update by reloading verifications from localStorage
      window.dispatchEvent(new Event('storage'));
    };

    window.addEventListener('verification-updated', handleVerificationUpdate);
    return () => window.removeEventListener('verification-updated', handleVerificationUpdate);
  }, [checkPassport]);
  
  // Re-check passport after verification to update UI
  useEffect(() => {
    if (publicKey && checkPassport) {
      // Small delay to ensure blockchain state is updated
      const timer = setTimeout(() => {
        checkPassport();
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [verifications, publicKey, checkPassport]);

  const scoreColor = user.score > 20 ? 'text-white' : 'text-neutral-600';
  const progressWidth = Math.min(user.score, 100);

  // Prepare stamp options for selection modal
  const stampOptions: StampOption[] = INITIAL_STAMPS.map(stamp => ({
    id: stamp.id,
    title: stamp.title,
    description: stamp.description,
    icon: stamp.icon,
    provider: stamp.provider,
    scoreWeight: stamp.scoreWeight
  }));

  // Handle stamp selection confirmation - no passport creation needed
  const handleStampsSelected = async (selectedIds: string[]) => {
    setSelectedStamps(selectedIds);
    setShowStampSelection(false);
    // Open verification instructions directly without creating passport
    setShowVerificationInstructions(true);
  };

  // Handle transaction confirmation
  const handleTransactionConfirmed = () => {
    setShowTransactionStatus(false);
    setShowVerificationInstructions(true);
  };

  // Handle transaction error
  const handleTransactionError = () => {
    setShowTransactionStatus(false);
    setSelectedStamps([]);
  };

  // No passport creation required - user can start verifications immediately

  return (
    <>
      <div className="min-h-screen pt-32 pb-20 px-6 max-w-7xl mx-auto">
      
      {/* Stats Header */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-8 mb-16">
        <div className="md:col-span-8 flex flex-col justify-end">
          <h2 className="text-4xl font-bold tracking-tight mb-4 font-mono uppercase">Identity Portal</h2>
          
          <div className="flex gap-4 mt-4">
            <button 
              onClick={() => setActiveTab('stamps')}
              className={`flex items-center gap-2 px-6 py-3 font-mono text-xs uppercase tracking-widest border transition-all ${
                activeTab === 'stamps' ? 'bg-white text-black border-white' : 'text-neutral-500 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <LayoutDashboard size={14} /> My Stamps
            </button>
            <button 
              onClick={() => setActiveTab('leaderboard')}
              className={`flex items-center gap-2 px-6 py-3 font-mono text-xs uppercase tracking-widest border transition-all ${
                activeTab === 'leaderboard' ? 'bg-white text-black border-white' : 'text-neutral-500 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <Trophy size={14} /> Leaderboard
            </button>
            <button 
              onClick={() => setActiveTab('ecosystem')}
              className={`flex items-center gap-2 px-6 py-3 font-mono text-xs uppercase tracking-widest border transition-all ${
                activeTab === 'ecosystem' ? 'bg-white text-black border-white' : 'text-neutral-500 border-neutral-800 hover:border-neutral-700'
              }`}
            >
              <AppWindow size={14} /> Integrations
            </button>
          </div>
        </div>
        
        <div className="md:col-span-4 bg-surface border border-neutral-800 p-6 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <span className="font-mono text-sm uppercase text-neutral-500">Humanity Score</span>
            <Terminal className="w-5 h-5 text-neutral-600" />
          </div>
          <div>
            <div className={`text-6xl font-bold mb-2 font-mono ${scoreColor}`}>
              {user.score.toFixed(1)}
            </div>
            <div className="w-full h-1 bg-neutral-900 mt-4 overflow-hidden">
              <div 
                className="h-full bg-white transition-all duration-1000 ease-out" 
                style={{ width: `${progressWidth}%` }} 
              />
            </div>
          </div>
        </div>
      </div>

      <div className="min-h-[400px]">
        {activeTab === 'stamps' && (
          <>
            {/* Category Filters - Always visible */}
            <div className="mb-6 flex flex-wrap gap-3">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-4 py-2 font-mono uppercase text-sm transition-all ${
                  (selectedCategory || 'all') === 'all'
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                All Platforms
              </button>
              <button
                onClick={() => setSelectedCategory('social')}
                className={`px-4 py-2 font-mono uppercase text-sm transition-all ${
                  (selectedCategory || 'all') === 'social'
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                Social Networks
              </button>
              <button
                onClick={() => setSelectedCategory('onchain')}
                className={`px-4 py-2 font-mono uppercase text-sm transition-all ${
                  (selectedCategory || 'all') === 'onchain'
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                On-chain
              </button>
              <button
                onClick={() => setSelectedCategory('other')}
                className={`px-4 py-2 font-mono uppercase text-sm transition-all ${
                  (selectedCategory || 'all') === 'other'
                    ? 'bg-white text-black'
                    : 'bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700'
                }`}
              >
                Other
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in duration-500">
              {stampsLoading ? (
                <div className="col-span-full text-center py-12 text-neutral-400 font-mono">
                  Loading stamps from blockchain...
                </div>
              ) : (
                stamps
                  .filter((stamp) => {
                    const category = selectedCategory || 'all';
                    if (category === 'all') return true;
                    if (category === 'social') {
                      return ['discord', 'telegram', 'tiktok'].includes(stamp.provider);
                    }
                    if (category === 'onchain') {
                      return ['ethereum', 'eth_wallet'].includes(stamp.provider);
                    }
                    if (category === 'other') {
                      return ['gemini', 'face_scan', 'steam'].includes(stamp.provider);
                    }
                    return true;
                  })
                  .map((stamp) => (
                    <StampCard 
                      key={stamp.id} 
                      stamp={stamp} 
                      onVerify={onVerifyStamp}
                      onOpenVerificationInstructions={(stampId) => {
                        // Normalize stamp ID (eth_wallet -> ethereum)
                        const normalizedId = stampId === 'eth_wallet' ? 'ethereum' : stampId;
                        setSelectedStamps([normalizedId]);
                        setShowVerificationInstructions(true);
                      }}
                    />
                  ))
              )}
            </div>
          </>
        )}

        {activeTab === 'leaderboard' && (
          <Leaderboard />
        )}

        {activeTab === 'ecosystem' && (
          <Ecosystem userScore={user.score} />
        )}
      </div>

      {/* Footer Info */}
      <div className="mt-20 pt-10 border-t border-neutral-900 text-center">
        <p className="text-neutral-600 text-sm font-mono">
          VERIF PROTOCOL &copy; 2024. BUILT ON ALEO. POWERED BY GEMINI.
        </p>
      </div>

      {/* Modals */}
      <StampSelectionModal
        isOpen={showStampSelection}
        onClose={() => setShowStampSelection(false)}
        onConfirm={handleStampsSelected}
        availableStamps={stampOptions}
      />

      {showTransactionStatus && (
        <TransactionStatusComponent
          txId={transactionId}
          status={transactionStatus}
          onConfirm={handleTransactionConfirmed}
          onError={handleTransactionError}
        />
      )}

      <VerificationInstructions
        isOpen={showVerificationInstructions}
        onClose={() => {
          setShowVerificationInstructions(false);
          setSelectedStamps([]);
        }}
        selectedStamps={selectedStamps}
        onStartVerification={(stampId) => {
          // Handle verification start
          console.log('Starting verification for:', stampId);
        }}
      />
    </div>
    </>
  );
};

// --- Main App Component ---

const AppContent = () => {
  const [view, setView] = useState<'landing' | 'app'>(() => {
    // Load saved view from localStorage
    const saved = localStorage.getItem('app_view');
    return (saved === 'app' || saved === 'landing') ? saved : 'landing';
  });
  
  const { publicKey, connect, disconnect, wallet, connecting, select, wallets } = useWallet();
  const { passport } = usePassport();
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [user, setUser] = useState<UserState>(() => {
    // Load saved user state from localStorage
    const saved = localStorage.getItem('user_state');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch {
        // Fallback to default
      }
    }
    return {
      isConnected: false,
      address: null,
      score: 0.0,
      stamps: {}
    };
  });

  // Save view to localStorage
  useEffect(() => {
    localStorage.setItem('app_view', view);
  }, [view]);

  // Save user state to localStorage
  useEffect(() => {
    localStorage.setItem('user_state', JSON.stringify(user));
  }, [user]);

  // Auto-connect wallet if previously connected
  useEffect(() => {
    const savedWallet = localStorage.getItem('selected_wallet');
    const savedAddress = localStorage.getItem('wallet_address');
    
    if (savedWallet && savedAddress && !publicKey) {
      // Try to auto-connect
      const timer = setTimeout(() => {
        if (select) {
          select(savedWallet as WalletName);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [select, publicKey]);

  useEffect(() => {
    if (publicKey) {
      // Save wallet connection
      localStorage.setItem('wallet_address', publicKey);
      if (wallet?.adapter.name) {
        localStorage.setItem('selected_wallet', wallet.adapter.name);
      }
      
      setUser(prev => ({
        ...prev,
        isConnected: true,
        address: publicKey
      }));
      
      // Auto-navigate to app if on landing
      if (view === 'landing') {
        setView('app');
      }

      // Automatically analyze EVM wallet if connected
      // Note: This is for Aleo wallet, but we can add EVM analysis if wallet supports it
      // For now, this is handled via the stamp verification flow
    } else {
      setUser(prev => ({
        ...prev,
        isConnected: false,
        address: null
      }));
    }
  }, [publicKey, wallet, view]);

  const { verifications, getTotalScore, refreshVerifications } = useVerification(publicKey || undefined);

  // Update score from passport or verifications
  useEffect(() => {
    const verificationScore = getTotalScore();
    
    if (passport && passport.humanity_score > 0) {
      // Use passport score if available (from blockchain)
      setUser(prev => ({
        ...prev,
        score: Math.max(passport.humanity_score, verificationScore)
      }));
    } else if (verificationScore > 0) {
      // Use verification score if passport not yet on-chain
      setUser(prev => ({
        ...prev,
        score: verificationScore
      }));
    }
  }, [passport, verifications, getTotalScore]);

  // Listen for verification updates and refresh verifications (without reloading page)
  useEffect(() => {
    const handleVerificationUpdate = () => {
      console.log('[AppContent] 🔔 Verification update event received, refreshing verifications...');
      // Refresh verifications from backend (this will update state without page reload)
      if (refreshVerifications) {
        refreshVerifications();
      }
    };

    window.addEventListener('verification-updated', handleVerificationUpdate);
    return () => window.removeEventListener('verification-updated', handleVerificationUpdate);
  }, [refreshVerifications]);

  // Listen for wallet modal open event from WalletRequiredModal
  useEffect(() => {
    const handleOpenWalletModal = () => {
      setShowWalletModal(true);
    };

    window.addEventListener('open-wallet-modal', handleOpenWalletModal);
    return () => window.removeEventListener('open-wallet-modal', handleOpenWalletModal);
  }, []);

  const handleConnectWallet = async (adapterName: string) => {
    const adapter = wallets.find(w => w.adapter.name === adapterName)?.adapter;
    if (!adapter) return;

    if (adapterName === "Leo Wallet" && !(window as any).leoWallet) {
      alert("Please install Leo Wallet extension first!");
      setShowWalletModal(false);
      return;
    }

    try {
      if (select) {
        select(adapterName as WalletName);
      }
      await adapter.connect(DecryptPermission.OnChainHistory, WalletAdapterNetwork.TestnetBeta, [PROGRAM_ID]);
      setShowWalletModal(false);
    } catch (error: any) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes("NETWORK_NOT_GRANTED")) {
        alert(`Connection failed: Incorrect Network.\nPlease switch your Leo Wallet to 'TestnetBeta' and try again.`);
      } else if (error instanceof WalletNotSelectedError || 
                 error?.name === 'WalletNotSelectedError' || 
                 errorMsg.includes('WalletNotSelectedError') ||
                 errorMsg.includes('Wallet not selected')) {
        // Silent fail - user cancelled
        setShowWalletModal(false);
      } else {
        alert("Connection failed: " + errorMsg);
      }
    }
  };

  const handleEnterApp = () => {
    // If wallet is already connected, go directly to app
    if (publicKey) {
      setView('app');
      return;
    }
    
    // Otherwise, show wallet selection modal
    setShowWalletModal(true);
  };

  // Auto-navigate to app when wallet connects
  useEffect(() => {
    if (publicKey && view === 'landing') {
      // Small delay to ensure wallet state is fully updated
      const timer = setTimeout(() => {
        setView('app');
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [publicKey, view]);

  const handleVerifyStamp = (id: string, success: boolean) => {
    if (!success) return;

    setUser(prev => {
      if (prev.stamps[id] === StampStatus.VERIFIED) return prev;

      const stamp = INITIAL_STAMPS.find(s => s.id === id);
      const points = stamp ? stamp.scoreWeight : 0;

      return {
        ...prev,
        score: Math.min(prev.score + points, 100),
        stamps: {
          ...prev.stamps,
          [id]: StampStatus.VERIFIED
        }
      };
    });
  };

  return (
    <div className="bg-background text-primary min-h-screen selection:bg-white selection:text-black">
      <Header 
        isConnected={user.isConnected} 
        onConnect={() => setShowWalletModal(true)} 
        onDisconnect={async () => {
          try {
            if (disconnect) {
              await disconnect();
            }
            // Clear wallet from localStorage
            localStorage.removeItem('wallet_address');
            localStorage.removeItem('selected_wallet');
            setUser(prev => ({
              ...prev,
              isConnected: false,
              address: null
            }));
            console.log('[App] ✅ Wallet disconnected');
          } catch (error) {
            console.error('[App] ❌ Error disconnecting wallet:', error);
          }
        }}
        address={user.address}
        onNavClick={setView}
      />
      
      <main>
        {view === 'landing' ? (
          <LandingPage onEnterApp={handleEnterApp} />
        ) : (
          <Dashboard user={user} onVerifyStamp={handleVerifyStamp} />
        )}
      </main>

      {/* Wallet Selection Modal */}
      {showWalletModal && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md transition-opacity duration-300"
          style={{ animation: 'fadeIn 0.3s ease-in' }}
        >
          <div 
            className="bg-black border border-neutral-700 max-w-md w-full p-8 relative shadow-2xl transition-all duration-300"
            style={{ animation: 'zoomIn 0.3s ease-out' }}
          >
            <button 
              onClick={() => setShowWalletModal(false)} 
              className="absolute top-4 right-4 text-neutral-500 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="mb-6">
              <h2 className="text-2xl font-mono uppercase text-white mb-2">Select Wallet</h2>
              <p className="text-neutral-400 text-sm">Choose a wallet to connect</p>
            </div>

            <div className="space-y-3">
              {wallets.map((walletOption) => (
                <button
                  key={walletOption.adapter.name}
                  onClick={() => handleConnectWallet(walletOption.adapter.name)}
                  disabled={connecting}
                  className="w-full p-4 border border-neutral-800 bg-surface hover:border-white transition-colors text-left flex items-center justify-between group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 border border-neutral-700 bg-neutral-900 flex items-center justify-center">
                      <Wallet className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="font-mono text-white text-sm">{walletOption.adapter.name}</div>
                      {walletOption.adapter.name === "Leo Wallet" && !(window as any).leoWallet && (
                        <div className="text-xs text-red-400">Extension not installed</div>
                      )}
                    </div>
                  </div>
                  {connecting && wallet?.adapter.name === walletOption.adapter.name && (
                    <Loader2 className="w-5 h-5 text-white animate-spin" />
                  )}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const App = () => {
  const network = WalletAdapterNetwork.TestnetBeta;

  const wallets = useMemo(
    () => [
      new LeoWalletAdapter({
        appName: "VERIF Protocol",
      }),
    ],
    []
  );

  return (
    <WalletProvider
      wallets={wallets}
      decryptPermission={DecryptPermission.OnChainHistory}
      network={network}
      programs={[PROGRAM_ID]}
      autoConnect={false}
    >
      <Router future={{ 
        v7_startTransition: true,
        v7_relativeSplatPath: true 
      }}>
        <Routes>
          <Route path="/oauth/callback" element={<OAuthCallback />} />
          <Route path="/callback" element={<OAuthCallback />} />
          <Route path="/verify/callback" element={<VerifyCallback />} />
          <Route path="/verify/evm" element={<VerifyEVM />} />
          <Route path="*" element={<AppContent />} />
        </Routes>
      </Router>
    </WalletProvider>
  );
};

export default App;

