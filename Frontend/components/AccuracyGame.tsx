
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Wind, Award, Heart, Activity, Sparkles, Timer, TrendingDown } from 'lucide-react';
import { GameDifficulty } from '../types';

interface Props {
  onComplete: (accuracy: number) => void;
  difficulty: GameDifficulty;
}

interface BreathCycle {
  inhaleTime: number;
  exhaleTime: number;
  holdTime: number;
  timestamp: number;
}

const BalloonBreathingGame: React.FC<Props> = ({ onComplete, difficulty }) => {
  // Duration based on difficulty
  const gameDuration = difficulty === 'easy' ? 45 : difficulty === 'hard' ? 90 : 60;
  const targetInhale = difficulty === 'easy' ? 3000 : difficulty === 'hard' ? 5000 : 4000;
  const targetExhale = difficulty === 'easy' ? 4000 : difficulty === 'hard' ? 6000 : 5000;
  
  const [stage, setStage] = useState<'idle' | 'playing' | 'result'>('idle');
  const [balloonSize, setBalloonSize] = useState(50); // 0-100 scale, 50 is optimal
  const [isInhaling, setIsInhaling] = useState(false);
  const [breathPhase, setBreathPhase] = useState<'idle' | 'inhale' | 'hold' | 'exhale'>('idle');
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [breathCycles, setBreathCycles] = useState<BreathCycle[]>([]);
  const [currentCycleStart, setCurrentCycleStart] = useState<number | null>(null);
  const [inhaleStart, setInhaleStart] = useState<number | null>(null);
  const [exhaleStart, setExhaleStart] = useState<number | null>(null);
  const [stressScore, setStressScore] = useState(50);
  const [calmStreak, setCalmStreak] = useState(0);
  const [balloonColor, setBalloonColor] = useState('from-sky-400 to-blue-500');
  
  const animationRef = useRef<number>();
  const gameTimerRef = useRef<NodeJS.Timeout>();

  // Calculate stress based on balloon size deviation from optimal (50)
  const calculateStress = useCallback(() => {
    const deviation = Math.abs(balloonSize - 50);
    // Higher deviation = higher stress
    return Math.min(100, Math.max(0, deviation * 2));
  }, [balloonSize]);

  // Update balloon color based on stress level
  useEffect(() => {
    const stress = calculateStress();
    if (stress < 20) {
      setBalloonColor('from-emerald-400 to-teal-500');
    } else if (stress < 40) {
      setBalloonColor('from-sky-400 to-blue-500');
    } else if (stress < 60) {
      setBalloonColor('from-amber-400 to-orange-500');
    } else {
      setBalloonColor('from-red-400 to-rose-500');
    }
  }, [balloonSize, calculateStress]);

  // Handle breathing input (mouse/touch down = inhale, up = exhale)
  const handleBreathStart = useCallback(() => {
    if (stage !== 'playing') return;
    setIsInhaling(true);
    setBreathPhase('inhale');
    setInhaleStart(Date.now());
    if (!currentCycleStart) {
      setCurrentCycleStart(Date.now());
    }
  }, [stage, currentCycleStart]);

  const handleBreathEnd = useCallback(() => {
    if (stage !== 'playing' || !isInhaling) return;
    setIsInhaling(false);
    setBreathPhase('exhale');
    setExhaleStart(Date.now());
    
    const inhaleTime = inhaleStart ? Date.now() - inhaleStart : 0;
    
    // Record the breath cycle
    setTimeout(() => {
      const exhaleTime = exhaleStart ? Date.now() - (exhaleStart || Date.now()) : 2000;
      if (currentCycleStart) {
        setBreathCycles(prev => [...prev, {
          inhaleTime,
          exhaleTime,
          holdTime: 0,
          timestamp: Date.now()
        }]);
      }
      setBreathPhase('idle');
    }, 2000);
  }, [stage, isInhaling, inhaleStart, exhaleStart, currentCycleStart]);

  // Animate balloon size based on breathing
  useEffect(() => {
    if (stage !== 'playing') return;

    const animate = () => {
      setBalloonSize(prev => {
        if (isInhaling) {
          // Balloon inflates when inhaling
          const newSize = Math.min(100, prev + 0.8);
          return newSize;
        } else {
          // Balloon deflates when not inhaling
          const newSize = Math.max(0, prev - 0.5);
          return newSize;
        }
      });
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stage, isInhaling]);

  // Track calm streaks
  useEffect(() => {
    if (stage !== 'playing') return;
    
    const stress = calculateStress();
    if (stress < 25) {
      setCalmStreak(prev => prev + 1);
    } else {
      setCalmStreak(0);
    }
    setStressScore(stress);
  }, [balloonSize, stage, calculateStress]);

  // Game timer
  useEffect(() => {
    if (stage !== 'playing') return;

    gameTimerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setStage('result');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (gameTimerRef.current) {
        clearInterval(gameTimerRef.current);
      }
    };
  }, [stage]);

  const startGame = () => {
    setStage('playing');
    setBalloonSize(50);
    setTimeLeft(gameDuration);
    setBreathCycles([]);
    setStressScore(50);
    setCalmStreak(0);
    setBreathPhase('idle');
  };

  // Calculate final score (inverted stress = calmness score)
  const calculateFinalScore = useCallback(() => {
    if (breathCycles.length === 0) return 50;
    
    // Calculate average breath timing accuracy
    const avgInhaleDeviation = breathCycles.reduce((sum, cycle) => {
      return sum + Math.abs(cycle.inhaleTime - targetInhale);
    }, 0) / breathCycles.length;
    
    const avgExhaleDeviation = breathCycles.reduce((sum, cycle) => {
      return sum + Math.abs(cycle.exhaleTime - targetExhale);
    }, 0) / breathCycles.length;
    
    // Lower deviation = higher score
    const inhaleScore = Math.max(0, 100 - (avgInhaleDeviation / 50));
    const exhaleScore = Math.max(0, 100 - (avgExhaleDeviation / 50));
    
    // Combine with calm streak bonus
    const baseScore = (inhaleScore + exhaleScore) / 2;
    const streakBonus = Math.min(20, calmStreak * 0.5);
    
    return Math.round(Math.min(100, baseScore + streakBonus));
  }, [breathCycles, targetInhale, targetExhale, calmStreak]);

  const finalScore = calculateFinalScore();

  // Balloon visual size (scaled for display)
  const visualBalloonSize = 80 + (balloonSize * 1.2); // 80px to 200px

  return (
    <div className="flex flex-col items-center gap-8">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <Wind className="text-sky-500" size={24} />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Balloon Breathing</h2>
        </div>
        <p className="text-sm text-slate-500">Breathe to control the balloon - keep it steady!</p>
        {stage === 'playing' && calmStreak > 5 && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-full text-xs font-black uppercase tracking-widest animate-pulse shadow-lg">
            <Heart size={14} /> Calm Streak: {calmStreak}! 🧘
          </div>
        )}
      </div>

      <div 
        onMouseDown={handleBreathStart}
        onMouseUp={handleBreathEnd}
        onMouseLeave={handleBreathEnd}
        onTouchStart={handleBreathStart}
        onTouchEnd={handleBreathEnd}
        className="relative w-full aspect-square bg-gradient-to-br from-slate-50 via-sky-50 to-indigo-50 border-2 border-slate-200 rounded-3xl overflow-hidden cursor-pointer shadow-inner select-none"
      >
        {/* Sky background with clouds */}
        <div className="absolute inset-0">
          <div className="absolute top-10 left-10 w-16 h-8 bg-white/60 rounded-full blur-sm" />
          <div className="absolute top-20 right-16 w-20 h-10 bg-white/50 rounded-full blur-sm" />
          <div className="absolute bottom-32 left-20 w-12 h-6 bg-white/40 rounded-full blur-sm" />
        </div>

        {stage === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 z-10">
            <div className="text-center space-y-3">
              <div className="relative">
                <div className="w-24 h-28 mx-auto bg-gradient-to-br from-sky-400 to-blue-500 rounded-full shadow-2xl" 
                     style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}>
                  <div className="absolute top-3 left-4 w-4 h-4 bg-white/40 rounded-full" />
                </div>
                <div className="w-1 h-8 bg-slate-300 mx-auto -mt-1" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-slate-900">Breathe & Relax</p>
                <p className="text-xs text-slate-500">Hold to inhale, release to exhale</p>
                <p className="text-xs text-slate-400">Keep the balloon at a steady size</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="bg-gradient-to-r from-sky-600 to-blue-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:from-sky-700 hover:to-blue-700 transition-all active:scale-95 flex items-center gap-3"
            >
              <Wind size={24} /> Start Breathing
            </button>
          </div>
        )}

        {stage === 'playing' && (
          <>
            {/* Timer and stress indicator */}
            <div className="absolute top-4 left-4 right-4 flex justify-between items-center z-20">
              <div className="px-3 py-1 bg-white/90 backdrop-blur-sm rounded-full text-xs font-bold text-slate-600 uppercase tracking-widest shadow-sm flex items-center gap-2">
                <Timer size={14} /> {timeLeft}s
              </div>
              <div className={`px-3 py-1 backdrop-blur-sm rounded-full text-xs font-bold uppercase tracking-widest shadow-sm flex items-center gap-2 ${
                stressScore < 30 ? 'bg-emerald-500/90 text-white' : 
                stressScore < 60 ? 'bg-amber-500/90 text-white' : 
                'bg-red-500/90 text-white'
              }`}>
                <Activity size={14} /> Stress: {Math.round(stressScore)}%
              </div>
            </div>

            {/* Breathing guide */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
              <div className={`px-4 py-2 rounded-full text-sm font-bold uppercase tracking-widest shadow-lg transition-all ${
                breathPhase === 'inhale' ? 'bg-sky-500 text-white scale-110' :
                breathPhase === 'exhale' ? 'bg-indigo-500 text-white scale-95' :
                'bg-white/90 text-slate-600'
              }`}>
                {breathPhase === 'inhale' ? '🌬️ Inhaling...' :
                 breathPhase === 'exhale' ? '💨 Exhaling...' :
                 'Hold to breathe in'}
              </div>
            </div>

            {/* The Balloon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="relative transition-all duration-150 ease-out"
                   style={{ transform: `scale(${visualBalloonSize / 140})` }}>
                {/* Balloon body */}
                <div className={`w-32 h-40 bg-gradient-to-br ${balloonColor} rounded-full shadow-2xl transition-colors duration-300`}
                     style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}>
                  {/* Shine effect */}
                  <div className="absolute top-4 left-5 w-6 h-6 bg-white/40 rounded-full" />
                  <div className="absolute top-8 left-8 w-3 h-3 bg-white/30 rounded-full" />
                </div>
                {/* Balloon knot */}
                <div className={`w-4 h-4 bg-gradient-to-br ${balloonColor} mx-auto -mt-1 rotate-45 rounded-sm`} />
                {/* String */}
                <div className="w-0.5 h-16 bg-slate-300 mx-auto" style={{ 
                  background: 'linear-gradient(to bottom, #cbd5e1, #94a3b8)',
                  transform: `scaleY(${1 + Math.sin(Date.now() / 500) * 0.05})`
                }} />
              </div>
            </div>

            {/* Optimal zone indicator */}
            <div className="absolute left-4 top-1/2 -translate-y-1/2 h-48 w-2 bg-slate-200 rounded-full overflow-hidden">
              <div className="absolute bottom-0 w-full bg-gradient-to-t from-emerald-500 to-emerald-300 transition-all duration-150"
                   style={{ height: `${balloonSize}%` }} />
              {/* Optimal zone marker */}
              <div className="absolute top-1/2 -translate-y-1/2 w-full h-8 border-2 border-emerald-600 border-dashed rounded-sm" />
            </div>
          </>
        )}

        {stage === 'result' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-white/95 to-sky-50/95 backdrop-blur-sm animate-in fade-in zoom-in duration-500 z-20">
            <div className="text-center space-y-4">
              <Award size={64} className={`mx-auto ${finalScore >= 80 ? 'text-yellow-500' : finalScore >= 60 ? 'text-sky-500' : 'text-slate-400'}`} />
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Calm Score</p>
                <p className="text-7xl font-black bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent tracking-tighter">{finalScore}%</p>
                <p className="text-sm font-bold text-slate-600">
                  {finalScore >= 90 ? '🧘 Zen Master!' : 
                   finalScore >= 75 ? '😌 Very Relaxed!' : 
                   finalScore >= 60 ? '👍 Good Control!' : 
                   '💪 Keep Practicing!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 w-full">
        <div className="p-4 bg-gradient-to-br from-sky-50 to-blue-50 rounded-2xl border-2 border-sky-100 text-center">
          <Wind size={20} className="mx-auto text-sky-500 mb-1" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Breaths</p>
          <p className="text-2xl font-black text-slate-900">{breathCycles.length}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-2xl border-2 border-emerald-100 text-center">
          <Heart size={20} className="mx-auto text-emerald-500 mb-1" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Calm Streak</p>
          <p className="text-2xl font-black text-slate-900">{calmStreak}</p>
        </div>
        <div className="p-4 bg-gradient-to-br from-purple-50 to-pink-50 rounded-2xl border-2 border-purple-100 text-center">
          <TrendingDown size={20} className="mx-auto text-purple-500 mb-1" />
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Stress</p>
          <p className="text-2xl font-black text-slate-900">{Math.round(stressScore)}%</p>
        </div>
      </div>

      {stage === 'result' && (
        <button 
          onClick={() => onComplete(finalScore)}
          className="w-full bg-gradient-to-r from-sky-600 to-blue-600 text-white px-8 py-5 rounded-2xl font-black text-lg hover:from-sky-700 hover:to-blue-700 transition-all shadow-xl hover:shadow-2xl active:scale-95 flex items-center justify-center gap-2"
        >
          <Sparkles size={20} /> Complete Assessment →
        </button>
      )}
    </div>
  );
};

export default BalloonBreathingGame;
