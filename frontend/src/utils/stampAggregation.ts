/**
 * Prepare stamps for aggregation
 * 
 * Since Leo doesn't support variable-size arrays in transitions,
 * aggregation is performed client-side before calling aggregate_stamps.
 * 
 * @param stamps - Array of stamp records (variable size)
 * @param maxStamps - Maximum stamps to aggregate (default: 5)
 * @returns Array of exactly maxStamps stamps (padded with zeros if needed)
 */
export function prepareStampsForAggregation(
    stamps: any[],  // StampRecord[] from wallet
    maxStamps: number = 5
): any[] {
    // Filter out zero/invalid stamps
    const validStamps = stamps.filter(stamp => 
        stamp && 
        stamp.stamp_id !== undefined && 
        stamp.stamp_id !== 0 &&
        stamp.owner !== undefined
    );

    // Sort by stamp_id for deterministic ordering
    validStamps.sort((a, b) => a.stamp_id - b.stamp_id);

    // Take first maxStamps stamps
    const selectedStamps = validStamps.slice(0, maxStamps);

    // Pad with zero stamps if needed
    while (selectedStamps.length < maxStamps) {
        selectedStamps.push({
            owner: selectedStamps[0]?.owner || "",
            stamp_id: 0,
            points: 0,
            issuer: "",
            issued_at: 0,
        });
    }

    return selectedStamps;
}

/**
 * Prepare stamps for prove_access transition
 * 
 * Selects stamps that maximize score and pads with zeros if needed.
 * 
 * @param stamps - Array of stamp records
 * @param maxStamps - Maximum stamps (default: 5)
 * @returns Array of exactly maxStamps stamps (optimized for score)
 */
export function prepareStampsForProof(
    stamps: any[],
    maxStamps: number = 5
): any[] {
    // Filter valid stamps
    const validStamps = stamps.filter(stamp => 
        stamp && 
        stamp.stamp_id !== undefined && 
        stamp.stamp_id !== 0 &&
        stamp.owner !== undefined
    );

    // Sort by points (descending) to maximize score
    validStamps.sort((a, b) => b.points - a.points);

    // Take top maxStamps stamps
    const selectedStamps = validStamps.slice(0, maxStamps);

    // Pad with zero stamps if needed
    while (selectedStamps.length < maxStamps) {
        selectedStamps.push({
            owner: selectedStamps[0]?.owner || "",
            stamp_id: 0,
            points: 0,
            issuer: "",
            issued_at: 0,
        });
    }

    return selectedStamps;
}

/**
 * Check if user has enough stamps to meet minimum score requirement
 * 
 * @param stamps - Array of stamp records
 * @param minScore - Minimum required score
 * @returns true if user can meet requirement
 */
export function canMeetScoreRequirement(
    stamps: any[],
    minScore: number
): boolean {
    const validStamps = stamps.filter(stamp => 
        stamp && 
        stamp.stamp_id !== undefined && 
        stamp.stamp_id !== 0
    );

    const stampsCount = validStamps.length;
    const totalPoints = validStamps.reduce((sum, stamp) => sum + (stamp.points || 0), 0);

    // Calculate score: min(100, stamps*5 + points/100)
    const stampScore = stampsCount * 5;
    const pointsScore = Math.floor(totalPoints / 100);
    const score = Math.min(100, stampScore + pointsScore);

    return score >= minScore;
}


