import { useState, useEffect } from "react";
import type { FC } from "react";
import { Link, useLocation } from "react-router-dom";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletAdapterNetwork, DecryptPermission } from "@demox-labs/aleo-wallet-adapter-base";
import type { WalletName } from "@demox-labs/aleo-wallet-adapter-base";
import { useAdmin } from "../hooks/useAdmin";
import { usePassport } from "../hooks/usePassport";
import { logger } from "../utils/logger";
import { PAGE_PADDING } from "./PageWidthGrid";
import "./Header.css";

interface HeaderProps {
    programId: string;
    showTopNav?: boolean;
    skipCustomisation?: boolean;
}

const WalletIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4" />
        <path d="M4 6v12a2 2 0 0 0 2 2h14v-4" />
        <path d="M18 12a2 2 0 0 0-2 2c0 1.1.9 2 2 2h4v-4h-4z" />
    </svg>
);

const useRadialBackgroundColorForHeader = (skipCustomisation: Boolean = false): string => {
  const { passport } = usePassport();
  const threshold = 20;
  const aboveThreshold = threshold && passport ? passport.humanity_score >= threshold : false;
  const fallbackBackgroundColor = !skipCustomisation && aboveThreshold ? "#BEFEE2" : "#E5E5E5";
  return fallbackBackgroundColor;
};

export const Header: FC<HeaderProps> = ({ programId, showTopNav = false, skipCustomisation = false }) => {
    const { publicKey, disconnect, connecting, select, wallets, connect, wallet } = useWallet();
    const { isAdmin } = useAdmin();
    const [showModal, setShowModal] = useState(false);
    const [walletAddress, setWalletAddress] = useState<string | null>(null);
    const location = useLocation();
    const network = WalletAdapterNetwork.TestnetBeta;

    useEffect(() => {
        if (publicKey) {
            setWalletAddress(publicKey);
            logger.wallet.connected(publicKey);
            localStorage.setItem("wallet_connected", "true");
            localStorage.setItem("wallet_address", publicKey);
            if (wallet?.adapter?.name) {
                localStorage.setItem("wallet_adapter", wallet.adapter.name);
            }
        } else {
            setWalletAddress(null);
        }
    }, [publicKey, wallet]);

    const handleConnect = async (adapterName: string) => {
        const adapter = wallets.find(w => w.adapter.name === adapterName)?.adapter;
        if (!adapter) return;

        if (adapterName === "Leo Wallet" && !(window as any).leoWallet) {
            alert("Please install Leo Wallet extension first!");
            setShowModal(false);
            return;
        }

        try {
            logger.wallet.connecting();
            await adapter.connect(DecryptPermission.OnChainHistory, network, [programId]);
            select(adapterName as WalletName);
            setShowModal(false);
        } catch (e) {
            logger.error("Wallet Connection", e instanceof Error ? e.message : String(e));
            const errorMsg = e instanceof Error ? e.message : String(e);
            if (errorMsg.includes("NETWORK_NOT_GRANTED")) {
                alert(`Connection failed: Incorrect Network.\nPlease switch your Leo Wallet to '${network}' and try again.`);
            } else {
                alert("Connection failed: " + errorMsg);
            }
        }
    };

    const handleDisconnect = () => {
        disconnect();
        logger.wallet.disconnected();
        localStorage.removeItem("wallet_connected");
        localStorage.removeItem("wallet_address");
        localStorage.removeItem("wallet_adapter");
    };

    const isActive = (path: string) => location.pathname === path;

    const backgroundColor = useRadialBackgroundColorForHeader(skipCustomisation === true);

    return (
        <>
            <div
                style={{ background: `radial-gradient(ellipse 100vw 200px at 50% 50%, white, ${backgroundColor})` }}
                className="top-0 left-0 w-full fixed z-30"
            >
                <div className={`${PAGE_PADDING}`}>
                    <header className="header">
                        <div className="header-container">
                            <Link to="/" className="logo">
                                <svg width="132" height="27" viewBox="0 0 132 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <text x="0" y="20" className="font-heading text-xl font-bold">ZKPERSONA</text>
                                </svg>
                            </Link>

                    <nav className="nav">
                        <Link to="/" className={`nav-link ${isActive("/") ? "active" : ""}`}>
                            Dashboard
                        </Link>
                        <Link to="/stamps" className={`nav-link ${isActive("/stamps") ? "active" : ""}`}>
                            Stamps
                        </Link>
                        <Link to="/profile" className={`nav-link ${isActive("/profile") ? "active" : ""}`}>
                            Profile
                        </Link>
                        {isAdmin && (
                            <Link to="/admin" className={`nav-link ${isActive("/admin") ? "active" : ""}`}>
                                Admin
                            </Link>
                        )}
                    </nav>

                    <div className="wallet-section">
                        {publicKey ? (
                            <div className="wallet-info wallet-connected">
                                <span className="status-dot connected"></span>
                                <div className={`wallet-address ${walletAddress ? "fade-in-slide" : ""}`}>
                                    {publicKey.slice(0, 6)}...{publicKey.slice(-4)}
                                </div>
                                <button onClick={handleDisconnect} className="wallet-button disconnect">
                                    Disconnect
                                </button>
                            </div>
                        ) : (
                            <>
                                <div className="wallet-status-indicator disconnected" title="Wallet Disconnected"></div>
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="wallet-button connect"
                                    disabled={connecting}
                                >
                                    <WalletIcon />
                                    <span>{connecting ? "Connecting..." : "Connect Wallet"}</span>
                                </button>
                            </>
                        )}
                            </div>
                        </div>
                    </header>
                </div>
            </div>

            {showModal && (
                <div className="modal-overlay" onClick={() => setShowModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3 className="modal-title">Select Wallet</h3>
                        <div className="wallet-options">
                            {wallets.map((w) => (
                                <button
                                    key={w.adapter.name}
                                    onClick={() => handleConnect(w.adapter.name)}
                                    className="wallet-option"
                                >
                                    <span>{w.adapter.name}</span>
                                    {w.readyState === "Installed" && (
                                        <span className="wallet-status">Detected</span>
                                    )}
                                </button>
                            ))}
                            <button onClick={() => setShowModal(false)} className="cancel-button">
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

