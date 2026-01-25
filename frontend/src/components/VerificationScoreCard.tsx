import React from 'react';
import { Check, X } from 'lucide-react';
import { VERIFICATION_CONFIGS } from '../services/verificationService';

interface VerificationScoreCardProps {
  providerId: string;
  currentScore?: number;
  achievedCriteria?: Array<{ condition: string; points: number; description: string; achieved: boolean }>;
}

export const VerificationScoreCard: React.FC<VerificationScoreCardProps> = ({
  providerId,
  currentScore = 0,
  achievedCriteria = []
}) => {
  const config = VERIFICATION_CONFIGS[providerId];
  
  if (!config) return null;

  // Map achieved criteria for easy lookup
  const achievedMap = new Map(
    achievedCriteria.map(c => [c.condition, c.achieved])
  );

  return (
    <div className="border border-neutral-800 rounded-lg p-4 bg-neutral-950">
      <div className="flex items-center justify-between mb-4">
        <h4 className="font-bold text-white font-mono uppercase text-sm">
          {config.provider} - Scoring Criteria
        </h4>
        <div className="text-right">
          <div className="text-2xl font-bold text-white font-mono">
            {currentScore} / {config.maxScore}
          </div>
          <div className="text-xs text-neutral-400 font-mono">
            points
          </div>
        </div>
      </div>

      <div className="space-y-2">
        {config.criteria.map((criterion, index) => {
          const achieved = achievedMap.get(criterion.condition) || false;
          
          return (
            <div
              key={index}
              className={`flex items-start gap-3 p-2 rounded border ${
                achieved
                  ? 'bg-green-950/30 border-green-800/50'
                  : 'bg-neutral-900 border-neutral-800'
              }`}
            >
              <div className={`mt-0.5 flex-shrink-0 ${achieved ? 'text-green-500' : 'text-neutral-600'}`}>
                {achieved ? <Check size={16} /> : <X size={16} />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <span className={`font-mono text-sm ${achieved ? 'text-white' : 'text-neutral-400'}`}>
                    {criterion.condition}
                  </span>
                  <span className={`font-mono text-xs font-bold flex-shrink-0 ${
                    achieved ? 'text-green-400' : 'text-neutral-500'
                  }`}>
                    +{criterion.points}
                  </span>
                </div>
                <p className="text-xs text-neutral-500 mt-0.5 font-mono">
                  {criterion.description}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {currentScore > 0 && (
        <div className="mt-4 pt-4 border-t border-neutral-800">
          <div className="w-full bg-neutral-900 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-green-500 to-blue-500 h-full transition-all duration-500"
              style={{ width: `${(currentScore / config.maxScore) * 100}%` }}
            />
          </div>
          <p className="text-xs text-neutral-400 mt-2 font-mono text-center">
            {Math.round((currentScore / config.maxScore) * 100)}% verified
          </p>
        </div>
      )}
    </div>
  );
};

