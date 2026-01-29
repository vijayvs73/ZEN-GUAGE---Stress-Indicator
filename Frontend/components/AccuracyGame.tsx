
import React, { useState, useEffect, useCallback } from 'react';
import { Target, MousePointer2 } from 'lucide-react';

interface Props {
  onComplete: (accuracy: number) => void;
}

const TOTAL_TARGETS = 10;

const AccuracyGame: React.FC<Props> = ({ onComplete }) => {
  const [stage, setStage] = useState<'idle' | 'playing' | 'result'>('idle');
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [hits, setHits] = useState(0);
  const [totalClicks, setTotalClicks] = useState(0);
  const [targetsSpawned, setTargetsSpawned] = useState(0);

  const spawnTarget = useCallback(() => {
    const x = Math.floor(Math.random() * 80) + 10; // 10% to 90%
    const y = Math.floor(Math.random() * 80) + 10;
    setTargetPos({ x, y });
    setTargetsSpawned(prev => prev + 1);
  }, []);

  const startTest = () => {
    setStage('playing');
    setHits(0);
    setTotalClicks(0);
    setTargetsSpawned(0);
    spawnTarget();
  };

  const handleContainerClick = (e: React.MouseEvent) => {
    if (stage !== 'playing') return;
    setTotalClicks(prev => prev + 1);
  };

  const handleTargetClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (stage !== 'playing') return;
    
    setHits(prev => prev + 1);
    setTotalClicks(prev => prev + 1);

    if (targetsSpawned >= TOTAL_TARGETS) {
      setStage('result');
    } else {
      spawnTarget();
    }
  };

  const accuracy = totalClicks > 0 ? Math.round((hits / totalClicks) * 100) : 0;

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Precision Test</h2>
        <p className="text-sm text-slate-500">Click the targets as accurately as possible.</p>
      </div>

      <div 
        onClick={handleContainerClick}
        className="relative w-full aspect-square bg-slate-50 border-2 border-slate-100 rounded-2xl overflow-hidden cursor-crosshair"
      >
        {stage === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <button 
              onClick={(e) => { e.stopPropagation(); startTest(); }}
              className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold shadow-sm hover:bg-indigo-700 transition-all"
            >
              Start Accuracy Test
            </button>
          </div>
        )}

        {stage === 'playing' && (
          <>
            <div className="absolute top-4 left-4 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
              Progress: {targetsSpawned} / {TOTAL_TARGETS}
            </div>
            <div 
              onClick={handleTargetClick}
              className="absolute w-12 h-12 -ml-6 -mt-6 flex items-center justify-center bg-indigo-600 rounded-full shadow-lg shadow-indigo-200 transition-all duration-75 active:scale-90"
              style={{ left: `${targetPos.x}%`, top: `${targetPos.y}%` }}
            >
              <Target size={24} className="text-white" />
            </div>
          </>
        )}

        {stage === 'result' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="text-center space-y-4">
              <div className="space-y-1">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Final Accuracy</p>
                <p className="text-6xl font-black text-slate-900 tracking-tighter">{accuracy}%</p>
              </div>
              <button 
                onClick={() => onComplete(accuracy)}
                className="bg-indigo-600 text-white px-8 py-2 rounded-lg font-bold text-sm"
              >
                Analyze All Results
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 w-full">
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Hits</p>
          <p className="text-xl font-bold text-slate-900">{hits}</p>
        </div>
        <div className="p-4 bg-slate-50 rounded-xl border border-slate-100 text-center">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Misses</p>
          <p className="text-xl font-bold text-slate-900">{totalClicks - hits}</p>
        </div>
      </div>
    </div>
  );
};

export default AccuracyGame;
