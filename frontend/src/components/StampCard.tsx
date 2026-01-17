import { Stamp } from "../types";
import "./StampCard.css";

// Re-export for backward compatibility
export type { Stamp };

interface StampCardProps {
    stamp: Stamp;
    onClick?: () => void;
}

export const StampCard = ({ stamp, onClick }: StampCardProps) => {
    const getCategoryIcon = (category: string) => {
        const cat = category.toLowerCase();
        if (cat.includes("social")) return "👥";
        if (cat.includes("identity")) return "🆔";
        if (cat.includes("reputation")) return "⭐";
        if (cat.includes("transaction")) return "💳";
        return "🏷️";
    };

    return (
        <div 
            className={`stamp-card glass glass-hover ${stamp.earned ? "earned" : ""} ${!stamp.is_active ? "inactive" : ""}`}
            onClick={onClick}
        >
            <div className="stamp-header">
                <div className="stamp-icon">{getCategoryIcon(stamp.category)}</div>
                <div className="stamp-info">
                    <h3 className="stamp-name">{stamp.name}</h3>
                    <span className="stamp-category">{stamp.category}</span>
                </div>
                {stamp.earned && (
                    <div className="stamp-badge earned-badge">✓</div>
                )}
            </div>
            <p className="stamp-description">{stamp.description}</p>
            <div className="stamp-footer">
                <span className="stamp-points">+{stamp.points} points</span>
                {stamp.earned_at && (
                    <span className="stamp-date">
                        Earned {new Date(stamp.earned_at * 1000).toLocaleDateString()}
                    </span>
                )}
            </div>
        </div>
    );
};

