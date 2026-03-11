
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Sparkles, Timer, Trophy, Zap, Heart, Star, Target, Flame, Crown, Bomb, Ghost, Bug, Smile, Frown } from 'lucide-react';
import { GameDifficulty } from '../types';

interface Props {
  onComplete: (tapsPerSec: number) => void;
  difficulty: GameDifficulty;
}

interface Mole {
  id: number;
  holeIndex: number;
  type: 'good' | 'great' | 'bonus' | 'bad';
  emoji: string;
  points: number;
  duration: number;
  createdAt: number;
  hit: boolean;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  points?: number;
}

// Mole types with their properties
const MOLE_TYPES = {
  good: [
    { emoji: '🐹', points: 10, name: 'Hamster' },
    { emoji: '🐰', points: 10, name: 'Bunny' },
    { emoji: '🐿️', points: 10, name: 'Squirrel' },
  ],
  great: [
    { emoji: '🦊', points: 25, name: 'Fox' },
    { emoji: '🐼', points: 25, name: 'Panda' },
    { emoji: '🦝', points: 25, name: 'Raccoon' },
  ],
  bonus: [
    { emoji: '🌟', points: 50, name: 'Star' },
    { emoji: '💎', points: 50, name: 'Diamond' },
    { emoji: '🎁', points: 50, name: 'Gift' },
  ],
  bad: [
    { emoji: '💀', points: -30, name: 'Skull' },
    { emoji: '👻', points: -20, name: 'Ghost' },
    { emoji: '💣', points: -25, name: 'Bomb' },
  ],
};

