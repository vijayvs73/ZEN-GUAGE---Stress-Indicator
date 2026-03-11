
import React, { useState, useEffect, useRef } from 'react';
import { Brain, Sparkles, Star, Zap, Heart, Moon, Sun, Crown, Flame, Gem, Music, Trophy, Rocket, Target } from 'lucide-react';
import { GameDifficulty } from '../types';

interface Props {
  onComplete: (score: number) => void;
  difficulty: GameDifficulty;
}

interface Particle {
  id: number;
  x: number;
  y: number;
  emoji: string;
  scale: number;
}

// Colorful card designs
const CARD_THEMES = [
  { icon: Star, color: 'from-yellow-400 to-amber-500', glow: 'shadow-amber-400/50', emoji: '⭐' },
  { icon: Heart, color: 'from-pink-400 to-rose-500', glow: 'shadow-rose-400/50', emoji: '💖' },
  { icon: Zap, color: 'from-blue-400 to-indigo-500', glow: 'shadow-indigo-400/50', emoji: '⚡' },
  { icon: Flame, color: 'from-orange-400 to-red-500', glow: 'shadow-red-400/50', emoji: '🔥' },
  { icon: Gem, color: 'from-purple-400 to-pink-500', glow: 'shadow-pink-400/50', emoji: '💎' },
  { icon: Moon, color: 'from-indigo-400 to-purple-500', glow: 'shadow-purple-400/50', emoji: '🌙' },
  { icon: Sun, color: 'from-amber-400 to-yellow-500', glow: 'shadow-yellow-400/50', emoji: '☀️' },
  { icon: Music, color: 'from-teal-400 to-cyan-500', glow: 'shadow-cyan-400/50', emoji: '🎵' },
  { icon: Rocket, color: 'from-violet-400 to-fuchsia-500', glow: 'shadow-fuchsia-400/50', emoji: '🚀' },
];

