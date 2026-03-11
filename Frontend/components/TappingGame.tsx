
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { CloudRain, Droplets, Award, Activity, Music, Timer, TrendingUp, Heart } from 'lucide-react';
import { GameDifficulty } from '../types';

interface Props {
  onComplete: (tapsPerSec: number) => void;
  difficulty: GameDifficulty;
}

interface Raindrop {
  id: number;
  lane: number;
  y: number;
  speed: number;
  hit: boolean;
  missed: boolean;
  createdAt: number;
}

interface TapResult {
  timing: number; // ms difference from perfect
  hit: boolean;
  timestamp: number;
}

const RainRhythmGame: React.FC<Props> = ({ onComplete, difficulty }) => {
  // Game settings based on difficulty
  const gameDuration = difficulty === 'easy' ? 30 : difficulty === 'hard' ? 60 : 45;
  const dropInterval = difficulty === 'easy' ? 1200 : difficulty === 'hard' ? 800 : 1000;
  const dropSpeed = difficulty === 'easy' ? 2 : difficulty === 'hard' ? 3.5 : 2.8;
  const hitZoneY = 85; // Percentage from top where player should tap
  const hitTolerance = difficulty === 'easy' ? 12 : difficulty === 'hard' ? 6 : 8; // Percentage tolerance
  
  const [stage, setStage] = useState<'idle' | 'playing' | 'result'>('idle');
  const [raindrops, setRaindrops] = useState<Raindrop[]>([]);
  const [timeLeft, setTimeLeft] = useState(gameDuration);
  const [tapResults, setTapResults] = useState<TapResult[]>([]);
  const [perfectHits, setPerfectHits] = useState(0);
  const [goodHits, setGoodHits] = useState(0);
  const [missedDrops, setMissedDrops] = useState(0);
  const [streak, setStreak] = useState(0);
  const [maxStreak, setMaxStreak] = useState(0);
  const [lastTapTime, setLastTapTime] = useState<number | null>(null);
  const [tapIntervals, setTapIntervals] = useState<number[]>([]);
  const [showFeedback, setShowFeedback] = useState<{ type: 'perfect' | 'good' | 'miss' | 'early' | 'late'; lane: number } | null>(null);
  
  const animationRef = useRef<number>();
  const dropSpawnRef = useRef<NodeJS.Timeout>();
  const gameTimerRef = useRef<NodeJS.Timeout>();
  const lanes = 3; // Number of lanes for raindrops

  // Spawn raindrops at rhythm intervals
  const spawnRaindrop = useCallback(() => {
    const lane = Math.floor(Math.random() * lanes);
    const newDrop: Raindrop = {
      id: Date.now() + Math.random(),
      lane,
      y: -5,
      speed: dropSpeed + (Math.random() * 0.3 - 0.15), // Slight variation
      hit: false,
      missed: false,
      createdAt: Date.now()
    };
    setRaindrops(prev => [...prev, newDrop]);
  }, [dropSpeed]);

  // Animate raindrops falling
  useEffect(() => {
    if (stage !== 'playing') return;

    const animate = () => {
      setRaindrops(prev => {
        return prev.map(drop => {
          if (drop.hit || drop.missed) return drop;
          
          const newY = drop.y + drop.speed * 0.5;
          
          // Check if drop passed the hit zone without being hit
          if (newY > hitZoneY + hitTolerance && !drop.hit) {
            setMissedDrops(m => m + 1);
            setStreak(0);
            return { ...drop, y: newY, missed: true };
          }
          
          return { ...drop, y: newY };
        }).filter(drop => drop.y < 110); // Remove drops that are off screen
      });
      
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [stage, hitTolerance]);

  // Spawn drops at regular intervals
  useEffect(() => {
    if (stage !== 'playing') return;

    dropSpawnRef.current = setInterval(spawnRaindrop, dropInterval);
    
    return () => {
      if (dropSpawnRef.current) {
        clearInterval(dropSpawnRef.current);
      }
    };
  }, [stage, spawnRaindrop, dropInterval]);

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

  const handleLaneTap = (lane: number) => {
    if (stage !== 'playing') return;

    const now = Date.now();
    
    // Track tap intervals for regularity measurement
    if (lastTapTime) {
      setTapIntervals(prev => [...prev, now - lastTapTime]);
    }
    setLastTapTime(now);

    // Find the closest drop in this lane that's near the hit zone
    const dropsInLane = raindrops.filter(d => d.lane === lane && !d.hit && !d.missed);
    
    if (dropsInLane.length === 0) {
      // Tapped with no drop - early tap
      setShowFeedback({ type: 'early', lane });
      setStreak(0);
      setTapResults(prev => [...prev, { timing: -999, hit: false, timestamp: now }]);
      setTimeout(() => setShowFeedback(null), 300);
      return;
    }

    // Find the drop closest to the hit zone
    let closestDrop: Raindrop | null = null;
    let closestDistance = Infinity;
    
    for (const drop of dropsInLane) {
      const distance = Math.abs(drop.y - hitZoneY);
      if (distance < closestDistance) {
        closestDistance = distance;
        closestDrop = drop;
      }
    }

    if (closestDrop && closestDistance <= hitTolerance * 1.5) {
      // Hit!
      const timingError = closestDistance;
      
      setRaindrops(prev => prev.map(d => 
        d.id === closestDrop!.id ? { ...d, hit: true } : d
      ));

      if (timingError <= hitTolerance * 0.4) {
        // Perfect hit
        setPerfectHits(h => h + 1);
        setStreak(s => {
          const newStreak = s + 1;
          setMaxStreak(m => Math.max(m, newStreak));
          return newStreak;
        });
        setShowFeedback({ type: 'perfect', lane });
        setTapResults(prev => [...prev, { timing: timingError, hit: true, timestamp: now }]);
      } else if (timingError <= hitTolerance) {
        // Good hit
        setGoodHits(h => h + 1);
        setStreak(s => {
          const newStreak = s + 1;
          setMaxStreak(m => Math.max(m, newStreak));
          return newStreak;
        });
        setShowFeedback({ type: 'good', lane });
        setTapResults(prev => [...prev, { timing: timingError, hit: true, timestamp: now }]);
      } else {
        // Late/early but still counted
        const isLate = closestDrop.y > hitZoneY;
        setShowFeedback({ type: isLate ? 'late' : 'early', lane });
        setStreak(0);
        setTapResults(prev => [...prev, { timing: timingError, hit: false, timestamp: now }]);
      }
    } else {
      // Miss
      setShowFeedback({ type: 'miss', lane });
      setStreak(0);
      setTapResults(prev => [...prev, { timing: 999, hit: false, timestamp: now }]);
    }

    setTimeout(() => setShowFeedback(null), 300);
  };

  const startGame = () => {
    setStage('playing');
    setRaindrops([]);
    setTimeLeft(gameDuration);
    setTapResults([]);
    setPerfectHits(0);
    setGoodHits(0);
    setMissedDrops(0);
    setStreak(0);
    setMaxStreak(0);
    setLastTapTime(null);
    setTapIntervals([]);
  };

  // Calculate stress indicators
  const calculateStressScore = useCallback(() => {
    const totalDrops = perfectHits + goodHits + missedDrops;
    if (totalDrops === 0) return 5; // Default taps per second

    // 1. Accuracy score (hits vs misses)
    const accuracy = (perfectHits + goodHits) / Math.max(1, totalDrops);
    
    // 2. Timing precision (average timing error)
    const hitResults = tapResults.filter(r => r.hit);
    const avgTimingError = hitResults.length > 0 
      ? hitResults.reduce((sum, r) => sum + r.timing, 0) / hitResults.length 
      : 10;
    const timingScore = Math.max(0, 100 - avgTimingError * 5);
    
    // 3. Rhythm regularity (consistency of tap intervals)
    let rhythmScore = 100;
    if (tapIntervals.length > 2) {
      const avgInterval = tapIntervals.reduce((a, b) => a + b, 0) / tapIntervals.length;
      const variance = tapIntervals.reduce((sum, i) => sum + Math.pow(i - avgInterval, 2), 0) / tapIntervals.length;
      const stdDev = Math.sqrt(variance);
      // Lower std deviation = more regular rhythm = less stress
      rhythmScore = Math.max(0, 100 - (stdDev / 10));
    }

    // Combine scores (lower stress = higher score)
    const combinedScore = (accuracy * 40) + (timingScore * 0.3) + (rhythmScore * 0.3);
    
    // Convert to taps per second scale (maintaining interface compatibility)
    // Higher combined score = better performance = appears as higher taps/sec
    return Math.max(1, Math.min(10, combinedScore / 10));
  }, [perfectHits, goodHits, missedDrops, tapResults, tapIntervals]);

  const totalHits = perfectHits + goodHits;
  const totalDrops = perfectHits + goodHits + missedDrops;
  const accuracyPercent = totalDrops > 0 ? Math.round((totalHits / totalDrops) * 100) : 0;
  const finalScore = calculateStressScore();

  const getLaneColor = (lane: number) => {
    const colors = ['from-cyan-400 to-blue-500', 'from-blue-400 to-indigo-500', 'from-indigo-400 to-purple-500'];
    return colors[lane];
  };

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2">
          <CloudRain className="text-blue-500" size={24} />
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Rain Rhythm</h2>
        </div>
        <p className="text-sm text-slate-500">Tap when raindrops hit the ground!</p>
        {stage === 'playing' && streak >= 5 && (
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-full text-xs font-black uppercase tracking-widest animate-pulse shadow-lg">
            <Music size={14} /> {streak}x Rhythm! 🎵
          </div>
        )}
      </div>

      {/* Game Area */}
      <div className="relative w-full h-80 bg-gradient-to-b from-slate-700 via-slate-800 to-slate-900 rounded-3xl overflow-hidden shadow-2xl border-2 border-slate-600">
        {/* Rain background effect */}
        <div className="absolute inset-0 opacity-20">
          {[...Array(20)].map((_, i) => (
            <div 
              key={i}
              className="absolute w-0.5 h-8 bg-blue-300/30"
              style={{
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                animation: `fall ${2 + Math.random()}s linear infinite`,
                animationDelay: `${Math.random() * 2}s`
              }}
            />
          ))}
        </div>

        {stage === 'idle' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 p-8 z-20 bg-slate-800/80">
            <div className="text-center space-y-3">
              <div className="relative">
                <Droplets size={64} className="mx-auto text-blue-400 animate-bounce" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-bold text-white">Follow the Rhythm</p>
                <p className="text-xs text-slate-400">Tap the lanes when drops reach the bottom</p>
                <p className="text-xs text-slate-500">Stay calm & keep steady timing</p>
              </div>
            </div>
            <button 
              onClick={startGame}
              className="bg-gradient-to-r from-blue-600 to-cyan-600 text-white px-10 py-4 rounded-2xl font-black text-lg shadow-xl hover:shadow-2xl hover:from-blue-700 hover:to-cyan-700 transition-all active:scale-95 flex items-center gap-3"
            >
              <CloudRain size={24} /> Start Rain Rhythm
            </button>
          </div>
        )}

        {stage === 'playing' && (
          <>
            {/* Timer */}
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-4">
              <div className="px-4 py-1.5 bg-white/10 backdrop-blur-sm rounded-full text-sm font-bold text-white flex items-center gap-2">
                <Timer size={16} /> {timeLeft}s
              </div>
              <div className="px-4 py-1.5 bg-emerald-500/80 backdrop-blur-sm rounded-full text-sm font-bold text-white flex items-center gap-2">
                <Heart size={16} /> {totalHits}
              </div>
            </div>

            {/* Lane dividers */}
            <div className="absolute inset-0 flex">
              {[...Array(lanes)].map((_, lane) => (
                <div key={lane} className="flex-1 border-r border-white/10 last:border-r-0" />
              ))}
            </div>

            {/* Hit zone line */}
            <div 
              className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent z-10"
              style={{ top: `${hitZoneY}%` }}
            >
              <div className="absolute inset-0 bg-cyan-400/30 blur-md" />
            </div>

            {/* Raindrops */}
            {raindrops.map(drop => (
              <div
                key={drop.id}
                className={`absolute transition-all duration-75 ${drop.hit ? 'scale-150 opacity-0' : drop.missed ? 'opacity-30' : ''}`}
                style={{
                  left: `${(drop.lane + 0.5) * (100 / lanes)}%`,
                  top: `${drop.y}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <div className={`w-6 h-8 bg-gradient-to-b ${getLaneColor(drop.lane)} rounded-full shadow-lg relative`}
                     style={{ borderRadius: '50% 50% 50% 50% / 30% 30% 70% 70%' }}>
                  <div className="absolute top-1 left-1.5 w-2 h-2 bg-white/50 rounded-full" />
                </div>
              </div>
            ))}

            {/* Tap feedback */}
            {showFeedback && (
              <div 
                className="absolute z-30 pointer-events-none animate-in fade-in zoom-in duration-150"
                style={{
                  left: `${(showFeedback.lane + 0.5) * (100 / lanes)}%`,
                  top: `${hitZoneY - 10}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <span className={`text-xl font-black uppercase tracking-wider ${
                  showFeedback.type === 'perfect' ? 'text-yellow-400' :
                  showFeedback.type === 'good' ? 'text-green-400' :
                  showFeedback.type === 'early' ? 'text-orange-400' :
                  showFeedback.type === 'late' ? 'text-orange-400' :
                  'text-red-400'
                }`}>
                  {showFeedback.type === 'perfect' ? '✨ Perfect!' :
                   showFeedback.type === 'good' ? '👍 Good!' :
                   showFeedback.type === 'early' ? '⚡ Early' :
                   showFeedback.type === 'late' ? '🐢 Late' :
                   '✗ Miss'}
                </span>
              </div>
            )}

            {/* Tap zones */}
            <div className="absolute bottom-0 left-0 right-0 h-20 flex z-10">
              {[...Array(lanes)].map((_, lane) => (
                <button
                  key={lane}
                  onPointerDown={() => handleLaneTap(lane)}
                  className={`flex-1 bg-gradient-to-t from-white/20 to-transparent border-t border-white/20 active:from-white/40 transition-all flex items-center justify-center`}
                >
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-br ${getLaneColor(lane)} opacity-50 flex items-center justify-center`}>
                    <Droplets size={20} className="text-white" />
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {stage === 'result' && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-slate-800/95 to-slate-900/95 backdrop-blur-sm animate-in fade-in zoom-in duration-500 z-20">
            <div className="text-center space-y-4">
              <Award size={56} className={`mx-auto ${accuracyPercent >= 85 ? 'text-yellow-400' : accuracyPercent >= 70 ? 'text-cyan-400' : 'text-slate-400'}`} />
              <div className="space-y-2">
                <p className="text-sm font-bold text-slate-400 uppercase tracking-widest">Rhythm Score</p>
                <p className="text-6xl font-black bg-gradient-to-r from-cyan-400 to-blue-400 bg-clip-text text-transparent tracking-tighter">{accuracyPercent}%</p>
                <p className="text-sm font-bold text-slate-300">
                  {accuracyPercent >= 90 ? '🎵 Perfect Rhythm!' : 
                   accuracyPercent >= 75 ? '🌧️ Great Flow!' : 
                   accuracyPercent >= 60 ? '👍 Good Timing!' : 
                   '💪 Keep Practicing!'}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2 w-full">
        <div className="p-3 bg-gradient-to-br from-yellow-50 to-amber-50 rounded-xl border-2 border-yellow-100 text-center">
          <span className="text-lg">✨</span>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Perfect</p>
          <p className="text-xl font-black text-slate-900">{perfectHits}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-100 text-center">
          <span className="text-lg">👍</span>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Good</p>
          <p className="text-xl font-black text-slate-900">{goodHits}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border-2 border-red-100 text-center">
          <span className="text-lg">💧</span>
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Missed</p>
          <p className="text-xl font-black text-slate-900">{missedDrops}</p>
        </div>
        <div className="p-3 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border-2 border-purple-100 text-center">
          <TrendingUp size={16} className="mx-auto text-purple-500" />
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Max Streak</p>
          <p className="text-xl font-black text-slate-900">{maxStreak}</p>
        </div>
      </div>

      {stage === 'result' && (
        <button 
          onClick={() => onComplete(finalScore)}
          className="w-full bg-gradient-to-r from-blue-600 to-cyan-600 text-white py-5 rounded-2xl font-black text-lg hover:from-blue-700 hover:to-cyan-700 transition-all shadow-lg hover:shadow-xl active:scale-95"
        >
          Continue Assessment →
        </button>
      )}

      {/* CSS for rain animation */}
      <style>{`
        @keyframes fall {
          0% { transform: translateY(-100%); opacity: 0; }
          10% { opacity: 1; }
          90% { opacity: 1; }
          100% { transform: translateY(400%); opacity: 0; }
        }
      `}</style>
    </div>
  );
};

export default RainRhythmGame;
