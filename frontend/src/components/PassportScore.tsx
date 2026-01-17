import "./PassportScore.css";

interface PassportScoreProps {
    humanityScore: number;
    totalStamps: number;
    totalPoints: number;
}

export const PassportScore = ({ humanityScore, totalStamps, totalPoints }: PassportScoreProps) => {
    const getScoreColor = (score: number) => {
        if (score >= 80) return "#10b981";
        if (score >= 50) return "#f59e0b";
        return "#ef4444";
    };

    const getScoreLabel = (score: number) => {
        if (score >= 80) return "High";
        if (score >= 50) return "Medium";
        return "Low";
    };

    return (
        <div className="passport-score glass">
            <div className="score-header">
                <h2 className="score-title">Humanity Score</h2>
                <div className="score-badge" style={{ backgroundColor: getScoreColor(humanityScore) + "20", color: getScoreColor(humanityScore) }}>
                    {getScoreLabel(humanityScore)}
                </div>
            </div>
            
            <div className="score-display">
                <div className="score-gauge">
                    <svg className="score-circle" viewBox="0 0 120 120">
                        <circle
                            className="score-circle-bg"
                            cx="60"
                            cy="60"
                            r="50"
                            fill="none"
                            stroke="rgba(255, 255, 255, 0.1)"
                            strokeWidth="8"
                        />
                        <circle
                            className="score-circle-fill"
                            cx="60"
                            cy="60"
                            r="50"
                            fill="none"
                            stroke={getScoreColor(humanityScore)}
                            strokeWidth="8"
                            strokeDasharray={`${(humanityScore / 100) * 314} 314`}
                            strokeDashoffset="78.5"
                            transform="rotate(-90 60 60)"
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="score-value">
                        <span className="score-number">{humanityScore}</span>
                        <span className="score-max">/ 100</span>
                    </div>
                </div>
            </div>

            <div className="score-stats">
                <div className="stat-item">
                    <span className="stat-label">Total Stamps</span>
                    <span className="stat-value">{totalStamps}</span>
                </div>
                <div className="stat-divider"></div>
                <div className="stat-item">
                    <span className="stat-label">Total Points</span>
                    <span className="stat-value">{totalPoints.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
};

