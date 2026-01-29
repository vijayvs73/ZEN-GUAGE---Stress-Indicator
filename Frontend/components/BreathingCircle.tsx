
import React, { useState, useEffect, useRef } from 'react';
import { Wind, ChevronLeft, Music } from 'lucide-react';

interface Props {
  onBack: () => void;
}

const SOUNDS = [
  { label: 'Silence', value: null },
  { label: 'Ocean', value: 'https://www.soundjay.com/nature/ocean-waves-1.mp3' },
  { label: 'Forest', value: 'https://www.soundjay.com/nature/forest-wind-1.mp3' }
];

const BreathingCircle: React.FC<Props> = ({ onBack }) => {
  const [phase, setPhase] = useState<'Inhale' | 'Hold' | 'Exhale'>('Inhale');
  const [seconds, setSeconds] = useState(4);
  const [isActive, setIsActive] = useState(false);
  const [selectedSound, setSelectedSound] = useState(SOUNDS[0]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const playPromiseRef = useRef<Promise<void> | null>(null);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (isActive) {
      interval = setInterval(() => {
        setSeconds((prev) => {
          if (prev === 1) {
            if (phase === 'Inhale') {
              setPhase('Hold');
              return 4;
            } else if (phase === 'Hold') {
              setPhase('Exhale');
              return 4;
            } else {
              setPhase('Inhale');
              return 4;
            }
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isActive, phase]);

  useEffect(() => {
    const handleAudio = async () => {
      const audio = audioRef.current;
      if (!audio) return;

      if (isActive && selectedSound.value) {
        try {
          // In some browsers, calling play() returns a promise.
          // We must handle this promise to avoid the "interrupted by load" error.
          playPromiseRef.current = audio.play();
          await playPromiseRef.current;
        } catch (error: any) {
          // AbortError is expected when the source changes or pause() is called before play() finishes.
          if (error.name !== 'AbortError') {
            console.warn("Audio playback issue:", error);
          }
        } finally {
          playPromiseRef.current = null;
        }
      } else {
        // If there's a pending play promise, wait for it before pausing if possible,
        // or just call pause and catch the resulting AbortError in the play() block.
        if (playPromiseRef.current) {
          try {
            await playPromiseRef.current;
          } catch (e) {
            // Ignore errors from the play promise being aborted
          }
        }
        audio.pause();
      }
    };

    handleAudio();
  }, [isActive, selectedSound.value]);

  const getScale = () => {
    if (!isActive) return 'scale-100';
    if (phase === 'Inhale') return 'scale-150';
    if (phase === 'Hold') return 'scale-150';
    return 'scale-100';
  };

  return (
    <div className="max-w-2xl mx-auto py-12 px-6 text-center space-y-12 animate-in fade-in duration-500">
      {selectedSound.value && (
        <audio 
          ref={audioRef} 
          src={selectedSound.value} 
          loop 
          preload="auto"
        />
      )}
      
      <div className="space-y-4">
        <button 
          onClick={onBack}
          className="flex items-center gap-1 text-sm font-bold text-indigo-600 mb-6 hover:gap-2 transition-all mx-auto"
        >
          <ChevronLeft size={16} /> Back to Dashboard
        </button>
        <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Box Breathing</h2>
        <p className="text-slate-500 max-w-sm mx-auto">Reduce cortisol levels instantly with a simple 4-4-4 rhythm.</p>
      </div>

      <div className="relative h-80 flex items-center justify-center">
        <div className={`absolute w-64 h-64 rounded-full bg-indigo-100/50 transition-all duration-[4000ms] ease-in-out ${getScale()}`} />
        <div className={`relative w-48 h-48 rounded-full bg-indigo-600 flex flex-col items-center justify-center text-white shadow-2xl transition-all duration-[4000ms] ease-in-out ${getScale()}`}>
          <Wind size={32} className="mb-2 opacity-80" />
          <span className="text-xl font-bold">{isActive ? phase : 'Ready'}</span>
          <span className="text-4xl font-black tabular-nums">{seconds}</span>
        </div>
      </div>

      <div className="space-y-8">
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-2">
            {!isActive ? (
              <button 
                onClick={() => setIsActive(true)}
                className="bg-indigo-600 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 shadow-xl shadow-indigo-200 transition-all active:scale-95"
              >
                Start Session
              </button>
            ) : (
              <button 
                onClick={() => { setIsActive(false); setSeconds(4); setPhase('Inhale'); }}
                className="bg-slate-900 text-white px-10 py-4 rounded-2xl font-bold text-lg hover:bg-slate-800 transition-all active:scale-95"
              >
                Finish Early
              </button>
            )}
          </div>

          <div className="flex items-center gap-4">
            <Music size={16} className="text-slate-400" />
            <div className="flex bg-slate-100 p-1 rounded-xl">
              {SOUNDS.map((s) => (
                <button
                  key={s.label}
                  onClick={() => setSelectedSound(s)}
                  className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                    selectedSound.label === s.label ? 'bg-white text-indigo-600 shadow-sm' : 'text-slate-500'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
          {['Inhale', 'Hold', 'Exhale'].map((p) => (
            <div key={p} className={`p-4 rounded-xl border transition-all ${
              phase === p && isActive ? 'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-sm' : 'bg-white border-slate-100 text-slate-400'
            }`}>
              <span className="text-[10px] font-bold uppercase tracking-widest">{p}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BreathingCircle;