const MemoryGame: React.FC<Props> = ({ onComplete, difficulty }) => {
  const [pattern, setPattern] = useState<number[]>([]);
  const [userSequence, setUserSequence] = useState<number[]>([]);
  const [stage, setStage] = useState<'idle' | 'countdown' | 'showing' | 'playing' | 'result'>('idle');
  const [level, setLevel] = useState(1);
  const [currentHighlight, setCurrentHighlight] = useState<number>(-1);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [maxCombo, setMaxCombo] = useState(0);
  const [mistakes, setMistakes] = useState(0);
  const [showingIndex, setShowingIndex] = useState(-1);
  const [cardAssignments, setCardAssignments] = useState<number[]>([]);
  const [particles, setParticles] = useState<Particle[]>([]);
  const [countdown, setCountdown] = useState(3);
  const [feedback, setFeedback] = useState<{ type: 'correct' | 'wrong' | 'combo'; message: string } | null>(null);
  const [shakeCard, setShakeCard] = useState<number>(-1);
  
  const containerRef = useRef<HTMLDivElement>(null);

  const difficultyConfig = {
    easy: { baseLen: 3, maxLevel: 3, showDuration: 600, gridSize: 9, maxMistakes: 3 },
    medium: { baseLen: 4, maxLevel: 4, showDuration: 450, gridSize: 9, maxMistakes: 2 },
    hard: { baseLen: 5, maxLevel: 5, showDuration: 350, gridSize: 9, maxMistakes: 1 }
  }[difficulty];

  const generateCardAssignments = () => {
    // Assign random themes to each card position
    return Array.from({ length: difficultyConfig.gridSize }).map(() => 
      Math.floor(Math.random() * CARD_THEMES.length)
    );
  };

  const spawnParticles = (index: number) => {
    const emoji = CARD_THEMES[cardAssignments[index]]?.emoji || '✨';
    const newParticles = Array.from({ length: 8 }).map((_, i) => ({
      id: Date.now() + i,
      x: (index % 3) * 33.33 + 16.67,
      y: Math.floor(index / 3) * 33.33 + 16.67,
      emoji,
      scale: 0.5 + Math.random() * 0.5
    }));
    setParticles(newParticles);
    setTimeout(() => setParticles([]), 1000);
  };

  const startGame = () => {
    setStage('countdown');
    setCountdown(3);
    setScore(0);
    setCombo(0);
    setMaxCombo(0);
    setMistakes(0);
    setLevel(1);
  };

  // Countdown effect
  useEffect(() => {
    if (stage !== 'countdown') return;
    if (countdown <= 0) {
      startRound();
      return;
    }
    const timer = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(timer);
  }, [stage, countdown]);

  const startRound = () => {
    const len = difficultyConfig.baseLen + level - 1;
    const newPattern: number[] = [];
    for (let i = 0; i < len; i++) {
      newPattern.push(Math.floor(Math.random() * difficultyConfig.gridSize));
    }
    setPattern(newPattern);
    setUserSequence([]);
    setCardAssignments(generateCardAssignments());
    setStage('showing');
    setShowingIndex(-1);
  };

  // Animate pattern display
  useEffect(() => {
    if (stage !== 'showing') return;
    
    let index = 0;
    const showNext = () => {
      if (index < pattern.length) {
        setShowingIndex(index);
        setCurrentHighlight(pattern[index]);
        setTimeout(() => setCurrentHighlight(-1), difficultyConfig.showDuration * 0.8);
        index++;
        setTimeout(showNext, difficultyConfig.showDuration + 150);
      } else {
        setTimeout(() => {
          setStage('playing');
          setShowingIndex(-1);
        }, 300);
      }
    };
    
    setTimeout(showNext, 500);
  }, [stage, pattern, difficultyConfig.showDuration]);

  const handleCardClick = (index: number) => {
    if (stage !== 'playing') return;
    
    const nextUserSeq = [...userSequence, index];
    setUserSequence(nextUserSeq);
    
    // Flash the clicked card
    setCurrentHighlight(index);
    setTimeout(() => setCurrentHighlight(-1), 150);
    
    const currentIndex = nextUserSeq.length - 1;
    const isCorrect = index === pattern[currentIndex];
    
    if (!isCorrect) {
      // Wrong!
      setMistakes(m => m + 1);
      setCombo(0);
      setShakeCard(index);
      setTimeout(() => setShakeCard(-1), 500);
      setFeedback({ type: 'wrong', message: 'WRONG! ❌' });
      setTimeout(() => setFeedback(null), 800);
      
      if (mistakes + 1 >= difficultyConfig.maxMistakes) {
        setTimeout(() => setStage('result'), 800);
      }
    } else {
      // Correct!
      const newCombo = combo + 1;
      setCombo(newCombo);
      setMaxCombo(m => Math.max(m, newCombo));
      
      const basePoints = 100;
      const comboBonus = Math.floor(newCombo * 25);
      const levelBonus = level * 50;
      const points = basePoints + comboBonus + levelBonus;
      setScore(s => s + points);
      
      spawnParticles(index);
      
      if (newCombo >= 5) {
        setFeedback({ type: 'combo', message: `🔥 ${newCombo}x COMBO! +${points}` });
      } else if (newCombo >= 3) {
        setFeedback({ type: 'combo', message: `⚡ ${newCombo}x! +${points}` });
      } else {
        setFeedback({ type: 'correct', message: `+${points}` });
      }
      setTimeout(() => setFeedback(null), 600);
      
      // Check if sequence complete
      if (nextUserSeq.length === pattern.length) {
        // Level complete!
        if (level < difficultyConfig.maxLevel) {
          setTimeout(() => {
            setLevel(l => l + 1);
            startRound();
          }, 1000);
        } else {
          setTimeout(() => setStage('result'), 800);
        }
      }
    }
  };

  const calculateFinalScore = () => {
    const accuracyBonus = Math.round((1 - mistakes / (mistakes + userSequence.length || 1)) * 500);
    const comboBonus = maxCombo * 100;
    const levelBonus = level * 200;
    return score + accuracyBonus + comboBonus + levelBonus;
  };

  const getRank = () => {
    const finalScore = calculateFinalScore();
    if (finalScore > 3000) return { rank: 'S', title: 'GENIUS!', color: 'text-yellow-400', bg: 'from-yellow-500 to-amber-600' };
    if (finalScore > 2000) return { rank: 'A', title: 'BRILLIANT!', color: 'text-purple-400', bg: 'from-purple-500 to-pink-600' };
    if (finalScore > 1200) return { rank: 'B', title: 'GREAT!', color: 'text-blue-400', bg: 'from-blue-500 to-indigo-600' };
    if (finalScore > 600) return { rank: 'C', title: 'GOOD', color: 'text-emerald-400', bg: 'from-emerald-500 to-teal-600' };
    return { rank: 'D', title: 'TRY AGAIN', color: 'text-slate-400', bg: 'from-slate-500 to-slate-600' };
  };

  const rank = getRank();

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Header */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-3">
          <Brain className="text-indigo-500" size={32} />
          <h2 className="text-2xl font-black tracking-tight bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 bg-clip-text text-transparent">
            MEMORY MASTER
          </h2>
          <Sparkles className="text-pink-500" size={28} />
        </div>
        <p className="text-sm text-slate-500">Watch the sequence, then repeat it perfectly!</p>
      </div>

      {/* Stats Bar */}
      {stage !== 'idle' && (
        <div className="flex items-center justify-between w-full max-w-sm bg-gradient-to-r from-slate-100 to-slate-50 rounded-2xl px-5 py-3 shadow-inner">
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">LEVEL</div>
            <div className="text-xl font-black text-slate-800">{level}<span className="text-slate-400 text-sm">/{difficultyConfig.maxLevel}</span></div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">SCORE</div>
            <div className="text-xl font-black bg-gradient-to-r from-indigo-500 to-purple-600 bg-clip-text text-transparent">
              {score.toLocaleString()}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">COMBO</div>
            <div className={`text-xl font-black ${combo >= 5 ? 'text-red-500' : combo >= 3 ? 'text-orange-500' : 'text-slate-800'}`}>
              {combo}x{combo >= 5 && <span className="ml-1">🔥</span>}
            </div>
          </div>
          <div className="w-px h-8 bg-slate-200" />
          <div className="text-center">
            <div className="text-[10px] text-slate-400 font-bold tracking-wider">LIVES</div>
            <div className="text-xl font-black text-rose-500">
              {'❤️'.repeat(Math.max(0, difficultyConfig.maxMistakes - mistakes))}
              {'🖤'.repeat(Math.min(mistakes, difficultyConfig.maxMistakes))}
            </div>
          </div>
        </div>
      )}

      {/* Game Area */}
      <div 
        ref={containerRef}
        className="w-full max-w-sm aspect-square rounded-3xl relative overflow-hidden bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-4"
      >
        {/* Animated background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-30">
          {Array.from({ length: 20 }).map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 bg-white rounded-full"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `float ${5 + Math.random() * 5}s ease-in-out infinite`,
                animationDelay: `${Math.random() * 5}s`,
              }}
            />
          ))}
        </div>

        {/* Particles */}
        {particles.map(p => (
          <div
            key={p.id}
            className="absolute text-2xl pointer-events-none animate-particle z-50"
            style={{
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: `scale(${p.scale})`,
            }}
          >
            {p.emoji}
          </div>
        ))}

        {/* Feedback */}
        {feedback && (
          <div className={`absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full font-black text-sm animate-bounce ${
            feedback.type === 'wrong' ? 'bg-red-500 text-white' :
            feedback.type === 'combo' ? 'bg-gradient-to-r from-amber-400 to-orange-500 text-white' :
            'bg-gradient-to-r from-emerald-400 to-teal-500 text-white'
          }`}>
            {feedback.message}
          </div>
        )}

        {/* Idle State */}
        {stage === 'idle' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center space-y-6">
              <div className="relative inline-block">
                <Brain size={80} className="text-indigo-400 mx-auto" />
                <Sparkles size={28} className="absolute -top-2 -right-2 text-pink-400 animate-pulse" />
              </div>
              <button 
                onClick={startGame}
                className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-2xl shadow-purple-500/40 hover:scale-110 transition-all flex items-center gap-3"
              >
                <Rocket size={24} /> START GAME
              </button>
            </div>
          </div>
        )}

        {/* Countdown */}
        {stage === 'countdown' && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-8xl font-black text-white animate-ping-slow">
                {countdown || 'GO!'}
              </div>
              <div className="text-xl text-indigo-300 mt-4">Get Ready!</div>
            </div>
          </div>
        )}

        {/* Game Grid */}
        {(stage === 'showing' || stage === 'playing') && (
          <div className="grid grid-cols-3 gap-3 h-full relative z-10">
            {Array.from({ length: 9 }).map((_, i) => {
              const isHighlighted = currentHighlight === i;
              const isCompleted = stage === 'playing' && userSequence.includes(i) && userSequence.indexOf(i) < userSequence.length;
              const theme = CARD_THEMES[cardAssignments[i] || 0];
              const Icon = theme.icon;
              const isShaking = shakeCard === i;
              
              return (
                <div
                  key={i}
                  onClick={() => handleCardClick(i)}
                  className={`rounded-2xl flex items-center justify-center transition-all duration-200 cursor-pointer relative overflow-hidden ${
                    isShaking ? 'animate-shake' :
                    isHighlighted ? `bg-gradient-to-br ${theme.color} scale-110 shadow-2xl ${theme.glow}` :
                    isCompleted ? `bg-gradient-to-br ${theme.color} opacity-50` :
                    stage === 'playing' ? 'bg-slate-800/80 hover:bg-slate-700/80 hover:scale-105 border border-slate-700' :
                    'bg-slate-800/50 border border-slate-700/50'
                  }`}
                >
                  {isHighlighted && (
                    <>
                      <Icon size={36} className="text-white drop-shadow-lg z-10" />
                      <div className="absolute inset-0 bg-white/20 animate-pulse" />
                    </>
                  )}
                  {!isHighlighted && stage === 'playing' && !isCompleted && (
                    <Target size={24} className="text-slate-600" />
                  )}
                  {isCompleted && !isHighlighted && (
                    <Icon size={28} className="text-white/70" />
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Sequence Progress */}
        {stage === 'playing' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {pattern.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-3 h-3 rounded-full transition-all ${
                  idx < userSequence.length 
                    ? userSequence[idx] === pattern[idx] 
                      ? 'bg-emerald-400 shadow-lg shadow-emerald-400/50' 
                      : 'bg-red-400'
                    : 'bg-slate-600'
                }`} 
              />
            ))}
          </div>
        )}

        {/* Showing Progress */}
        {stage === 'showing' && (
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5 z-20">
            {pattern.map((_, idx) => (
              <div 
                key={idx} 
                className={`w-3 h-3 rounded-full transition-all ${
                  idx <= showingIndex ? 'bg-indigo-400 shadow-lg shadow-indigo-400/50' : 'bg-slate-600'
                }`} 
              />
            ))}
          </div>
        )}

        {/* Results */}
        {stage === 'result' && (
          <div className="absolute inset-0 flex items-center justify-center">
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
                <div className="text-4xl font-black tabular-nums bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                  {calculateFinalScore().toLocaleString()}
                  <span className="text-lg ml-2 text-white/70">PTS</span>
                </div>
                <div className="text-sm text-slate-400 space-x-3">
                  <span>Level: <span className="text-white font-bold">{level}</span></span>
                  <span>•</span>
                  <span>Max Combo: <span className="text-white font-bold">{maxCombo}x</span></span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Continue Button */}
      {stage === 'result' && (
        <button 
          onClick={() => onComplete(calculateFinalScore() > 2000 ? 95 : calculateFinalScore() > 1000 ? 75 : calculateFinalScore() > 500 ? 55 : 35)}
          className="w-full max-w-sm bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 text-white px-8 py-4 rounded-2xl font-bold text-lg hover:scale-105 transition-all shadow-xl hover:shadow-2xl hover:shadow-purple-500/30 flex items-center justify-center gap-2"
        >
          <Sparkles size={22} /> Continue to Next Game
        </button>
      )}

      {/* Custom CSS */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) rotate(0deg); opacity: 0.3; }
          50% { transform: translateY(-20px) rotate(180deg); opacity: 0.8; }
        }
        @keyframes particle {
          0% { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(1.5) translateY(-50px); }
        }
        @keyframes ping-slow {
          0%, 100% { transform: scale(1); opacity: 1; }
          50% { transform: scale(1.1); opacity: 0.8; }
        }
        .animate-particle {
          animation: particle 1s ease-out forwards;
        }
        .animate-ping-slow {
          animation: ping-slow 1s ease-in-out infinite;
        }
        .animate-shake {
          animation: shake 0.5s ease-in-out;
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-8px) rotate(-2deg); }
          40% { transform: translateX(8px) rotate(2deg); }
          60% { transform: translateX(-6px) rotate(-1deg); }
          80% { transform: translateX(6px) rotate(1deg); }
        }
      `}</style>
    </div>
  );
};

export default MemoryGame;
