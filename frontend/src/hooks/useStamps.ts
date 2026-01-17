// ============================================================================
// ZK PASSPORT - Stamp Metadata Hook (Public Only)
// ============================================================================
// This hook ONLY reads PUBLIC stamp metadata (definitions).
// 
// CRITICAL: It does NOT read which stamps users have.
// User stamp ownership is PRIVATE and only verified via proofs.
// ============================================================================

import { useState, useEffect, useCallback } from "react";
import { getAllStamps, getStampCount } from "../utils/aleoAPI";
import { Stamp } from "../components/StampCard";

export interface PublicStampMetadata {
    stamp_id: number;
    points: number;
    is_active: boolean;
    created_at: number;
}

/**
 * Hook to fetch PUBLIC stamp metadata only.
 * 
 * SECURITY: This hook does NOT read user stamp ownership.
 * It only reads public stamp definitions (what stamps exist, their points).
 * 
 * User stamp ownership is private and verified via zero-knowledge proofs.
 */
export const useStamps = () => {
    const [stamps, setStamps] = useState<Stamp[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch PUBLIC stamp metadata only
    const fetchStamps = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            console.log("[useStamps] Fetching PUBLIC stamp metadata only...");
            
            // Get stamp count
            const stampCount = await getStampCount();
            console.log(`[useStamps] Found ${stampCount} stamp types on blockchain`);

            if (stampCount === 0) {
                setStamps([]);
                setLoading(false);
                return;
            }

            // Fetch all stamp metadata (PUBLIC definitions only)
            const allStamps = await getAllStamps();
            
            // Convert to Stamp format (public metadata only)
            const convertedStamps: Stamp[] = allStamps.map(stamp => ({
                stamp_id: stamp.stamp_id,
                name: `Stamp ${stamp.stamp_id}`,  // Placeholder - name is private
                description: `${stamp.points} points`,  // Only public info
                category: "General",  // Placeholder - category is private
                points: stamp.points,
                is_active: stamp.is_active,
                created_at: stamp.created_at,
            }));

            setStamps(convertedStamps);
            console.log(`[useStamps] ✅ Loaded ${convertedStamps.length} PUBLIC stamp definitions`);

            // NOTE: We do NOT cache user stamp ownership
            // User stamps are private records - privacy preserved
        } catch (error) {
            console.error("[useStamps] ❌ Failed to fetch stamps:", error);
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
        loading,
        error,
        refresh: fetchStamps,
        // REMOVED: userStamps - user stamp ownership is private
        // REMOVED: fetchUserStamps - would violate privacy model
    };
};
