// ============================================================================
// PROOF GENERATION PANEL - UI Component for Generating ZK Proofs
// ============================================================================
// This component allows users to generate zero-knowledge proofs for dApp access.
//
// PRIVACY: Only generates proofs - never exposes private passport/stamp data.
// ============================================================================

import { useState } from "react";
import { usePassportProof } from "../hooks/usePassportProof";
import { SuccessModal } from "./SuccessModal";

export const ProofGenerationPanel = () => {
    const { generateProof, generating, error } = usePassportProof();
    const [appId, setAppId] = useState("");
    const [minScore, setMinScore] = useState(20);
    const [showSuccess, setShowSuccess] = useState(false);
    const [proofResult, setProofResult] = useState<{
        proof: string;
        nullifier: string;
        valid: boolean;
        transactionId?: string;
    } | null>(null);

    const handleGenerateProof = async () => {
        if (!appId.trim()) {
            alert("Please enter an application ID");
            return;
        }

        try {
            const result = await generateProof({
                program: "passportapp.aleo",
                function: "prove_access",
                appId: appId.trim(),
                minScore: minScore,
                onChain: true,
            });

            if (result) {
                setProofResult(result);
                setShowSuccess(true);
            }
        } catch (err) {
            console.error("Failed to generate proof:", err);
            alert("Failed to generate proof: " + (err instanceof Error ? err.message : String(err)));
        }
    };

    return (
        <div className="bg-white rounded-3xl p-6 shadow-lg">
            <h2 className="text-2xl font-heading mb-4">Generate Access Proof</h2>
            <p className="text-color-3 mb-6">
                Generate a zero-knowledge proof to prove you meet the score requirement for a dApp.
                Your passport data stays private - only the proof is shared.
            </p>

            <div className="space-y-4">
                <div>
                    <label className="block text-sm font-medium mb-2">
                        Application ID <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        value={appId}
                        onChange={(e) => setAppId(e.target.value)}
                        placeholder="e.g., my-dapp"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground-2"
                        disabled={generating}
                    />
                    <p className="text-xs text-color-3 mt-1">
                        Unique identifier for the dApp (prevents cross-app linking)
                    </p>
                </div>

                <div>
                    <label className="block text-sm font-medium mb-2">
                        Minimum Score Required <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        value={minScore}
                        onChange={(e) => setMinScore(parseInt(e.target.value) || 0)}
                        min="0"
                        max="100"
                        className="w-full px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-foreground-2"
                        disabled={generating}
                    />
                    <p className="text-xs text-color-3 mt-1">
                        Minimum score required by the dApp (0-100)
                    </p>
                </div>

                {error && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">
                        {error}
                    </div>
                )}

                <button
                    onClick={handleGenerateProof}
                    disabled={generating || !appId.trim()}
                    className="w-full px-6 py-3 bg-foreground-2 text-white rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {generating ? "Generating Proof..." : "Generate Proof"}
                </button>

                {proofResult && (
                    <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                        <h3 className="font-medium text-green-800 mb-2">Proof Generated Successfully!</h3>
                        <div className="space-y-2 text-sm">
                            <div>
                                <span className="font-medium">Valid:</span>{" "}
                                <span className={proofResult.valid ? "text-green-600" : "text-red-600"}>
                                    {proofResult.valid ? "Yes" : "No"}
                                </span>
                            </div>
                            <div>
                                <span className="font-medium">Nullifier:</span>{" "}
                                <code className="text-xs bg-white px-2 py-1 rounded break-all">
                                    {proofResult.nullifier || "N/A"}
                                </code>
                            </div>
                            {proofResult.transactionId && (
                                <div>
                                    <span className="font-medium">Transaction ID:</span>{" "}
                                    <code className="text-xs bg-white px-2 py-1 rounded break-all">
                                        {proofResult.transactionId}
                                    </code>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            <SuccessModal
                isOpen={showSuccess}
                onClose={() => {
                    setShowSuccess(false);
                }}
                message="Proof generated successfully!"
                txId={proofResult?.transactionId}
            />
        </div>
    );
};

