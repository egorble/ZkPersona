import { useMemo, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { WalletProvider, useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { LeoWalletAdapter } from "@demox-labs/aleo-wallet-adapter-leo";
import { PuzzleWalletAdapter } from "aleo-adapters";
import {
    DecryptPermission,
    WalletAdapterNetwork,
} from "@demox-labs/aleo-wallet-adapter-base";
import { PROGRAM_ID } from "./deployed_program";
import { Header } from "./components/Header";
import { Dashboard } from "./pages/Dashboard";
import { Stamps } from "./pages/Stamps";
import { Profile } from "./pages/Profile";
import { Admin } from "./pages/Admin";
import { Toast } from "./components/Toast";
import { useWalletErrors } from "./hooks/useWalletErrors";
import { useWalletEvents } from "./hooks/useWalletEvents";
import "./App.css";

const AppContent = () => {
    const { publicKey, connect, wallet } = useWallet();
    const { toast, setToast } = useWalletErrors();
    useWalletEvents();

    // Auto-reconnect on mount
    useEffect(() => {
        const wasConnected = localStorage.getItem("wallet_connected");
        const savedAddress = localStorage.getItem("wallet_address");
        const savedAdapter = localStorage.getItem("wallet_adapter");
        
        if (wasConnected === "true" && savedAddress && !publicKey && wallet) {
            const attemptReconnect = async () => {
                try {
                    await new Promise(resolve => setTimeout(resolve, 500));
                    if (savedAdapter && wallet) {
                        await connect();
                    } else {
                        await connect();
                    }
                    console.log("✅ Auto-reconnected wallet:", savedAddress);
                } catch (e) {
                    console.warn("⚠️ Auto-reconnect failed:", e);
                }
            };
            attemptReconnect();
        }
    }, [connect, publicKey, wallet]);

    return (
        <Router>
            <div className="App">
                <main className="main-content">
                    <Routes>
                        <Route path="/" element={<Dashboard />} />
                        <Route path="/stamps" element={<Stamps />} />
                        <Route path="/profile" element={<Profile />} />
                        <Route path="/admin" element={<Admin />} />
                    </Routes>
                </main>
                {toast && (
                    <Toast
                        message={toast.message}
                        type={toast.type}
                        onClose={() => setToast(null)}
                    />
                )}
            </div>
        </Router>
    );
};

function App() {
    const network = WalletAdapterNetwork.TestnetBeta;

    const wallets = useMemo(
        () => [
            new LeoWalletAdapter({
                appName: "ZkPersona",
            }),
            new PuzzleWalletAdapter({
                appName: "ZkPersona",
                programIdPermissions: {
                    [WalletAdapterNetwork.TestnetBeta]: [PROGRAM_ID],
                    [WalletAdapterNetwork.MainnetBeta]: [PROGRAM_ID]
                }
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
            <AppContent />
        </WalletProvider>
    );
}

export default App;

