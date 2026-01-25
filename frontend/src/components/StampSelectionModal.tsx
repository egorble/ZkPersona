import React, { useState } from 'react';
import { X, Check, Globe, Twitter, Github, Bitcoin, ScanFace, BrainCircuit, Loader2 } from 'lucide-react';

export interface StampOption {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  provider: string;
  scoreWeight: number;
}

interface StampSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (selectedStamps: string[]) => void;
  availableStamps: StampOption[];
}

export const StampSelectionModal: React.FC<StampSelectionModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  availableStamps
}) => {
  const [selectedStamps, setSelectedStamps] = useState<Set<string>>(new Set());
  const [isConfirming, setIsConfirming] = useState(false);

  if (!isOpen) return null;

  const toggleStamp = (stampId: string) => {
    const newSelected = new Set(selectedStamps);
    if (newSelected.has(stampId)) {
      newSelected.delete(stampId);
    } else {
      newSelected.add(stampId);
    }
    setSelectedStamps(newSelected);
  };

  const handleConfirm = async () => {
    if (selectedStamps.size > 0) {
      setIsConfirming(true);
      try {
        await onConfirm(Array.from(selectedStamps));
        setSelectedStamps(new Set());
      } finally {
        setIsConfirming(false);
      }
    }
  };

  const totalScore = Array.from(selectedStamps).reduce((sum, stampId) => {
    const stamp = availableStamps.find(s => s.id === stampId);
    return sum + (stamp?.scoreWeight || 0);
  }, 0);

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md transition-opacity duration-300"
      style={{ animation: 'fadeIn 0.3s ease-in' }}
    >
      <div 
        className="bg-neutral-900 border border-neutral-800 rounded-lg max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden flex flex-col shadow-2xl transition-all duration-300"
        style={{ animation: 'zoomIn 0.3s ease-out' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-neutral-800">
          <div>
            <h2 className="text-2xl font-bold font-mono uppercase text-white">Select Verification Methods</h2>
            <p className="text-neutral-400 text-sm mt-1 font-mono">
              Choose the verification methods you want to connect to your passport
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-neutral-400 hover:text-white transition-colors p-2 hover:bg-neutral-800 rounded"
          >
            <X size={24} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {availableStamps.map((stamp) => {
              const isSelected = selectedStamps.has(stamp.id);
              return (
                <div
                  key={stamp.id}
                  onClick={() => toggleStamp(stamp.id)}
                  className={`
                    p-4 border rounded-lg cursor-pointer transition-all
                    ${isSelected 
                      ? 'border-white bg-white/5' 
                      : 'border-neutral-800 hover:border-neutral-700 bg-neutral-950'
                    }
                  `}
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className={`
                        p-2 rounded border
                        ${isSelected 
                          ? 'bg-white text-black border-white' 
                          : 'bg-neutral-900 text-neutral-400 border-neutral-800'
                        }
                      `}>
                        {stamp.icon}
                      </div>
                      <div>
                        <h3 className="font-mono font-bold text-white text-sm uppercase">
                          {stamp.title}
                        </h3>
                        <p className="text-xs text-neutral-400 mt-1">
                          +{stamp.scoreWeight} points
                        </p>
                      </div>
                    </div>
                    {isSelected && (
                      <div className="bg-white text-black rounded-full p-1">
                        <Check size={16} />
                      </div>
                    )}
                  </div>
                  <p className="text-sm text-neutral-400 font-mono">
                    {stamp.description}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-neutral-800 bg-neutral-950">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="text-sm text-neutral-400 font-mono">
                Selected: {selectedStamps.size} / {availableStamps.length}
              </p>
              <p className="text-lg font-bold text-white mt-1 font-mono">
                Total Score: {totalScore} points
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-neutral-800 text-neutral-400 hover:text-white hover:border-neutral-700 transition-colors font-mono uppercase text-sm"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirm}
              disabled={selectedStamps.size === 0 || isConfirming}
              className={`
                flex-1 px-6 py-3 font-mono uppercase text-sm transition-all flex items-center justify-center gap-2
                ${selectedStamps.size > 0 && !isConfirming
                  ? 'bg-white text-black hover:bg-neutral-100'
                  : 'bg-neutral-800 text-neutral-600 cursor-not-allowed'
                }
              `}
            >
              {isConfirming ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  Creating Passport...
                </>
              ) : (
                'Continue to Create Passport'
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

