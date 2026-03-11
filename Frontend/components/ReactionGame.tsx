
import React, { useState, useEffect, useRef } from 'react';
import { Zap, Timer, Sparkles, Star, Trophy, Flame, Target, Rocket, Crown, Ghost, Gamepad2 } from 'lucide-react';
import { GameDifficulty } from '../types';

interface Props {
  onComplete: (time: number) => void;
  difficulty: GameDifficulty;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  size: number;
  life: number;
}

// Fun target shapes to click
const TARGETS = [
  { icon: Star, color: 'from-yellow-400 to-amber-500', shadow: 'shadow-amber-500/50', emoji: '⭐' },
  { icon: Zap, color: 'from-blue-400 to-indigo-500', shadow: 'shadow-indigo-500/50', emoji: '⚡' },
  { icon: Flame, color: 'from-orange-400 to-red-500', shadow: 'shadow-red-500/50', emoji: '🔥' },
  { icon: Target, color: 'from-emerald-400 to-teal-500', shadow: 'shadow-teal-500/50', emoji: '🎯' },
  { icon: Rocket, color: 'from-purple-400 to-pink-500', shadow: 'shadow-pink-500/50', emoji: '🚀' },
];

const ReactionGame: React.FC<Props> = ({ onComplete, difficulty }) => {
  const [stage, setStage] = useState<'idle' | 'waiting' | 'ready' | 'result' | 'bonus'>('idle');
  const [startTime, setStartTime] = useState<number>(0);
  const [resultTime, setResultTime] = useState<number>(0);
  const [round, setRound] = useState(1);
  const [totalScore, setTotalScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [targetPosition, setTargetPosition] = useState({ x: 50, y: 50 });
  const [currentTarget, setCurrentTarget] = useState(TARGETS[0]);
  const [showDecoy, setShowDecoy] = useState(false);
  const [decoyPositions, setDecoyPositions] = useState<{ x: number; y: number }[]>([]);
  const [shakeScreen, setShakeScreen] = useState(false);
  const [lastClickFeedback, setLastClickFeedback] = useState<string>('');
  const [floatingEmojis, setFloatingEmojis] = useState<{ id: number; emoji: string; x: number; y: number }[]>([]);
  
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const maxRounds = difficulty === 'easy' ? 3 : difficulty === 'hard' ? 7 : 5;
  const animationRef = useRef<number>();
  const containerRef = useRef<HTMLDivElement>(null);

  // Animate particles
  useEffect(() => {
    if (particles.length === 0) return;
    
    const animate = () => {
      setParticles(prev => 
        prev.map(p => ({
          ...p,
          x: p.x + p.vx,
          y: p.y + p.vy,
          vy: p.vy + 0.3,
          life: p.life - 3
        })).filter(p => p.life > 0)
      );
      animationRef.current = requestAnimationFrame(animate);
    };
    
    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [particles.length]);

  // Clean up floating emojis
  useEffect(() => {
    if (floatingEmojis.length === 0) return;
    const timer = setTimeout(() => setFloatingEmojis([]), 1500);
    return () => clearTimeout(timer);
  }, [floatingEmojis]);

  const spawnParticles = (clientX: number, clientY: number, count: number = 20) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;
    
    const colors = ['#fbbf24', '#f97316', '#ef4444', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899'];
    const newParticles: Particle[] = Array.from({ length: count }).map((_, i) => ({
      id: Date.now() + i,
      x,
      y,
      vx: (Math.random() - 0.5) * 20,
      vy: (Math.random() - 0.5) * 20 - 8,
      color: colors[Math.floor(Math.random() * colors.length)],
      size: Math.random() * 10 + 5,
      life: 100
    }));
    setParticles(prev => [...prev, ...newParticles]);
  };

  const spawnFloatingEmoji = (emoji: string, x: number, y: number) => {
    setFloatingEmojis(prev => [...prev, { id: Date.now(), emoji, x, y }]);
  };

  const randomPosition = () => ({
    x: 15 + Math.random() * 70,
    y: 15 + Math.random() * 70
  });

  const startRound = () => {
    setStage('waiting');
    setLastClickFeedback('');
    
    // Random target position and type
    setTargetPosition(randomPosition());
    setCurrentTarget(TARGETS[Math.floor(Math.random() * TARGETS.length)]);
    
    // Add decoy positions on harder difficulties
    if (difficulty !== 'easy' && round > 1) {
      const decoyCount = difficulty === 'hard' ? 2 : 1;
      setDecoyPositions(Array.from({ length: decoyCount }).map(() => randomPosition()));
      setShowDecoy(true);
    } else {
      setShowDecoy(false);
      setDecoyPositions([]);
    }
    
    const delayRange = {
      easy: { min: 1500, max: 3000 },
      medium: { min: 1000, max: 2500 },
      hard: { min: 600, max: 2000 }
    }[difficulty];
    
    const delay = delayRange.min + Math.random() * (delayRange.max - delayRange.min);
    timerRef.current = setTimeout(() => {
      setStage('ready');
      setStartTime(Date.now());
    }, delay);
  };

  const handleTargetClick = (e: React.MouseEvent, isDecoy: boolean = false) => {
    e.stopPropagation();
    
    if (stage === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShakeScreen(true);
      setCombo(0);
      setLastClickFeedback('TOO EARLY! 😱');
      setTimeout(() => setShakeScreen(false), 500);
      setTimeout(() => startRound(), 1000);
      return;
    }
    
    if (stage !== 'ready') return;
    
    if (isDecoy) {
      // Clicked decoy - penalty!
      setShakeScreen(true);
      setCombo(0);
      setLastClickFeedback('WRONG TARGET! 👻');
      spawnFloatingEmoji('💀', e.clientX, e.clientY);
      setTimeout(() => setShakeScreen(false), 500);
      if (round < maxRounds) {
        setRound(r => r + 1);
        setTimeout(startRound, 1000);
      } else {
        setTimeout(() => setStage('result'), 800);
      }
      return;
    }
    
    // Success!
    spawnParticles(e.clientX, e.clientY, 25);
    spawnFloatingEmoji(currentTarget.emoji, e.clientX, e.clientY);
    
    const diff = Date.now() - startTime;
    const comboMultiplier = 1 + (combo * 0.15);
    const speedBonus = Math.max(0, 600 - diff);
    const points = Math.round((300 + speedBonus) * comboMultiplier);
    
    setResultTime(diff);
    setTotalScore(s => s + points);
    setCombo(c => c + 1);
    
    const feedback = diff < 180 ? 'INSANE! 🔥' : diff < 250 ? 'PERFECT! ⚡' : diff < 350 ? 'GREAT! ✨' : 'GOOD! 👍';
    setLastClickFeedback(feedback);
    
    // Check if more rounds
    if (round < maxRounds) {
      setStage('bonus');
      setTimeout(() => {
        setRound(r => r + 1);
        startRound();
      }, 1200);
    } else {
      setTimeout(() => setStage('result'), 800);
    }
  };

  const handleMissClick = () => {
    if (stage === 'waiting') {
      if (timerRef.current) clearTimeout(timerRef.current);
      setShakeScreen(true);
      setCombo(0);
      setLastClickFeedback('TOO EARLY! 😱');
      setTimeout(() => setShakeScreen(false), 500);
      setTimeout(() => startRound(), 1000);
    } else if (stage === 'ready') {
      setShakeScreen(true);
      setLastClickFeedback('MISSED! 😅');
      setCombo(0);
      setTimeout(() => setShakeScreen(false), 300);
    }
  };

  const getRank = () => {
    const avgScore = totalScore / maxRounds;
    if (avgScore > 600) return { rank: 'S', title: 'LEGENDARY!', color: 'text-yellow-400', icon: Crown, bg: 'from-yellow-500 to-amber-600' };
    if (avgScore > 450) return { rank: 'A', title: 'AMAZING!', color: 'text-purple-400', icon: Rocket, bg: 'from-purple-500 to-pink-600' };
    if (avgScore > 300) return { rank: 'B', title: 'GREAT!', color: 'text-blue-400', icon: Star, bg: 'from-blue-500 to-indigo-600' };
    if (avgScore > 150) return { rank: 'C', title: 'GOOD', color: 'text-emerald-400', icon: Target, bg: 'from-emerald-500 to-teal-600' };
    return { rank: 'D', title: 'KEEP TRYING', color: 'text-slate-400', icon: Gamepad2, bg: 'from-slate-500 to-slate-600' };
  };

  const TargetIcon = currentTarget.icon;
  const rank = getRank();
  const RankIcon = rank.icon;

  return (
    <div className={`flex flex-col items-center gap-6 transition-transform ${shakeScreen ? 'animate-shake' : ''}`}>
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <div className="relative">
            <Zap className="text-amber-500" size={32} />
            <div className="absolute inset-0 animate-ping">
              <Zap className="text-amber-400 opacity-50" size={32} />
            </div>
          </div>
          <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 bg-clip-text text-transparent">
            REFLEX HUNTER
          </h2>
          <div className="relative">
            <Zap className="text-amber-500" size={32} />
            <div className="absolute inset-0 animate-ping">
              <Zap className="text-amber-400 opacity-50" size={32} />
            </div>
          </div>
        </div>
        <p className="text-sm text-slate-500">
          {difficulty === 'easy' ? 'Click the targets fast!' : 'Click targets, avoid ghosts! 👻'}
        </p>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between w-full max-w-sm bg-gradient-to-r from-slate-100 to-slate-50 rounded-2xl px-5 py-3 shadow-inner">
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-bold tracking-wider">ROUND</div>
          <div className="text-xl font-black text-slate-800">{round}<span className="text-slate-400 text-sm">/{maxRounds}</span></div>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-bold tracking-wider">SCORE</div>
          <div className="text-xl font-black bg-gradient-to-r from-amber-500 to-orange-600 bg-clip-text text-transparent">
            {totalScore.toLocaleString()}
          </div>
        </div>
        <div className="w-px h-8 bg-slate-200" />
        <div className="text-center">
          <div className="text-[10px] text-slate-400 font-bold tracking-wider">COMBO</div>
          <div className={`text-xl font-black ${combo >= 3 ? 'text-red-500' : combo >= 2 ? 'text-orange-500' : 'text-slate-800'}`}>
            {combo}x{combo >= 3 && <span className="ml-1">🔥</span>}
          </div>
        </div>
      </div>

      {/* Game Area */}
      <div 
        ref={containerRef}
        onClick={handleMissClick}
        className={`w-full aspect-square max-w-sm rounded-3xl relative overflow-hidden transition-all duration-300 cursor-crosshair select-none ${
          stage === 'idle' ? 'bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 border-2 border-slate-700' :
          stage === 'waiting' ? 'bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900' :
          stage === 'ready' ? 'bg-gradient-to-br from-slate-900 via-purple-950 to-slate-900' :
          'bg-gradient-to-br from-emerald-900 via-teal-900 to-cyan-900'
        }`}
      >
        {/* Animated background stars */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          {Array.from({ length: 40 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-1 h-1 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `twinkle ${2 + Math.random() * 3}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 3}s`,
                opacity: Math.random() * 0.6 + 0.2
              }}
            />
          ))}
        </div>

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute rounded-full pointer-events-none z-50"
            style={{
              left: p.x,
              top: p.y,
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              opacity: p.life / 100,
              transform: 'translate(-50%, -50%)',
              boxShadow: `0 0 ${p.size}px ${p.color}`
            }}
          />
        ))}

        {/* Floating Emojis */}
        {floatingEmojis.map(fe => (
          <div
            key={fe.id}
            className="absolute text-4xl pointer-events-none z-50 animate-float-up"
            style={{ left: fe.x, top: fe.y, transform: 'translate(-50%, -50%)' }}
          >
            {fe.emoji}
          </div>
        ))}

        {/* Click Feedback */}
        {lastClickFeedback && stage !== 'idle' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-40 animate-bounce">
            <div className={`px-4 py-2 rounded-full font-black text-sm ${
              lastClickFeedback.includes('INSANE') || lastClickFeedback.includes('PERFECT') ? 'bg-gradient-to-r from-yellow-400 to-amber-500 text-white' :
              lastClickFeedback.includes('GREAT') || lastClickFeedback.includes('GOOD') ? 'bg-gradient-to-r from-emerald-400 to-teal-500 text-white' :
              'bg-gradient-to-r from-red-500 to-rose-600 text-white'
            }`}>
              {lastClickFeedback}
            </div>
          </div>
        )}

        {/* Game Content */}
        <div className="absolute inset-0 flex items-center justify-center">
          {stage === 'idle' && (
            <div className="space-y-6 text-center animate-in fade-in zoom-in duration-500">
              <div className="relative inline-block">
                <Gamepad2 size={80} className="text-slate-600 mx-auto" />
                <Sparkles size={28} className="absolute -top-2 -right-2 text-amber-400 animate-pulse" />
                <Star size={20} className="absolute -bottom-1 -left-2 text-purple-400 animate-bounce" />
              </div>
              <button 
                onClick={(e) => { e.stopPropagation(); startRound(); }}
                className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-orange-500/40 hover:scale-110 hover:shadow-orange-500/60 transition-all flex items-center gap-3 group"
              >
                <Rocket size={24} className="group-hover:animate-bounce" /> START GAME
              </button>
            </div>
          )}

          {stage === 'waiting' && (
            <div className="text-center space-y-4">
              <div className="relative">
                <div className="w-24 h-24 rounded-full border-4 border-slate-700 border-t-indigo-500 animate-spin mx-auto" />
                <Timer size={40} className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-indigo-400" />
              </div>
              <div className="text-2xl font-black text-slate-400 tracking-widest animate-pulse">GET READY...</div>
              <div className="text-sm text-slate-600">Don't click yet!</div>
            </div>
          )}

          {/* Decoy Targets */}
          {stage === 'ready' && showDecoy && decoyPositions.map((pos, idx) => (
            <div
              key={idx}
              onClick={(e) => handleTargetClick(e, true)}
              className="absolute cursor-pointer transition-all duration-200 hover:scale-110 z-20"
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative animate-float">
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-slate-500 to-slate-700 flex items-center justify-center shadow-lg shadow-slate-900/50 border-2 border-slate-600">
                  <Ghost size={32} className="text-slate-300" />
                </div>
              </div>
            </div>
          ))}

          {/* Main Target */}
          {stage === 'ready' && (
            <div
              onClick={(e) => handleTargetClick(e)}
              className="absolute cursor-pointer hover:scale-125 transition-transform duration-100 z-30"
              style={{ left: `${targetPosition.x}%`, top: `${targetPosition.y}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative">
                <div className={`w-20 h-20 rounded-full bg-gradient-to-br ${currentTarget.color} flex items-center justify-center shadow-2xl ${currentTarget.shadow} animate-target-pulse`}>
                  <TargetIcon size={44} className="text-white drop-shadow-lg" />
                </div>
                <div className="absolute inset-0 rounded-full border-4 border-white/30 animate-ping" />
                <div className="absolute inset-[-8px] rounded-full border-2 border-white/20 animate-pulse" />
              </div>
            </div>
          )}

          {/* Bonus Score Flash */}
          {stage === 'bonus' && (
            <div className="text-center space-y-4 animate-in zoom-in duration-300">
              <div className="text-6xl font-black text-green-400 drop-shadow-glow animate-bounce">
                +{Math.round((300 + Math.max(0, 600 - resultTime)) * (1 + combo * 0.15))}
              </div>
              <div className="text-2xl text-white font-bold">
                {resultTime}ms
              </div>
              {combo >= 3 && (
                <div className="text-amber-400 font-black text-xl animate-pulse">
                  🔥 {combo}x COMBO! 🔥
                </div>
              )}
            </div>
          )}

          {/* Results */}
          {stage === 'result' && (
            <div className="text-center space-y-5 animate-in fade-in zoom-in duration-500 p-6">
              <div className="relative inline-block">
                <div className={`w-28 h-28 rounded-full bg-gradient-to-br ${rank.bg} flex items-center justify-center shadow-2xl mx-auto`}>
                  <RankIcon size={56} className="text-white drop-shadow-lg" />
                </div>
                <div className={`absolute -top-2 -right-2 text-5xl font-black ${rank.color} drop-shadow-lg`}>
                  {rank.rank}
                </div>
              </div>
              <div className={`text-2xl font-black ${rank.color}`}>{rank.title}</div>
              <div className="text-white space-y-2">
                <div className="text-5xl font-black tabular-nums bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                  {totalScore.toLocaleString()}
                  <span className="text-xl ml-2 text-white/70">PTS</span>
                </div>
                <div className="text-slate-400 text-sm flex items-center justify-center gap-4">
                  <span>Max combo: <span className="text-white font-bold">{combo}x</span></span>
                  <span>•</span>
                  <span>Rounds: <span className="text-white font-bold">{maxRounds}</span></span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Continue Button */}
      {stage === 'result' && (
        <button 
          onClick={() => onComplete(totalScore > 2000 ? 150 : totalScore > 1200 ? 220 : totalScore > 600 ? 300 : 400)}
          className="w-full max-w-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 flex items-center justify-center gap-2"
        >
          <Sparkles size={22} /> Continue to Next Game
        </button>
      )}

      {/* Custom CSS for animations */}
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.2; transform: scale(1); }
          50% { opacity: 1; transform: scale(1.5); }
        }
        @keyframes float-up {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1.5); }
        }
        @keyframes target-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.08); }
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px) rotate(-1deg); }
          40% { transform: translateX(8px) rotate(1deg); }
          60% { transform: translateX(-6px) rotate(-0.5deg); }
          80% { transform: translateX(6px) rotate(0.5deg); }
        }
        .animate-float-up {
          animation: float-up 1.5s ease-out forwards;
        }
        .animate-target-pulse {
          animation: target-pulse 0.6s ease-in-out infinite;
        }
        .drop-shadow-glow {
          filter: drop-shadow(0 0 20px rgba(74, 222, 128, 0.5));
        }
      `}</style>
    </div>
  );
};

export default ReactionGame;
