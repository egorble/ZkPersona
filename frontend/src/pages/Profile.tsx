import { useState, useEffect } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { usePassport } from "../hooks/usePassport";
import { PassportScore } from "../components/PassportScore";
import { StampCard } from "../components/StampCard";
import { Stamp } from "../types";
import { formatAddress } from "../utils/aleo";
import { initializeSampleData } from "../utils/sampleData";
import { getUser, onAuthStateChange, signInWithOAuth, getProfile } from "../lib/auth";
import { MessageCircle } from "lucide-react";
import { WalletRequiredModal } from "../components/WalletRequiredModal";
import "./Profile.css";

interface DiscordProfile {
    discordId?: string;
    discordUsername?: string;
    discordDiscriminator?: string;
    discordNickname?: string;
    discordAvatarUrl?: string;
    discordProfileLink?: string;
}

export const Profile = () => {
    const { publicKey, connect, wallet, select, wallets } = useWallet();
    const { passport } = usePassport();
    const [stamps, setStamps] = useState<Stamp[]>([]);
    const [userStamps, setUserStamps] = useState<number[]>([]);
    const [discordProfile, setDiscordProfile] = useState<DiscordProfile | null>(null);
    const [loadingProfile, setLoadingProfile] = useState(false);
    const [showWalletModal, setShowWalletModal] = useState(false);

    useEffect(() => {
        // Initialize sample data if needed
        initializeSampleData();

        if (publicKey) {
            // Load stamps
            const savedStamps = localStorage.getItem("stamps");
            if (savedStamps) {
                try {
                    const parsed = JSON.parse(savedStamps);
                    setStamps(parsed);
                } catch (e) {
                    console.error("Failed to parse stamps:", e);
                }
            }

            // Load user stamps
            const savedUserStamps = localStorage.getItem(`user_stamps_${publicKey}`);
            if (savedUserStamps) {
                try {
                    setUserStamps(JSON.parse(savedUserStamps));
                } catch (e) {
                    console.error("Failed to parse user stamps:", e);
                }
            }

            // Load Discord profile (Propel-like: from auth user)
            const loadDiscordProfile = async () => {
                setLoadingProfile(true);
                try {
                    // Get user from auth (Propel pattern)
                    const { data } = await getUser();
                    const u = data.user;
                    
                    if (u?.id) {
                        // Get profile from backend (Propel pattern)
                        const profRes = await getProfile(u.id);
                        if (profRes) {
                            setDiscordProfile(profRes);
                        }
                    }
                } catch (error) {
                    console.error("Failed to load Discord profile:", error);
                } finally {
                    setLoadingProfile(false);
                }
            };
            loadDiscordProfile();

            // Subscribe to auth state changes (Propel pattern)
            let subscription: ReturnType<typeof onAuthStateChange> | null = null;
            
            const setupAuthListener = () => {
                subscription = onAuthStateChange(async (_event, session) => {
                    if (session?.user?.id) {
                        const profRes = await getProfile(session.user.id);
                        if (profRes) {
                            setDiscordProfile(profRes);
                        }
                    }
                });
            };
            
            setupAuthListener();

            // Listen for stamp grants
            const handleStampGranted = () => {
                const savedUserStamps = localStorage.getItem(`user_stamps_${publicKey}`);
                if (savedUserStamps) {
                    try {
                        setUserStamps(JSON.parse(savedUserStamps));
                    } catch (e) {
                        console.error("Failed to parse user stamps:", e);
                    }
                }
            };

            window.addEventListener("stamp-granted", handleStampGranted);
            
            // Cleanup
            return () => {
                window.removeEventListener("stamp-granted", handleStampGranted);
                if (subscription) {
                    subscription.data.subscription.unsubscribe();
                }
            };
        }
    }, [publicKey]);

    const handleConnectWallet = () => {
        setShowWalletModal(true);
    };

    if (!publicKey) {
        return (
            <>
                <div className="profile-page fade-in">
                    <div className="profile-placeholder">
                        <h2>Connect your wallet to view your profile</h2>
                    </div>
                </div>
                <WalletRequiredModal
                    isOpen={showWalletModal}
                    onClose={() => setShowWalletModal(false)}
                    onConnect={handleConnectWallet}
                    action="view your profile"
                />
            </>
        );
    }

    if (!passport) {
        return (
            <div className="profile-page fade-in">
                <div className="profile-placeholder">
                    <h2>Create your passport to view your profile</h2>
                    <p>Go to Dashboard to create your passport</p>
                </div>
            </div>
        );
    }

    const earnedStamps = stamps.filter(s => userStamps.includes(s.stamp_id));

    // Get display name and avatar from Discord profile
    const displayName = discordProfile?.discordNickname || 
                       discordProfile?.discordUsername || 
                       `User ${formatAddress(publicKey, 4, 4)}`;
    
    const avatarUrl = discordProfile?.discordAvatarUrl;
    const avatarFallback = discordProfile?.discordNickname?.slice(0, 2).toUpperCase() || 
                          discordProfile?.discordUsername?.slice(0, 2).toUpperCase() || 
                          publicKey.slice(2, 3).toUpperCase();

    return (
        <div className="profile-page fade-in">
            <div className="profile-header">
                <div className="profile-avatar" style={avatarUrl ? {
                    backgroundImage: `url(${avatarUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center'
                } : {}}>
                    {!avatarUrl && avatarFallback}
                </div>
                <div className="profile-info">
                    <h1 className="profile-title">{displayName}</h1>
                    <p className="profile-address">{formatAddress(publicKey, 10, 8)}</p>
                    {discordProfile && (
                        <div className="profile-discord-info" style={{ 
                            marginTop: '8px', 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            fontSize: '14px',
                            color: '#7289da'
                        }}>
                            <MessageCircle size={16} />
                            <span>{discordProfile.discordUsername || 'Discord'}</span>
                            {discordProfile.discordProfileLink && (
                                <a 
                                    href={discordProfile.discordProfileLink} 
                                    target="_blank" 
                                    rel="noreferrer"
                                    style={{ 
                                        marginLeft: '8px',
                                        textDecoration: 'underline',
                                        color: '#7289da'
                                    }}
                                >
                                    View Profile
                                </a>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <div className="profile-content">
                <PassportScore
                    humanityScore={passport.humanity_score}
                    totalStamps={passport.total_stamps}
                    totalPoints={passport.total_points}
                />

                {earnedStamps.length > 0 ? (
                    <section className="profile-stamps-section">
                        <h2 className="section-title">My Stamps ({earnedStamps.length})</h2>
                        <div className="stamps-grid">
                            {earnedStamps.map(stamp => (
                                <StampCard key={stamp.stamp_id} stamp={stamp} />
                            ))}
                        </div>
                    </section>
                ) : (
                    <div className="empty-state">
                        <p>You haven't earned any stamps yet. Complete tasks to earn stamps!</p>
                    </div>
                )}
            </div>
        </div>
    );
};

