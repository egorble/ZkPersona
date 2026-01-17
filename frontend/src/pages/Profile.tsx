import { useState, useEffect } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { usePassport } from "../hooks/usePassport";
import { PassportScore } from "../components/PassportScore";
import { StampCard } from "../components/StampCard";
import { Stamp } from "../types";
import { formatAddress } from "../utils/aleo";
import { initializeSampleData } from "../utils/sampleData";
import "./Profile.css";

export const Profile = () => {
    const { publicKey } = useWallet();
    const { passport } = usePassport();
    const [stamps, setStamps] = useState<Stamp[]>([]);
    const [userStamps, setUserStamps] = useState<number[]>([]);

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
            return () => window.removeEventListener("stamp-granted", handleStampGranted);
        }
    }, [publicKey]);

    if (!publicKey) {
        return (
            <div className="profile-page fade-in">
                <div className="profile-placeholder">
                    <h2>Connect your wallet to view your profile</h2>
                </div>
            </div>
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

    return (
        <div className="profile-page fade-in">
            <div className="profile-header">
                <div className="profile-avatar">
                    {publicKey.slice(2, 3).toUpperCase()}
                </div>
                <div className="profile-info">
                    <h1 className="profile-title">My Passport</h1>
                    <p className="profile-address">{formatAddress(publicKey, 10, 8)}</p>
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

