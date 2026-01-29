
import React, { useState, useEffect, useRef } from 'react';
import { Target } from 'lucide-react';

interface Props {
  onComplete: (tapsPerSec: number) => void;
}

const TappingGame: React.FC<Props> = ({ onComplete }) => {
  const [count, setCount] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [stage, setStage] = useState<'idle' | 'playing' | 'result'>('idle');
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTapping = () => {
    setCount(0);
    setTimeLeft(5);
    setStage('playing');
  };

  useEffect(() => {
    if (stage === 'playing' && timeLeft > 0) {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => prev - 1);
      }, 1000);
      return () => clearTimeout(timerRef.current!);
    } else if (timeLeft === 0 && stage === 'playing') {
      setStage('result');
    }
  }, [stage, timeLeft]);

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Focus Stamina</h2>
        <p className="text-sm text-slate-500">Tap the area as many times as possible.</p>
      </div>

      <div className="relative w-24 h-24 flex items-center justify-center">
        <svg className="absolute inset-0 w-full h-full -rotate-90">
          <circle cx="48" cy="48" r="44" fill="none" stroke="#f1f5f9" strokeWidth="8" />
          <circle cx="48" cy="48" r="44" fill="none" stroke="#6366f1" strokeWidth="8" 
            strokeDasharray={276} strokeDashoffset={276 - (276 * timeLeft) / 5}
            strokeLinecap="round" className="transition-all duration-1000 linear" />
        </svg>
        <span className="text-2xl font-bold text-slate-900">{timeLeft}s</span>
      </div>

      <div className="w-full">
        {stage === 'idle' && (
          <button 
            onClick={startTapping}
            className="w-full bg-indigo-600 text-white py-12 rounded-2xl font-bold text-lg"
          >
            Start Tapping
          </button>
        )}
        {stage === 'playing' && (
          <button 
            onPointerDown={() => setCount(c => c + 1)}
            className="w-full h-40 bg-indigo-50 border-2 border-indigo-200 rounded-2xl text-indigo-600 flex flex-col items-center justify-center transition-all active:scale-[0.98] select-none"
          >
            <span className="text-6xl font-black tabular-nums">{count}</span>
            <span className="text-[10px] font-bold uppercase tracking-widest opacity-60 mt-2">Tap Area</span>
          </button>
        )}
        {stage === 'result' && (
          <div className="space-y-6 w-full">
            <div className="p-6 bg-slate-50 rounded-xl border border-slate-100 text-center">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Taps Per Second</p>
              <p className="text-4xl font-bold text-slate-900">{(count / 5).toFixed(1)}</p>
            </div>
            <button 
              onClick={() => onComplete(count / 5)}
              className="w-full bg-indigo-600 text-white py-4 rounded-xl font-bold"
            >
              Analyze Results
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default TappingGame;
