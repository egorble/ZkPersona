// ============================================================================
// ZK PASSPORT - Proof Request Schema
// ============================================================================
// This defines the contract between dApps and wallets for proof requests.
// 
// IMPORTANT: This is NOT an API call.
// It is a proof request specification that wallets understand.
// 
// Privacy: dApps specify requirements, wallets generate proofs locally.
// ============================================================================

/**
 * Proof Request Schema
 * 
 * dApps define what they need, wallets generate proofs that satisfy requirements.
 * No private data is exposed - only mathematical proofs.
 */
export interface PassportProofRequest {
    /**
     * Program ID (always "passportapp.aleo" for this system)
     */
    program: "passportapp.aleo";
    
    /**
     * Function to call (always "prove_access" for passport verification)
     */
    function: "prove_access";
    
    /**
     * Unique application identifier
     * 
     * CRITICAL: Each dApp MUST use a unique app_id to prevent:
     * - Cross-app linking (same nullifier per app)
     * - Replay attacks (nullifier is per app_id)
     * 
     * Format: Should be a field value (can be derived from app domain/name)
     */
    appId: string;
    
    /**
     * Minimum score requirement
     * 
     * dApps can require a minimum humanity score.
     * Proof will only be valid if user's score >= minScore.
     * 
     * Note: Actual score is NEVER revealed - only boolean validity.
     */
    minScore: number;
    
    /**
     * Optional: Whether to execute on-chain
     * 
     * If true: Proof is executed on-chain, nullifier is recorded
     * If false: Proof is generated off-chain (for verification only)
     * 
     * Default: true (prevents replay attacks)
     */
    onChain?: boolean;
}

/**
 * Proof Response Schema
 * 
 * What wallets return after generating proofs.
 */
export interface PassportProofResponse {
    /**
     * Zero-knowledge proof
     * 
     * This proves:
     * - User has valid passport
     * - Score meets requirement
     * - Stamps are valid
     * 
     * WITHOUT revealing:
     * - Identity (address)
     * - Actual score
     * - Stamp composition
     */
    proof: string;
    
    /**
     * Nullifier (public)
     * 
     * Derived from (passport.nonce + app_id)
     * Prevents double-use of passport per app.
     * 
     * dApps check this against nullifier mapping to ensure uniqueness.
     */
    nullifier: string;
    
    /**
     * Proof validity
     * 
     * true if proof is valid and satisfies requirements
     * false otherwise
     */
    valid: boolean;
    
    /**
     * Transaction ID (if executed on-chain)
     */
    transactionId?: string;
}

/**
 * Verifier Input Schema
 * 
 * What dApps receive and verify.
 */
export interface PassportVerificationInput {
    proof: string;
    nullifier: string;
    appId: string;
    minScore: number;
}

