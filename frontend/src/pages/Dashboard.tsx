import { useState } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { usePassport } from "../hooks/usePassport";
import { useStamps } from "../hooks/useStamps";
import { StampCard } from "../components/StampCard";
import { SuccessModal } from "../components/SuccessModal";
import { WalletRequiredModal } from "../components/WalletRequiredModal";
import PageRoot from "../components/PageRoot";
import { Header } from "../components/Header";
import BodyWrapper from "../components/BodyWrapper";
import PageWidthGrid from "../components/PageWidthGrid";
import HeaderContentFooterGrid from "../components/HeaderContentFooterGrid";
import WelcomeFooter from "../components/WelcomeFooter";
import { ProofGenerationPanel } from "../components/ProofGenerationPanel";
import { PROGRAM_ID } from "../deployed_program";

export const Dashboard = () => {
    const { publicKey } = useWallet();
    const { hasPassport, createPassport, loading } = usePassport();
    
    // PRIVACY: useStamps only returns PUBLIC metadata - no user stamp ownership
    const { stamps, loading: stampsLoading } = useStamps();
    
    const [showSuccess, setShowSuccess] = useState(false);
    const [successTxId, setSuccessTxId] = useState<string | undefined>();
    const [showWalletModal, setShowWalletModal] = useState(false);

    // Stamps are now fetched via useStamps hook from blockchain API
    // No need for localStorage loading here

    const handleCreatePassport = async () => {
        if (!publicKey) {
            setShowWalletModal(true);
            return;
        }

        try {
            const txId = await createPassport();
            if (txId) {
                setSuccessTxId(txId);
                setShowSuccess(true);
            }
        } catch (error) {
            alert("Failed to create passport: " + (error instanceof Error ? error.message : String(error)));
        }
    };

    const handleConnectWallet = () => {
        setShowWalletModal(true);
    };

    if (!publicKey) {
        return (
            <>
                <PageRoot className="text-color-1">
                    <HeaderContentFooterGrid>
                        <Header programId={PROGRAM_ID} />
                        <BodyWrapper className="mt-4 md:mt-0 pt-12 md:pt-16 flex items-center justify-center min-h-[60vh]">
                            <div className="text-center max-w-2xl">
                                <h1 className="text-4xl md:text-6xl font-bold font-alt mb-4">
                                    Welcome to <span className="text-foreground-2">ZkPersona</span>
                                </h1>
                                <p className="text-lg text-color-3 mb-6">
                                    A decentralized identity verification system with full encryption through Aleo zero-knowledge proofs.
                                </p>
                                <p className="text-color-2 mb-6">
                                    Connect your Leo Wallet to create your passport and start earning stamps that prove your humanity and identity.
                                </p>
                                <button
                                    onClick={handleConnectWallet}
                                    className="px-6 py-3 bg-white text-black font-mono uppercase text-sm hover:bg-neutral-100 transition-colors"
                                >
                                    Connect Wallet
                                </button>
                            </div>
                        </BodyWrapper>
                        <WelcomeFooter />
                    </HeaderContentFooterGrid>
                </PageRoot>
                <WalletRequiredModal
                    isOpen={showWalletModal}
                    onClose={() => setShowWalletModal(false)}
                    onConnect={handleConnectWallet}
                    action="access the dashboard"
                />
            </>
        );
    }

    // No passport creation required - show dashboard immediately

    // PRIVACY: Score is private - we don't display it
    // PRIVACY: User stamp ownership is private - we don't display which stamps user has
    // Only public stamp metadata is shown
    const availableStamps = stamps.filter(s => s.is_active);

    return (
        <PageRoot className="text-color-1">
            <HeaderContentFooterGrid>
                <Header programId={PROGRAM_ID} showTopNav={true} />
                <BodyWrapper className="mt-4 md:mt-0 pt-12 md:pt-16">
                    <PageWidthGrid>
                        {/* PRIVACY: Score is private - not displayed */}
                        {/* PRIVACY: User stamp ownership is private - not displayed */}
                        
                        {/* Proof Generation Panel - Generate ZK proofs for dApp access */}
                        <div className="col-span-full mb-8">
                            <ProofGenerationPanel />
                        </div>

                        {/* Available Stamps - Public metadata only */}
                        <span id="add-stamps" className="px-4 md:px-0 col-span-full font-heading text-4xl text-gray-800 mt-12">
                            Available Stamps
                        </span>
                        <div className="col-span-full">
                            {stampsLoading ? (
                                <div className="text-center py-12 text-color-3">
                                    <p>Loading stamp metadata from blockchain...</p>
                                </div>
                            ) : (
                                <>
                                    {availableStamps.length > 0 && (
                                        <div>
                                            <p className="text-color-3 mb-4">
                                                These stamps are available. Your stamp ownership is private and verified via zero-knowledge proofs.
                                            </p>
                                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                                {availableStamps.map(stamp => (
                                                    <StampCard 
                                                        key={stamp.stamp_id} 
                                                        stamp={stamp}
                                                        onClick={() => window.location.href = `/stamps#${stamp.stamp_id}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                    {stamps.length === 0 && !stampsLoading && (
                                        <div className="text-center py-12 text-color-3">
                                            <p>No stamps available yet. Check back soon!</p>
                                        </div>
                                    )}
                                </>
                            )}
                        </div>
                    </PageWidthGrid>
                </BodyWrapper>
                <WelcomeFooter displayPrivacyPolicy={false} />
            </HeaderContentFooterGrid>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                    setSuccessTxId(undefined);
                }}
                message="Passport created successfully!"
                txId={successTxId}
            />
        </PageRoot>
    );
};

