// ============================================================================
// ZK PASSPORT - Stamp Metadata Hook (Public Only)
// ============================================================================
// This hook ONLY reads PUBLIC stamp metadata (definitions).
// 
// CRITICAL: It does NOT read which stamps users have.
// User stamp ownership is PRIVATE and only verified via proofs.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { getAllStamps, type PublicStamp } from "../utils/aleoAPI";

/**
 * Hook to fetch PUBLIC stamp metadata only.
 * 
 * SECURITY: This hook does NOT read user stamp ownership.
 * It only reads public stamp definitions (what stamps exist, their points).
 * 
 * User stamp ownership is private and verified via zero-knowledge proofs.
 */
export const useStamps = () => {
    const [stamps, setStamps] = useState<PublicStamp[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch PUBLIC stamp metadata only
    const fetchStamps = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const allStamps = await getAllStamps();
            setStamps(allStamps);

            // NOTE: We do NOT cache user stamp ownership
            // User stamps are private records - privacy preserved
        } catch (error) {
            setError(error instanceof Error ? error.message : String(error));
            setStamps([]);
        } finally {
            setLoading(false);
        }
    }, []);

    // Initial fetch
    useEffect(() => {
        fetchStamps();
    }, [fetchStamps]);

    return {
        stamps,  // PUBLIC metadata only - what stamps exist, their points
        userStamps: [] as number[],  // User stamp ownership is private; empty for UI compatibility
        loading,
        error,
        refresh: fetchStamps,
    };
};
