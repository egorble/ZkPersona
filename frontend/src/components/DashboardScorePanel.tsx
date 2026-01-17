import React, { useEffect, useState } from "react";

const PanelDiv = ({ className, children }: { className: string; children: React.ReactNode }) => {
  return (
    <div
      className={`flex flex-col items-center justify-center p-4 w-full rounded-3xl bg-white text-black ${className}`}
    >
      {children}
    </div>
  );
};

const LoadingScoreImage = () => <img src="/assets/scoreLogoLoading.svg" alt="loading" className="h-20 w-auto" />;

const Ellipsis = () => {
  return (
    <div className="flex">
      .<div className="animate-visible-at-one-third">.</div>
      <div className="animate-visible-at-two-thirds">.</div>
    </div>
  );
};

interface DashboardScorePanelProps {
  score?: number;
  loading?: boolean;
  threshold?: number;
  className?: string;
}

export const DashboardScorePanel = ({ 
  score = 0, 
  loading = false, 
  threshold = 20,
  className 
}: DashboardScorePanelProps) => {
  const [displayScore, setDisplayScore] = useState(0);

  useEffect(() => {
    if (loading) {
      setDisplayScore(0);
    } else {
      setDisplayScore(score);
    }
  }, [score, loading]);

  return (
    <PanelDiv className={`font-heading ${className || ""}`}>
      <div className="flex items-center w-full">
        <span className="grow font-medium">Unique Humanity Score</span>
        <div className="px-0 self-start" title={`Your Unique Humanity Score measures your uniqueness. The current passing threshold is ${threshold}. Scores may vary across different apps.`}>
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M8 14A6 6 0 1 0 8 2a6 6 0 0 0 0 12z" fill="#6B7280"/>
            <path d="M8 11V8M8 6h.01" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </div>
      </div>
      <div className="flex grow items-center align-middle text-xl mt-6 mb-10">
        <div className="m-4">
          {loading ? (
            <LoadingScoreImage />
          ) : (
            <img src="/assets/scoreLogoSuccess.svg" alt="Above threshold Passport Logo" className="h-20 w-auto" />
          )}
        </div>
        {loading ? (
          <div className="leading-none">
            Updating
            <div className="flex">
              score
              <Ellipsis />
            </div>
          </div>
        ) : (
          <span className="text-5xl font-alt font-semibold">{+displayScore.toFixed(2)}</span>
        )}
      </div>
    </PanelDiv>
  );
};

interface DashboardScoreExplanationPanelProps {
  score?: number;
  threshold?: number;
  className?: string;
}

export const DashboardScoreExplanationPanel = ({ 
  score = 0, 
  threshold = 20,
  className 
}: DashboardScoreExplanationPanelProps) => {
  const aboveThreshold = score >= threshold;

  return (
    <PanelDiv className={`${className || ""}`}>
      <div className="w-full h-full p-2 flex flex-col">
        <div className="flex flex-col h-full w-full">
          <div className="flex flex-col md:flex-row items-start justify-between flex-wrap">
            <div className="flex justify-start">
              <h2 className={`text-2xl text-black font-semibold pr-4 text-nowrap`}>
                {aboveThreshold 
                  ? "Congrats! You have a passing Unique Humanity Score!" 
                  : "Let's increase that Unique Humanity Score"}
              </h2>
            </div>
          </div>
          <p className="py-2 self-center md:self-start">
            {aboveThreshold
              ? "Next up, mint your Passport onchain!"
              : "You will need at least 20 points to verify your humanity"}
          </p>
        </div>
      </div>
    </PanelDiv>
  );
};

