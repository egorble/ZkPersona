import { useState, useEffect } from "react";
import { useWallet } from "@demox-labs/aleo-wallet-adapter-react";
import { WalletAdapterNetwork, Transaction } from "@demox-labs/aleo-wallet-adapter-base";
import { PROGRAM_ID } from "../deployed_program";
import { stringToField, hashString } from "../utils/aleo";
import { logger } from "../utils/logger";
import { StampCard, Stamp } from "../components/StampCard";
import { useStamps } from "../hooks/useStamps";
import PageRoot from "../components/PageRoot";
import { Header } from "../components/Header";
import BodyWrapper from "../components/BodyWrapper";
import PageWidthGrid from "../components/PageWidthGrid";
import HeaderContentFooterGrid from "../components/HeaderContentFooterGrid";
import WelcomeFooter from "../components/WelcomeFooter";
import "./Stamps.css";

type WalletAdapterExtras = {
    requestTransaction?: (tx: Transaction) => Promise<string>;
};

export const Stamps = () => {
    const { publicKey, wallet } = useWallet();
    const adapter = wallet?.adapter as unknown as WalletAdapterExtras | undefined;
    const network = WalletAdapterNetwork.TestnetBeta;
    
    // Use API-based hook instead of localStorage
    const { stamps, userStamps, loading: stampsLoading } = useStamps();
    
    const [selectedStamp, setSelectedStamp] = useState<Stamp | null>(null);
    const [showRequestModal, setShowRequestModal] = useState(false);
    const [verificationProof, setVerificationProof] = useState("");
    const [isProcessing, setIsProcessing] = useState(false);
    const [status, setStatus] = useState("");

    // Stamps are now fetched via useStamps hook from blockchain API
    // No need for localStorage loading here

    const handleRequestVerification = async () => {
        if (!publicKey || !adapter?.requestTransaction || !selectedStamp) {
            alert("Please connect your wallet and select a stamp");
            return;
        }

        if (!verificationProof.trim()) {
            alert("Please provide verification proof");
            return;
        }

        setIsProcessing(true);
        setStatus("Preparing verification request...");

        try {
            logger.user.requestVerification(selectedStamp.stamp_id.toString());

            const proofHash = await hashString(verificationProof);
            
            const transaction = Transaction.createTransaction(
                publicKey,
                network,
                PROGRAM_ID,
                "request_stamp_verification",
                [
                    `${selectedStamp.stamp_id}u32`,
                    proofHash,
                ],
                50000,
                false
            );

            setStatus("Please confirm the transaction in your wallet...");
            const txId = await adapter.requestTransaction(transaction);

            if (txId) {
                logger.transaction.confirmed(txId);
                
                // Save verification request to localStorage for admin to see
                const requestId = Date.now();
                const request = {
                    request_id: requestId,
                    user: publicKey,
                    stamp_id: selectedStamp.stamp_id,
                    proof: verificationProof,
                    requested_at: Math.floor(Date.now() / 1000),
                    status: 0, // pending
                };
                
                const existing = JSON.parse(localStorage.getItem("verification_requests") || "[]");
                existing.push(request);
                localStorage.setItem("verification_requests", JSON.stringify(existing));
                
                // Trigger event for admin panel to update
                window.dispatchEvent(new CustomEvent("verification-request"));
                
                setStatus("Verification request submitted successfully! Admin will review it shortly.");
                setShowRequestModal(false);
                setVerificationProof("");
                // Note: Admin will need to approve and grant the stamp
            }
        } catch (error) {
            logger.transaction.failed(error instanceof Error ? error.message : String(error));
            setStatus("Error: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsProcessing(false);
        }
    };

    const handleStampClick = (stamp: Stamp) => {
        if (!userStamps.includes(stamp.stamp_id) && stamp.is_active) {
            setSelectedStamp(stamp);
            setShowRequestModal(true);
        }
    };

    const earnedStamps = stamps.filter(s => userStamps.includes(s.stamp_id));
    const availableStamps = stamps.filter(s => s.is_active && !userStamps.includes(s.stamp_id));
    const allStamps = [...earnedStamps, ...availableStamps];

    return (
        <PageRoot className="text-color-1">
            <HeaderContentFooterGrid>
                <Header programId={PROGRAM_ID} />
                <BodyWrapper className="mt-4 md:mt-0 pt-12 md:pt-16">
                    <PageWidthGrid>
                        <div className="col-span-full">
                            <h1 className="text-4xl font-heading text-gray-800 mb-2">Stamps</h1>
                            <p className="text-color-3 mb-8">
                                Complete tasks to earn stamps and increase your humanity score
                            </p>
                        </div>
                        
                        {stampsLoading ? (
                            <div className="col-span-full text-center py-12">
                                <p className="text-color-3">Loading stamps from blockchain...</p>
                            </div>
                        ) : (
                            <>

                                {earnedStamps.length > 0 && (
                                    <div className="col-span-full mb-8">
                                        <h2 className="text-2xl font-heading mb-4">Earned Stamps ({earnedStamps.length})</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {earnedStamps.map(stamp => (
                                                <StampCard key={stamp.stamp_id} stamp={stamp} />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {availableStamps.length > 0 && (
                                    <div className="col-span-full mb-8">
                                        <h2 className="text-2xl font-heading mb-4">Available Stamps ({availableStamps.length})</h2>
                                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                            {availableStamps.map(stamp => (
                                                <StampCard 
                                                    key={stamp.stamp_id} 
                                                    stamp={stamp}
                                                    onClick={() => handleStampClick(stamp)}
                                                />
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {allStamps.length === 0 && (
                                    <div className="col-span-full text-center py-12 text-color-3">
                                        <p>No stamps available yet. Admins can create stamps in the Admin Panel.</p>
                                    </div>
                                )}
                            </>
                        )}
                    </PageWidthGrid>
                </BodyWrapper>
                <WelcomeFooter />
            </HeaderContentFooterGrid>

            {showRequestModal && selectedStamp && (
                <div className="modal-overlay" onClick={() => !isProcessing && setShowRequestModal(false)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h3 className="modal-title">Request Verification: {selectedStamp.name}</h3>
                            <button
                                className="close-button"
                                onClick={() => setShowRequestModal(false)}
                                disabled={isProcessing}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="form-group">
                                <label>Verification Proof</label>
                                <textarea
                                    placeholder="Provide proof of task completion (e.g., Discord username, Twitter handle, transaction hash, etc.)"
                                    value={verificationProof}
                                    onChange={(e) => setVerificationProof(e.target.value)}
                                    disabled={isProcessing}
                                    rows={5}
                                />
                            </div>
                            {status && (
                                <div className={`status-message ${status.includes("Error") ? "error" : ""}`}>
                                    {status}
                                </div>
                            )}
                            <button
                                className="btn-primary full-width"
                                onClick={handleRequestVerification}
                                disabled={isProcessing || !verificationProof.trim()}
                            >
                                {isProcessing ? "Submitting..." : "Submit Verification Request"}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </PageRoot>
    );
};

