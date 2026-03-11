
import React, { useMemo } from 'react';
import { StressAnalysis, GameResult } from '../types';
import {
  RefreshCcw,
  MapPin,
  TrendingUp,
  AlertCircle,
  ExternalLink,
  Zap,
  Brain,
  Target,
  Crosshair,
  Sparkles,
  Info,
  Clock,
  Wind,
  Dumbbell,
  Coffee
} from 'lucide-react';
import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis
} from 'recharts';

interface Props {
  data: StressAnalysis;
  results: GameResult;
  onRestart: () => void;
}

const ResultsView: React.FC<Props> = ({ data, results, onRestart }) => {
  const chartData = [{ value: data.stressLevel, fill: data.stressLevel > 70 ? '#ef4444' : data.stressLevel > 40 ? '#f59e0b' : '#10b981' }];

  const smartInsights = useMemo(() => {
    const insights: string[] = [];

    const seedFrom = JSON.stringify({
      r: results.reactionTime,
      a: results.accuracy,
      m: results.memoryScore,
      t: results.tappingSpeed,
      s: data.stressLevel
    });
    const seed = seedFrom.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
    const pick = (list: string[], count: number) => {
      const picked: string[] = [];
      for (let i = 0; i < count && list.length > 0; i++) {
        const idx = (seed + i * 7) % list.length;
        picked.push(list[idx]);
        list.splice(idx, 1);
      }
      return picked;
    };

    // Reaction insights
    if (results.reactionTime) {
      if (results.reactionTime < 230) {
        insights.push(...pick([
          "Reflexes are exceptional—your alertness is high.",
          "Lightning-fast reaction time suggests strong focus.",
          "Quick responses indicate high cognitive readiness."
        ], 1));
      } else if (results.reactionTime > 300) {
        insights.push(...pick([
          "Reaction latency suggests elevated mental load.",
          "Slower responses can reflect fatigue or distraction.",
          "Your reaction pace is subdued—possible cognitive strain."
        ], 1));
      } else {
        insights.push(...pick([
          "Reaction speed is steady and within a healthy range.",
          "Your reflexes are consistent—good baseline focus.",
          "Balanced reaction time indicates stable alertness."
        ], 1));
      }
    }

    // Accuracy insights
    if (results.accuracy) {
      if (results.accuracy >= 90) {
        insights.push(...pick([
          "Precision is excellent—errors are minimal.",
          "High accuracy suggests careful, controlled focus.",
          "Your aim is sharp—attention is well regulated."
        ], 1));
      } else if (results.accuracy < 70) {
        insights.push(...pick([
          "Accuracy dipped—possible haste or divided attention.",
          "Lower precision suggests attention may be fragmented.",
          "Misses are elevated—consider slowing your pace."
        ], 1));
      } else {
        insights.push(...pick([
          "Accuracy is solid with room to sharpen focus.",
          "Precision is stable—small improvements could help.",
          "Your accuracy is steady—attention is fairly consistent."
        ], 1));
      }
    }

    // Memory insights
    if (results.memoryScore !== undefined && results.memoryScore !== null) {
      if (results.memoryScore >= 80) {
        insights.push(...pick([
          "Memory performance is strong—pattern recall is sharp.",
          "Great memory retention suggests good working memory.",
          "Your recall is excellent—mental tracking is solid."
        ], 1));
      } else if (results.memoryScore < 60) {
        insights.push(...pick([
          "Memory recall is lower—working memory may be taxed.",
          "Pattern retention dropped—mental fatigue possible.",
          "Short-term recall looks strained—try a reset break."
        ], 1));
      }
    }

    // Tapping insights
    if (results.tappingSpeed) {
      if (results.tappingSpeed >= 7) {
        insights.push(...pick([
          "Motor speed is high—strong sustained focus.",
          "Fast tapping suggests good stamina and energy.",
          "Your pace is strong—focus endurance is solid."
        ], 1));
      } else if (results.tappingSpeed < 4.5) {
        insights.push(...pick([
          "Tap rate is low—possible mental or physical fatigue.",
          "Lower tapping speed can signal reduced endurance.",
          "Pace slowed—consider a short movement break."
        ], 1));
      }
    }

    // Cross-metric insight
    if (results.reactionTime && results.accuracy) {
      if (results.reactionTime < 240 && results.accuracy < 80) {
        insights.push(...pick([
          "Speed is high but precision dipped—signs of overdrive.",
          "Fast responses with lower accuracy suggest hyper-arousal.",
          "Quick reactions but more misses—slow slightly for balance."
        ], 1));
      }
    }

    return insights.slice(0, 3);
  }, [results, data.stressLevel]);

  const recoverySuggestions = useMemo(() => {
    if (data.suggestions && data.suggestions.length > 0) return data.suggestions;

    const suggestionPools = {
      breathing: [
        { title: '4-7-8 Breathing', description: 'Inhale 4s, hold 7s, exhale 8s for 4 cycles.', duration: '4 min', intensity: 'high' },
        { title: 'Box Breathing', description: 'Inhale 4s, hold 4s, exhale 4s, hold 4s.', duration: '3 min', intensity: 'medium' },
        { title: 'Triangle Breathing', description: 'Inhale 3s, hold 3s, exhale 3s. Repeat 5 times.', duration: '2 min', intensity: 'low' },
        { title: 'Belly Breathing', description: 'Deep diaphragmatic breaths, hand on belly.', duration: '3 min', intensity: 'medium' },
        { title: 'Alternate Nostril', description: 'Close right nostril, inhale left. Switch sides.', duration: '4 min', intensity: 'high' },
        { title: 'Calm Maintenance', description: 'Slow breaths for 60 seconds to keep balance.', duration: '1 min', intensity: 'low' }
      ],
      physical: [
        { title: 'Body Reset Walk', description: 'Take a 10-minute walk without your phone.', duration: '10 min', intensity: 'high' },
        { title: 'Desk Yoga Flow', description: 'Seated spinal twist, forward fold, neck circles.', duration: '5 min', intensity: 'medium' },
        { title: 'Progressive Relaxation', description: 'Tense and release each muscle group slowly.', duration: '8 min', intensity: 'high' },
        { title: 'Posture Reset', description: 'Roll shoulders back, unclench jaw, relax hands.', duration: '2 min', intensity: 'low' },
        { title: 'Mini Stretch', description: 'Neck rolls, shoulder stretch, wrist release.', duration: '2 min', intensity: 'low' },
        { title: 'Eye Rest Exercise', description: '20-20-20 rule: Look 20ft away for 20s every 20min.', duration: '1 min', intensity: 'low' }
      ],
      mental: [
        { title: '3-2-1 Grounding', description: 'Name 3 things you see, 2 you feel, 1 you hear.', duration: '3 min', intensity: 'high' },
        { title: 'Focus Sprint', description: 'Pick one task and do 10 minutes distraction-free.', duration: '10 min', intensity: 'medium' },
        { title: 'Digital Detox', description: 'Put phone in another room for 15 minutes.', duration: '15 min', intensity: 'high' },
        { title: 'Thought Journaling', description: 'Write down racing thoughts to clear your mind.', duration: '5 min', intensity: 'medium' },
        { title: 'Gratitude Note', description: 'Write one thing that went well today.', duration: '2 min', intensity: 'low' },
        { title: 'Power Nap', description: 'Close eyes, deep breaths, 10-minute timer.', duration: '10 min', intensity: 'medium' }
      ]
    };

    // Determine intensity based on stress level and game performance
    const level = data.stressLevel;
    const slowReaction = results.reactionTime && results.reactionTime > 300;
    const lowAccuracy = results.accuracy && results.accuracy < 70;
    const lowMemory = results.memory && results.memory < 60;
    
    let targetIntensity = level > 70 ? 'high' : level > 40 ? 'medium' : 'low';
    
    // Adjust based on specific issues
    const needsBreathing = slowReaction || level > 60;
    const needsPhysical = results.tapping && results.tapping < 40;
    const needsMental = lowAccuracy || lowMemory;

    // Select suggestions with variety
    const suggestions = [];
    
    // Always include a breathing exercise
    const breathingOptions = suggestionPools.breathing.filter(s => 
      s.intensity === targetIntensity || (targetIntensity === 'high' && s.intensity === 'medium')
    );
    suggestions.push(breathingOptions[Math.floor(Math.random() * breathingOptions.length)]);
    
    // Add physical based on need
    if (needsPhysical) {
      const physicalOptions = suggestionPools.physical.filter(s => s.intensity === targetIntensity);
      suggestions.push(physicalOptions[Math.floor(Math.random() * physicalOptions.length)]);
    } else {
      const physicalOptions = suggestionPools.physical;
      suggestions.push(physicalOptions[Math.floor(Math.random() * physicalOptions.length)]);
    }
    
    // Add mental based on need
    if (needsMental) {
      const mentalOptions = suggestionPools.mental.filter(s => 
        s.intensity === 'medium' || s.intensity === 'high'
      );
      suggestions.push(mentalOptions[Math.floor(Math.random() * mentalOptions.length)]);
    } else {
      const mentalOptions = suggestionPools.mental;
      suggestions.push(mentalOptions[Math.floor(Math.random() * mentalOptions.length)]);
    }
    
    return suggestions.map(({ intensity, ...rest }) => rest);
  }, [data.suggestions, data.stressLevel, results]);

  const getIcon = (type: string) => {
    switch (type) {
      case 'breathing': return <Wind size={18} />;
      case 'physical': return <Dumbbell size={18} />;
      case 'mental': return <Coffee size={18} />;
      default: return <Clock size={18} />;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 max-w-5xl mx-auto">
      <div className="bg-white border border-slate-100 rounded-[3rem] p-8 md:p-12 shadow-xl shadow-slate-200/50 flex flex-col lg:flex-row items-center gap-12 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 opacity-50" />

        <div className="w-56 h-56 relative flex items-center justify-center flex-shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <RadialBarChart innerRadius="85%" outerRadius="100%" data={chartData} startAngle={225} endAngle={-45}>
              <PolarAngleAxis type="number" domain={[0, 100]} angleAxisId={0} tick={false} />
              <RadialBar background dataKey="value" cornerRadius={30} />
            </RadialBarChart>
          </ResponsiveContainer>
          <div className="absolute inset-0 flex flex-col items-center justify-center pt-2">
            <span className="text-5xl font-black text-slate-900 tracking-tighter">{data.stressLevel}</span>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Stress Score</span>
          </div>
        </div>

        <div className="space-y-6 flex-1 text-center lg:text-left relative">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold uppercase tracking-widest mb-2">
              <Sparkles size={12} /> AI Diagnosis
            </div>
            <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight">
              {data.stressLevel > 70 ? 'High Cognitive Load' : data.stressLevel > 40 ? 'Moderate Mental Stress' : 'Optimal Cognitive State'}
            </h2>
            <p className="text-slate-600 leading-relaxed max-w-2xl">{data.summary}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-indigo-600 rounded-[2.5rem] p-8 text-white shadow-xl shadow-indigo-100 space-y-6">
          <h3 className="text-xl font-bold flex items-center gap-2"><Info size={20} className="text-indigo-200" /> Behavioral Insights</h3>
          <div className="space-y-4">
            {smartInsights.map((insight, i) => (
              <div key={i} className="flex gap-4 p-4 bg-white/10 rounded-2xl border border-white/10">
                <div className="w-1.5 h-1.5 rounded-full bg-white mt-2 flex-shrink-0" />
                <p className="text-sm font-medium leading-relaxed">{insight}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-[2.5rem] border border-slate-100 p-8 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2"><TrendingUp size={20} className="text-emerald-500" /> Recovery Roadmap</h3>
          <div className="space-y-4">
            {recoverySuggestions.map((s, i) => (
              <div key={i} className="flex flex-col gap-1 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2 text-indigo-600">
                    {getIcon(s.type)}
                    <span className="text-[10px] font-black uppercase tracking-widest">{s.type}</span>
                  </div>
                  <span className="text-[10px] font-black text-slate-400 bg-white px-2 py-0.5 rounded-full border border-slate-100">{s.duration}</span>
                </div>
                <p className="text-sm font-bold text-slate-900">{s.title}</p>
                <p className="text-xs text-slate-500">{s.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* --- ML Training Section --- */}
      <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500 rounded-full -mr-20 -mt-20 opacity-20 blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2 text-indigo-300 font-bold uppercase tracking-widest text-xs">
              <Brain size={14} /> Model Training
            </div>
            <h3 className="text-xl font-bold">Help Train Your Personal AI</h3>
            <p className="text-slate-400 text-sm max-w-md">
              The standard AI estimates your stress based on general data.
              Tell us how you <em>actually</em> feel to train a private Neural Network on your device.
            </p>
          </div>

          <div className="flex-1 w-full max-w-xs bg-white/5 p-6 rounded-2xl border border-white/10">
            <label className="block text-xs font-bold uppercase tracking-widest text-slate-400 mb-4">
              How stressed do you feel?
            </label>
            <input
              type="range"
              min="0"
              max="100"
              defaultValue={data.stressLevel}
              className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
              onChange={(e) => {
                const val = parseInt(e.target.value);
                // Import dynamically to avoid circle deps or just trigger a callback props
                // But for now we will assume the parent handles it? 
                // Better: Direct import here is fine for side-effects
                import('../services/mlService').then(ml => {
                  ml.saveTrainingData(results, val);
                });
              }}
            />
            <div className="flex justify-between mt-2 text-xs text-slate-500 font-mono">
              <span>Calm (0)</span>
              <span>Panic (100)</span>
            </div>
          </div>
        </div>
      </div>


      <div className="pt-12 pb-8 flex flex-col items-center gap-6">
        <button onClick={onRestart} className="bg-slate-900 text-white px-10 py-5 rounded-[1.5rem] font-black text-lg flex items-center gap-3 hover:bg-slate-800 transition-all active:scale-95 shadow-2xl shadow-slate-200">
          <RefreshCcw size={20} /> New Assessment
        </button>
      </div>
    </div>
  );
};

export default ResultsView;