const WhackAStressGame: React.FC<Props> = ({ onComplete, difficulty }) => {
  // Game settings based on difficulty
  const gameDuration = difficulty === 'easy' ? 30 : difficulty === 'hard' ? 45 : 35;
  const spawnInterval = difficulty === 'easy' ? 1200 : difficulty === 'hard' ? 700 : 900;
  const moleDuration = difficulty === 'easy' ? 2000 : difficulty === 'hard' ? 1200 : 1500;
  const badMoleChance = difficulty === 'easy' ? 0.15 : difficulty === 'hard' ? 0.3 : 0.22;
  
  const [stage, setStage] = useState<'idle' | 'countdown' | 'playing' | 'result'>('idle');
  const [countdown, setCountdown] = useState(3);
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [moles, setMoles] = useState<Mole[]>([]);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [hits, setHits] = useState(0);
  const [misses, setMisses] = useState(0);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [shakeHole, setShakeHole] = useState<number>(-1);
  const [lastHitType, setLastHitType] = useState<string>('');
  
  const spawnRef = useRef<NodeJS.Timeout>();
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const moleIdRef = useRef(0);
  const holes = 9; // 3x3 grid

  // Countdown effect
  useEffect(() => {
    if (stage !== 'countdown') return;
    if (countdown <= 0) {
      setStage('playing');
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, countdown]);

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
      if (gameTimerRef.current) clearInterval(gameTimerRef.current);
    };
  }, [stage]);

  // Spawn moles
  const spawnMole = useCallback(() => {
    // Find available holes
    const occupiedHoles = moles.filter(m => !m.hit).map(m => m.holeIndex);
    const availableHoles = Array.from({ length: holes }).map((_, i) => i).filter(h => !occupiedHoles.includes(h));
    
    if (availableHoles.length === 0) return;
    
    const holeIndex = availableHoles[Math.floor(Math.random() * availableHoles.length)];
    
    // Determine mole type
    const rand = Math.random();
    let type: 'good' | 'great' | 'bonus' | 'bad';
    if (rand < badMoleChance) {
      type = 'bad';
    } else if (rand < badMoleChance + 0.1) {
      type = 'bonus';
    } else if (rand < badMoleChance + 0.3) {
      type = 'great';
    } else {
      type = 'good';
    }
    
    const typeOptions = MOLE_TYPES[type];
    const moleData = typeOptions[Math.floor(Math.random() * typeOptions.length)];
    
    const newMole: Mole = {
      id: moleIdRef.current++,
      holeIndex,
      type,
      emoji: moleData.emoji,
      points: moleData.points,
      duration: moleDuration + (type === 'bonus' ? -300 : type === 'bad' ? 200 : 0),
      createdAt: Date.now(),
      hit: false,
    };
    
    setMoles(prev => [...prev, newMole]);
    
    // Auto-remove mole after duration
    setTimeout(() => {
      setMoles(prev => {
        const mole = prev.find(m => m.id === newMole.id);
        if (mole && !mole.hit && mole.type !== 'bad') {
          setMisses(m => m + 1);
          setCombo(0);
        }
        return prev.filter(m => m.id !== newMole.id);
      });
    }, newMole.duration);
  }, [moles, moleDuration, badMoleChance]);

  // Spawn moles at intervals
  useEffect(() => {
    if (stage !== 'playing') return;

    spawnRef.current = setInterval(spawnMole, spawnInterval);
    // Spawn first mole immediately
    spawnMole();
    
    return () => {
      if (spawnRef.current) clearInterval(spawnRef.current);
    };
  }, [stage, spawnMole, spawnInterval]);

  const spawnParticle = (holeIndex: number, emoji: string, points?: number) => {
    const col = holeIndex % 3;
    const row = Math.floor(holeIndex / 3);
    const x = (col + 0.5) * 33.33;
    const y = (row + 0.5) * 33.33;
    
    const newParticles = [
      { id: Date.now(), x, y, emoji, points },
      ...Array.from({ length: 5 }).map((_, i) => ({
        id: Date.now() + i + 1,
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        emoji: ['✨', '💫', '⭐'][Math.floor(Math.random() * 3)],
      })),
    ];
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 800);
  };

  const handleHoleClick = (holeIndex: number) => {
    if (stage !== 'playing') return;
    
    const mole = moles.find(m => m.holeIndex === holeIndex && !m.hit);
    
    if (!mole) {
      // Clicked empty hole
      setShakeHole(holeIndex);
      setTimeout(() => setShakeHole(-1), 300);
      return;
    }
    
    // Hit mole!
    setMoles(prev => prev.map(m => m.id === mole.id ? { ...m, hit: true } : m));
    
    if (mole.type === 'bad') {
      // Hit bad mole - lose points and combo
      const newCombo = 0;
      setCombo(newCombo);
      setScore(s => Math.max(0, s + mole.points));
      setShakeHole(holeIndex);
      setTimeout(() => setShakeHole(-1), 300);
      setLastHitType('bad');
      spawnParticle(holeIndex, '💥', mole.points);
    } else {
      // Hit good mole
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(m => Math.max(m, newCombo));
      setHits(h => h + 1);
      
      const comboMultiplier = 1 + Math.floor(newCombo / 5) * 0.2;
      const points = Math.round(mole.points * comboMultiplier);
      setScore(s => s + points);
      
      setLastHitType(mole.type);
      spawnParticle(holeIndex, mole.emoji, points);
    }
    
    // Remove mole after short delay
    setTimeout(() => {
      setMoles(prev => prev.filter(m => m.id !== mole.id));
    }, 150);
  };

  const startGame = () => {
    setStage('countdown');
    setCountdown(3);
    setTimeLeft(gameDuration);
    setMoles([]);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setHits(0);
    setMisses(0);
    moleIdRef.current = 0;
  };

  const getRank = () => {
    if (score >= 800) return { rank: 'S', title: 'WHACK MASTER!', color: 'text-yellow-400', bg: 'from-yellow-500 to-amber-600' };
    if (score >= 500) return { rank: 'A', title: 'AMAZING!', color: 'text-purple-400', bg: 'from-purple-500 to-pink-600' };
    if (score >= 300) return { rank: 'B', title: 'GREAT!', color: 'text-blue-400', bg: 'from-blue-500 to-cyan-600' };
    if (score >= 150) return { rank: 'C', title: 'GOOD!', color: 'text-emerald-400', bg: 'from-emerald-500 to-teal-600' };
    return { rank: 'D', title: 'TRY AGAIN', color: 'text-slate-400', bg: 'from-slate-500 to-slate-600' };
  };

  const accuracy = hits + misses > 0 ? Math.round((hits / (hits + misses)) * 100) : 0;
  const rank = getRank();

  // Calculate stress score (for compatibility with assessment)
  const stressScore = Math.max(1, Math.min(10, (accuracy / 10) * (1 + maxCombo * 0.1)));

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Target className="text-orange-500" size={32} />
          <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 bg-clip-text text-transparent">
            WHACK-A-STRESS
          </h2>
          <Zap className="text-yellow-500" size={28} />
        </div>
        <p className="text-sm text-slate-500">Tap the cute critters! Avoid the skulls! 💀</p>
      </div>

      {/* Stats Bar */}
      {stage !== 'idle' && stage !== 'countdown' && (
        <div className="flex items-center justify-between w-full max-w-sm bg-gradient-to-r from-orange-50 to-amber-50 rounded-2xl px-4 py-3 shadow-inner">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">TIME</div>
            <div className={`text-xl font-black ${timeLeft <= 10 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}>{timeLeft}s</div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">SCORE</div>
            <div className="text-xl font-black bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              {score.toLocaleString()}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">COMBO</div>
            <div className={`text-xl font-black ${combo >= 10 ? 'text-red-500' : combo >= 5 ? 'text-orange-500' : 'text-slate-800'}`}>
              {combo}x{combo >= 10 && <span className="ml-1">🔥</span>}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">HITS</div>
            <div className="text-xl font-black text-emerald-500">{hits}</div>
          </div>
        </div>
      )}

      {/* Game Area */}
      <div className="relative w-full max-w-sm aspect-square rounded-3xl overflow-hidden shadow-2xl bg-gradient-to-br from-green-400 via-emerald-500 to-teal-600">
        {/* Grass pattern */}
        <div className="absolute inset-0 opacity-30">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute text-2xl"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
              }}
            >
              🌿
            </div>
          ))}
        </div>

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute pointer-events-none z-50 animate-float-up"
            style={{ left: `${p.x}%`, top: `${p.y}%`, transform: 'translate(-50%, -50%)' }}
          >
            <span className="text-3xl">{p.emoji}</span>
            {p.points && (
              <div className={`absolute -top-6 left-1/2 -translate-x-1/2 text-lg font-black ${p.points > 0 ? 'text-yellow-300' : 'text-red-500'}`}>
                {p.points > 0 ? '+' : ''}{p.points}
              </div>
            )}
          </div>
        ))}

        {/* Combo indicator */}
        {combo >= 5 && stage === 'playing' && (
          <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30">
            <div className={`px-4 py-2 rounded-full font-black text-sm animate-bounce ${
              combo >= 15 ? 'bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-lg shadow-red-500/50' :
              combo >= 10 ? 'bg-gradient-to-r from-orange-400 to-amber-500 text-white' :
              'bg-gradient-to-r from-yellow-400 to-amber-400 text-white'
            }`}>
              🔥 {combo}x COMBO! 🔥
            </div>
          </div>
        )}

        {/* Idle State */}
        {stage === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 z-20 bg-black/30 backdrop-blur-sm">
            <div className="text-center space-y-4">
              <div className="relative inline-block">
                <div className="text-8xl animate-bounce">🐹</div>
                <Sparkles size={32} className="absolute -top-2 -right-2 text-yellow-300 animate-pulse" />
              </div>
              <div className="space-y-1">
                <p className="text-2xl font-black text-white drop-shadow-lg">Ready to Whack?</p>
                <p className="text-sm text-white/80">Tap critters for points, avoid skulls!</p>
              </div>
              <div className="flex justify-center gap-4 text-sm text-white/70">
                <span>🐹 +10</span>
                <span>🦊 +25</span>
                <span>🌟 +50</span>
                <span>💀 -30</span>
              </div>
            </div>
            <button 
              onClick={startGame}
              className="bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-red-500/40 hover:scale-110 transition-all flex items-center gap-3"
            >
              <Target size={24} /> START WHACKING!
            </button>
          </div>
        )}

        {/* Countdown */}
        {stage === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/40 backdrop-blur-sm">
            <div className="text-center">
              <div className="text-9xl font-black text-white drop-shadow-2xl animate-ping-slow">
                {countdown || '🔨'}
              </div>
              <div className="text-2xl text-white font-bold mt-4">Get Ready!</div>
            </div>
          </div>
        )}

        {/* Game Grid */}
        {(stage === 'playing' || stage === 'result') && (
          <div className="absolute inset-4 grid grid-cols-3 grid-rows-3 gap-3">
            {Array.from({ length: holes }).map((_, holeIndex) => {
              const mole = moles.find(m => m.holeIndex === holeIndex && !m.hit);
              const isShaking = shakeHole === holeIndex;
              
              return (
                <div
                  key={holeIndex}
                  onClick={() => handleHoleClick(holeIndex)}
                  className={`relative rounded-2xl cursor-pointer transition-all duration-100 ${
                    isShaking ? 'animate-shake' : ''
                  } ${
                    mole ? 'scale-100' : 'hover:scale-105'
                  }`}
                >
                  {/* Hole */}
                  <div className="absolute inset-0 bg-gradient-to-br from-amber-900 via-amber-800 to-amber-950 rounded-2xl shadow-inner border-4 border-amber-950/50">
                    <div className="absolute inset-2 bg-gradient-to-br from-amber-950 to-black rounded-xl opacity-80" />
                  </div>
                  
                  {/* Mole */}
                  {mole && (
                    <div className={`absolute inset-0 flex items-center justify-center animate-pop-up ${
                      mole.type === 'bad' ? 'animate-shake-subtle' : ''
                    }`}>
                      <div className={`text-5xl drop-shadow-lg transition-transform hover:scale-110 ${
                        mole.type === 'bonus' ? 'animate-pulse' : ''
                      }`}>
                        {mole.emoji}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Results */}
        {stage === 'result' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-20 bg-black/60 backdrop-blur-sm">
            <div className="text-center space-y-5 animate-in fade-in zoom-in duration-500">
              <div className="relative inline-block">
                <div className={`w-24 h-24 rounded-full bg-gradient-to-br ${rank.bg} flex items-center justify-center shadow-2xl mx-auto`}>
                  <Trophy size={48} className="text-white drop-shadow-lg" />
                </div>
                <div className={`absolute -top-2 -right-2 text-4xl font-black ${rank.color} drop-shadow-lg`}>
                  {rank.rank}
                </div>
              </div>
              <div className={`text-2xl font-black ${rank.color}`}>{rank.title}</div>
              <div className="text-white space-y-2">
                <div className="text-5xl font-black tabular-nums bg-gradient-to-r from-orange-400 to-red-500 bg-clip-text text-transparent">
                  {score.toLocaleString()}
                  <span className="text-xl ml-2 text-white/70">PTS</span>
                </div>
                <div className="text-sm text-white/70 space-x-3">
                  <span>Accuracy: <span className="text-white font-bold">{accuracy}%</span></span>
                  <span>•</span>
                  <span>Max Combo: <span className="text-white font-bold">{maxCombo}x</span></span>
                </div>
              </div>
              
              {/* Stats breakdown */}
              <div className="flex justify-center gap-6 text-sm">
                <div className="text-center">
                  <div className="text-2xl">🎯</div>
                  <div className="text-emerald-400 font-bold">{hits}</div>
                  <div className="text-white/50 text-xs">Hits</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl">💨</div>
                  <div className="text-red-400 font-bold">{misses}</div>
                  <div className="text-white/50 text-xs">Missed</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
      {stage === 'result' && (
        <button 
          onClick={() => onComplete(stressScore)}
          className="w-full max-w-sm bg-gradient-to-r from-orange-500 via-red-500 to-pink-500 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl hover:shadow-2xl hover:shadow-red-500/30 flex items-center justify-center gap-2"
        >
          <Sparkles size={22} /> Continue to Next Game
        </button>
      )}

      {/* Custom CSS */}
      <style>{`
        @keyframes pop-up {
          0% { transform: translateY(100%) scale(0.5); opacity: 0; }
          50% { transform: translateY(-10%) scale(1.1); }
          100% { transform: translateY(0) scale(1); opacity: 1; }
        }
        @keyframes float-up {
          0% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -150%) scale(1.3); }
        }
        @keyframes ping-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        @keyframes shake-subtle {
          0%, 100% { transform: translateX(0); }
          25% { transform: translateX(-2px) rotate(-1deg); }
          75% { transform: translateX(2px) rotate(1deg); }
        }
        .animate-pop-up {
          animation: pop-up 0.3s ease-out forwards;
        }
        .animate-float-up {
          animation: float-up 0.8s ease-out forwards;
        }
        .animate-ping-slow {
          animation: ping-slow 1s ease-in-out infinite;
        }
        .animate-shake-subtle {
          animation: shake-subtle 0.3s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.3s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-5px); }
          40% { transform: translateX(5px); }
          60% { transform: translateX(-3px); }
          80% { transform: translateX(3px); }
        }
      `}</style>
    </div>
  );
};

export default WhackAStressGame;
