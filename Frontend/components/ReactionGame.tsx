
import React, { useState, useEffect, useRef } from 'react';
import { MousePointer2, Zap } from 'lucide-react';

interface Props {
  onComplete: (time: number) => void;
}

const ReactionGame: React.FC<Props> = ({ onComplete }) => {
  const [stage, setStage] = useState<'idle' | 'waiting' | 'ready' | 'result'>('idle');
  const [startTime, setStartTime] = useState<number>(0);
  const [resultTime, setResultTime] = useState<number>(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startTest = () => {
    setStage('waiting');
    const delay = 1500 + Math.random() * 3000;
    timerRef.current = setTimeout(() => {
      setStage('ready');
      setStartTime(Date.now());
    }, delay);
  };

  const handleClick = () => {
    if (stage === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      alert("Click too early. Resetting...");
      setStage('idle');
    } else if (stage === 'ready') {
      const diff = Date.now() - startTime;
      setResultTime(diff);
      setStage('result');
    }
  };

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-2">
        <h2 className="text-xl font-bold text-slate-900 tracking-tight">Reaction Time</h2>
        <p className="text-sm text-slate-500">Wait for indigo and click as fast as possible.</p>
      </div>

      <div 
        onClick={handleClick}
        className={`w-full aspect-square rounded-2xl flex items-center justify-center cursor-pointer transition-all duration-200 active:scale-[0.98] ${
          stage === 'idle' ? 'bg-slate-50 border-2 border-dashed border-slate-200' :
          stage === 'waiting' ? 'bg-slate-100' :
          stage === 'ready' ? 'bg-indigo-600' :
          'bg-slate-900'
        }`}
      >
        <div className="text-center">
          {stage === 'idle' && (
            <button 
              onClick={(e) => { e.stopPropagation(); startTest(); }}
              className="bg-white border border-slate-200 text-slate-900 px-6 py-3 rounded-xl font-bold shadow-sm hover:bg-slate-50"
            >
              Start
            </button>
          )}
          {stage === 'waiting' && (
             <div className="flex flex-col items-center gap-3">
               <div className="w-10 h-10 rounded-full border-4 border-slate-200 border-t-indigo-600 animate-spin" />
               <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Wait for it...</span>
             </div>
          )}
          {stage === 'ready' && <Zap size={48} className="text-white fill-white" />}
          {stage === 'result' && (
            <div className="space-y-4">
              <div className="text-white">
                <p className="text-xs font-bold uppercase tracking-widest opacity-60">Result</p>
                <p className="text-5xl font-bold tabular-nums tracking-tighter">{resultTime}ms</p>
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); onComplete(resultTime); }}
                className="bg-indigo-600 text-white px-6 py-2 rounded-lg font-bold text-sm"
              >
                Continue
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
        <div 
          className="h-full bg-indigo-600 transition-all duration-300" 
          style={{ width: stage === 'result' ? '100%' : stage === 'ready' ? '66%' : stage === 'waiting' ? '33%' : '0%' }} 
        />
      </div>
    </div>
  );
};

export default ReactionGame;
