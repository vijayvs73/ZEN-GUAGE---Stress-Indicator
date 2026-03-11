
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Wind, Award, Heart, Activity, Sparkles, Timer, TrendingDown, Cloud, Stars, Zap, Crown, Trophy, Rocket } from 'lucide-react';
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

interface FloatingItem {
  id: number;
  x: number;
  y: number;
  emoji: string;
  speed: number;
}

const ACHIEVEMENTS = [
  { threshold: 10, emoji: '🌱', name: 'Seedling' },
  { threshold: 25, emoji: '🌿', name: 'Growing' },
  { threshold: 50, emoji: '🌳', name: 'Rooted' },
  { threshold: 75, emoji: '🧘', name: 'Centered' },
  { threshold: 100, emoji: '✨', name: 'Zen' },
];

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
  const [floatingItems, setFloatingItems] = useState<FloatingItem[]>([]);
  const [score, setScore] = useState(0);
  const [achievements, setAchievements] = useState<string[]>([]);
  const [showAchievement, setShowAchievement] = useState<string | null>(null);
  const [perfectBreaths, setPerfectBreaths] = useState(0);
  const [zenMode, setZenMode] = useState(false);
  const [particles, setParticles] = useState<{ id: number; x: number; y: number }[]>([]);
  
  const animationRef = useRef<number>();
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const floatRef = useRef<NodeJS.Timeout>();

  // Spawn floating items for atmosphere
  useEffect(() => {
    if (stage !== 'playing') return;
    
    const spawnItem = () => {
      const emojis = ['☁️', '🦋', '🌸', '✨', '💫', '🍃'];
      setFloatingItems(prev => [...prev, {
        id: Date.now(),
        x: Math.random() * 100,
        y: 100,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        speed: 0.3 + Math.random() * 0.3
      }]);
    };
    
    floatRef.current = setInterval(spawnItem, 2000);
    return () => clearInterval(floatRef.current);
  }, [stage]);

  // Animate floating items
  useEffect(() => {
    if (floatingItems.length === 0) return;
    
    const animate = () => {
      setFloatingItems(prev => 
        prev.map(item => ({ ...item, y: item.y - item.speed }))
            .filter(item => item.y > -10)
      );
    };
    
    const interval = setInterval(animate, 50);
    return () => clearInterval(interval);
  }, [floatingItems.length]);

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

  // Track calm streaks and award achievements
  useEffect(() => {
    if (stage !== 'playing') return;
    
    const stress = calculateStress();
    if (stress < 25) {
      setCalmStreak(prev => {
        const newStreak = prev + 1;
        
        // Check for achievements
        const achievement = ACHIEVEMENTS.find(a => a.threshold === newStreak && !achievements.includes(a.name));
        if (achievement) {
          setAchievements(prev => [...prev, achievement.name]);
          setShowAchievement(`${achievement.emoji} ${achievement.name}!`);
          setScore(s => s + newStreak * 10);
          setTimeout(() => setShowAchievement(null), 2000);
        }
        
        // Enter Zen Mode at high streaks
        if (newStreak >= 30 && !zenMode) {
          setZenMode(true);
        }
        
        // Award points for staying calm
        if (newStreak % 5 === 0) {
          setScore(s => s + 50);
          spawnCalmParticles();
        }
        
        return newStreak;
      });
    } else {
      setCalmStreak(0);
      setZenMode(false);
    }
    setStressScore(stress);
  }, [balloonSize, stage, calculateStress]);

  const spawnCalmParticles = () => {
    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      x: 40 + Math.random() * 20,
      y: 40 + Math.random() * 20
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1500);
  };

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
    setScore(0);
    setAchievements([]);
    setPerfectBreaths(0);
    setZenMode(false);
    setFloatingItems([]);
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
    <div className="flex flex-col items-center gap-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Wind className="text-sky-500" size={32} />
          <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 bg-clip-text text-transparent">
            BALLOON BREATHING
          </h2>
          <Sparkles className="text-indigo-500" size={28} />
        </div>
        <p className="text-sm text-slate-500">Hold to inhale, release to exhale. Keep the balloon steady!</p>
      </div>

      {/* Stats Bar */}
      {stage !== 'idle' && (
        <div className="flex items-center justify-between w-full max-w-sm bg-gradient-to-r from-sky-50 to-indigo-50 rounded-2xl px-4 py-3 shadow-inner">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">TIME</div>
            <div className="text-xl font-black text-slate-800">{timeLeft}s</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">SCORE</div>
            <div className="text-xl font-black bg-gradient-to-r from-sky-500 to-blue-600 bg-clip-text text-transparent">
              {score.toLocaleString()}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">CALM</div>
            <div className={`text-xl font-black ${calmStreak >= 30 ? 'text-purple-500' : calmStreak >= 10 ? 'text-emerald-500' : 'text-slate-800'}`}>
              {calmStreak}{zenMode && <span className="ml-1">🧘</span>}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">STRESS</div>
            <div className={`text-xl font-black ${stressScore < 30 ? 'text-emerald-500' : stressScore < 60 ? 'text-amber-500' : 'text-red-500'}`}>
              {Math.round(stressScore)}%
            </div>
          </div>
        </div>
      )}

      {/* Achievement Popup */}
      {showAchievement && (
        <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-bounce">
          <div className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 text-white rounded-full font-black text-lg shadow-2xl shadow-purple-500/50">
            {showAchievement}
          </div>
        </div>
      )}

      {/* Game Area */}
      <div 
        onMouseDown={handleBreathStart}
        onMouseUp={handleBreathEnd}
        onMouseLeave={handleBreathEnd}
        onTouchStart={handleBreathStart}
        onTouchEnd={handleBreathEnd}
        className={`relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden cursor-pointer select-none transition-all duration-500 ${
          zenMode ? 'bg-gradient-to-br from-purple-900 via-indigo-900 to-slate-900' :
          'bg-gradient-to-br from-sky-100 via-blue-50 to-indigo-100'
        }`}
      >
        {/* Animated sky background */}
        <div className="absolute inset-0 overflow-hidden">
          {/* Sun/Moon */}
          <div className={`absolute top-6 right-6 w-12 h-12 rounded-full transition-all duration-1000 ${
            zenMode ? 'bg-gradient-to-br from-slate-200 to-slate-400 shadow-lg shadow-slate-400/50' :
            'bg-gradient-to-br from-yellow-300 to-orange-400 shadow-lg shadow-orange-400/50'
          }`}>
            {!zenMode && <div className="absolute top-2 left-2 w-3 h-3 bg-white/60 rounded-full" />}
          </div>
          
          {/* Clouds */}
          {!zenMode && (
            <>
              <div className="absolute top-16 left-8 w-20 h-8 bg-white/70 rounded-full blur-sm animate-float" style={{ animationDelay: '0s' }} />
              <div className="absolute top-24 right-12 w-16 h-6 bg-white/60 rounded-full blur-sm animate-float" style={{ animationDelay: '1s' }} />
              <div className="absolute bottom-28 left-12 w-14 h-5 bg-white/50 rounded-full blur-sm animate-float" style={{ animationDelay: '2s' }} />
            </>
          )}
          
          {/* Stars in Zen Mode */}
          {zenMode && Array.from({ length: 30 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full animate-twinkle"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 3}s`
              }}
            />
          ))}
        </div>

        {/* Floating Items */}
        {floatingItems.map(item => (
          <div
            key={item.id}
            className="absolute text-2xl pointer-events-none transition-all"
            style={{ left: `${item.x}%`, top: `${item.y}%` }}
          >
            {item.emoji}
          </div>
        ))}

        {/* Calm Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute text-xl pointer-events-none animate-float-up"
            style={{ left: `${p.x}%`, top: `${p.y}%` }}
          >
            ✨
          </div>
        ))}

        {/* Idle State */}
        {stage === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 z-10">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <div className="w-28 h-32 mx-auto bg-gradient-to-br from-sky-400 to-blue-500 rounded-full shadow-2xl shadow-blue-500/30 animate-pulse" 
                     style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}>
                  <div className="absolute top-4 left-6 w-6 h-6 bg-white/40 rounded-full" />
                  <div className="absolute top-8 left-10 w-3 h-3 bg-white/30 rounded-full" />
                </div>
                <div className="w-1 h-10 bg-slate-300 mx-auto -mt-1" />
                <Sparkles className="absolute -top-2 -right-2 text-amber-400 animate-pulse" size={24} />
              </div>
              <div className="space-y-1">
                <p className="text-xl font-black text-slate-800">Ready to Relax?</p>
                <p className="text-sm text-slate-500">Hold to inflate • Release to deflate</p>
              </div>
            </div>
            <button 
              onClick={(e) => { e.stopPropagation(); startGame(); }}
              className="bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-blue-500/40 hover:scale-110 transition-all flex items-center gap-3"
            >
              <Wind size={24} /> START BREATHING
            </button>
          </div>
        )}

        {/* Playing State */}
        {stage === 'playing' && (
          <>
            {/* Breath Phase Indicator */}
            <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-20 px-5 py-2 rounded-full font-black text-sm uppercase tracking-wider shadow-lg transition-all ${
              breathPhase === 'inhale' ? 'bg-gradient-to-r from-sky-500 to-blue-500 text-white scale-110' :
              breathPhase === 'exhale' ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white scale-95' :
              'bg-white/90 text-slate-600'
            }`}>
              {breathPhase === 'inhale' ? '🌬️ INHALE...' :
               breathPhase === 'exhale' ? '💨 EXHALE...' :
               '👆 HOLD TO BREATHE'}
            </div>

            {/* The Balloon */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="relative transition-all duration-100 ease-out"
                   style={{ transform: `scale(${0.6 + (balloonSize / 100) * 0.8})` }}>
                {/* Balloon glow effect */}
                <div className={`absolute inset-[-20px] rounded-full blur-2xl transition-colors duration-300 ${
                  stressScore < 30 ? 'bg-emerald-400/30' : 
                  stressScore < 60 ? 'bg-amber-400/30' : 
                  'bg-red-400/30'
                }`} />
                
                {/* Balloon body */}
                <div className={`w-36 h-44 bg-gradient-to-br ${balloonColor} rounded-full shadow-2xl transition-colors duration-300 relative`}
                     style={{ borderRadius: '50% 50% 50% 50% / 60% 60% 40% 40%' }}>
                  {/* Shine effects */}
                  <div className="absolute top-5 left-6 w-8 h-8 bg-white/40 rounded-full blur-sm" />
                  <div className="absolute top-10 left-10 w-4 h-4 bg-white/30 rounded-full" />
                  
                  {/* Face based on stress */}
                  <div className="absolute bottom-12 left-1/2 -translate-x-1/2 text-4xl">
                    {stressScore < 25 ? '😊' : stressScore < 50 ? '😐' : stressScore < 75 ? '😟' : '😰'}
                  </div>
                </div>
                
                {/* Balloon knot */}
                <div className={`w-5 h-5 bg-gradient-to-br ${balloonColor} mx-auto -mt-1.5 rotate-45 rounded-sm`} />
                
                {/* String with wave animation */}
                <svg className="w-4 h-20 mx-auto" viewBox="0 0 10 50">
                  <path
                    d={`M5 0 Q ${5 + Math.sin(Date.now() / 200) * 3} 25, 5 50`}
                    stroke="#94a3b8"
                    strokeWidth="1.5"
                    fill="none"
                  />
                </svg>
              </div>
            </div>

            {/* Side Meter */}
            <div className="absolute right-4 top-1/2 -translate-y-1/2 h-48 w-4 bg-white/50 rounded-full overflow-hidden shadow-inner">
              <div className={`absolute bottom-0 w-full transition-all duration-100 rounded-full ${
                stressScore < 30 ? 'bg-gradient-to-t from-emerald-500 to-emerald-300' :
                stressScore < 60 ? 'bg-gradient-to-t from-amber-500 to-amber-300' :
                'bg-gradient-to-t from-red-500 to-red-300'
              }`} style={{ height: `${balloonSize}%` }} />
              {/* Optimal zone */}
              <div className="absolute top-1/2 -translate-y-1/2 w-full h-12 border-2 border-emerald-500 border-dashed rounded opacity-60">
                <div className="absolute -right-8 top-1/2 -translate-y-1/2 text-xs font-bold text-emerald-600 whitespace-nowrap">
                  OPTIMAL
                </div>
              </div>
            </div>

            {/* Bottom Instructions */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-20">
              <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-full text-xs font-bold text-slate-600 shadow-lg">
                Keep balloon in the green zone for bonus points! 🎯
              </div>
            </div>
          </>
        )}

        {/* Results */}
        {stage === 'result' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-white/95 to-sky-50/95 backdrop-blur-sm z-20">
            <div className="text-center space-y-5 animate-in fade-in zoom-in duration-500">
              <div className="relative inline-block">
                <div className={`w-24 h-24 rounded-full flex items-center justify-center shadow-2xl ${
                  finalScore >= 80 ? 'bg-gradient-to-br from-yellow-400 to-amber-500' :
                  finalScore >= 60 ? 'bg-gradient-to-br from-sky-400 to-blue-500' :
                  'bg-gradient-to-br from-slate-400 to-slate-500'
                }`}>
                  <Trophy size={48} className="text-white drop-shadow-lg" />
                </div>
                <div className={`absolute -top-2 -right-2 text-4xl font-black ${
                  finalScore >= 80 ? 'text-yellow-500' : finalScore >= 60 ? 'text-blue-500' : 'text-slate-500'
                }`}>
                  {finalScore >= 90 ? 'S' : finalScore >= 80 ? 'A' : finalScore >= 70 ? 'B' : finalScore >= 60 ? 'C' : 'D'}
                </div>
              </div>
              
              <div className="space-y-2">
                <div className="text-sm font-bold text-slate-500 uppercase tracking-widest">Calm Score</div>
                <div className="text-6xl font-black bg-gradient-to-r from-sky-600 to-blue-600 bg-clip-text text-transparent">
                  {finalScore}%
                </div>
                <div className="text-lg font-bold text-slate-600">
                  {finalScore >= 90 ? '🧘 Zen Master!' : 
                   finalScore >= 75 ? '😌 Super Relaxed!' : 
                   finalScore >= 60 ? '👍 Good Control!' : 
                   '💪 Keep Practicing!'}
                </div>
              </div>
              
              {/* Stats */}
              <div className="flex items-center justify-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-800">{score}</div>
                  <div className="text-xs text-slate-500 font-bold">POINTS</div>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-800">{breathCycles.length}</div>
                  <div className="text-xs text-slate-500 font-bold">BREATHS</div>
                </div>
                <div className="w-px h-8 bg-slate-200" />
                <div className="text-center">
                  <div className="text-2xl font-black text-slate-800">{achievements.length}</div>
                  <div className="text-xs text-slate-500 font-bold">BADGES</div>
                </div>
              </div>
              
              {achievements.length > 0 && (
                <div className="flex justify-center gap-2">
                  {achievements.map((a, i) => (
                    <span key={i} className="text-2xl" title={a}>
                      {ACHIEVEMENTS.find(ach => ach.name === a)?.emoji}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
      {stage === 'result' && (
        <button 
          onClick={() => onComplete(finalScore)}
          className="w-full max-w-sm bg-gradient-to-r from-sky-500 via-blue-500 to-indigo-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl hover:shadow-2xl hover:shadow-blue-500/30 flex items-center justify-center gap-2"
        >
          <Sparkles size={22} /> Complete Assessment
        </button>
      )}

      {/* Custom CSS */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) translateX(0); }
          25% { transform: translateY(-10px) translateX(5px); }
          75% { transform: translateY(-5px) translateX(-5px); }
        }
        @keyframes float-up {
          0% { opacity: 1; transform: translateY(0) scale(1); }
          100% { opacity: 0; transform: translateY(-50px) scale(1.5); }
        }
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 1; }
        }
        .animate-float {
          animation: float 4s ease-in-out infinite;
        }
        .animate-float-up {
          animation: float-up 1.5s ease-out forwards;
        }
        .animate-twinkle {
          animation: twinkle 2s ease-in-out infinite;
        }
      `}</style>
    </div>
  );
};

export default BalloonBreathingGame;
