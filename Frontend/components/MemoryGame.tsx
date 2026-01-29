
import React, { useState, useEffect } from 'react';
import { Brain, Sparkles } from 'lucide-react';

interface Props {
  onComplete: (score: number) => void;
}

const GRID_SIZE = 3;

const MemoryGame: React.FC<Props> = ({ onComplete }) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [stage, setStage] = useState<'idle' | 'showing' | 'playing' | 'result'>('idle');
  const [level, setLevel] = useState(1);

  const startRound = () => {
    const len = 3 + Math.floor(level / 2);
    const newPattern = [];
    for (let i = 0; i < len; i++) {
      newPattern.push(Math.floor(Math.random() * (GRID_SIZE * GRID_SIZE)));
    }
    setPattern(newPattern);
    setUserSequence([]);
    setStage('showing');
  };

  useEffect(() => {
    if (stage === 'showing') {
      const timer = setTimeout(() => {
        setStage('playing');
      }, 1500 + level * 300);
      return () => clearTimeout(timer);
    }
  }, [stage, level]);

  const handleGridClick = (index: number) => {
    if (stage !== 'playing') return;
    const nextUserSeq = [...userSequence, index];
    setUserSequence(nextUserSeq);
    const isCorrectSoFar = nextUserSeq.every((val, i) => val === pattern[i]);
    if (!isCorrectSoFar) {
      setStage('result');
    } else if (nextUserSeq.length === pattern.length) {
      if (level < 2) {
        setLevel(level + 1);
        setTimeout(startRound, 600);
      } else {
        setStage('result');
      }
    }
  };

  const calculateScore = () => {
    const correctCount = userSequence.filter((v, i) => v === pattern[i]).length;
    return Math.round((correctCount / pattern.length) * 100);
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Sequence Recall</h2>
        <p className="text-sm text-slate-500">Memorize and repeat the visual sequence.</p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {Array.from({ length: 9 }).map((_, i) => {
          const isHighlighted = stage === 'showing' && pattern.includes(i);
          const isSelected = userSequence.includes(i);
          return (
            <div
              key={i}
              onClick={() => handleGridClick(i)}
              className={`w-16 h-16 sm:w-20 sm:h-20 rounded-xl transition-all duration-200 cursor-pointer ${
                isHighlighted ? 'bg-indigo-600 scale-105 shadow-md' :
                isSelected ? 'bg-indigo-100 border-2 border-indigo-200' :
                'bg-slate-50 border border-slate-200 hover:bg-slate-100'
              }`}
            />
          );
        })}
      </div>

      <div className="h-14 flex items-center">
        {stage === 'idle' && (
          <button 
            onClick={startRound}
            className="bg-indigo-600 text-white px-8 py-3 rounded-xl font-bold text-sm shadow-sm"
          >
            Start Memory Test
          </button>
        )}
        {stage === 'showing' && (
          <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest animate-pulse">Memorize...</p>
        )}
        {stage === 'playing' && (
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Repeat the pattern</p>
        )}
        {stage === 'result' && (
          <div className="flex flex-col items-center gap-3">
            <span className="text-lg font-bold text-slate-900">Accuracy: {calculateScore()}%</span>
            <button 
              onClick={() => onComplete(calculateScore())}
              className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm"
            >
              Continue
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default MemoryGame;
