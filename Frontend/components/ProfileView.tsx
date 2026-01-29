
import React, { useState, useEffect } from 'react';
import { UserProfile, AssessmentHistoryItem } from '../types';
import { getMindsetReport } from '../services/aiService';
import { trainModelNow } from '../services/mlService';
import {
  User,
  Settings,
  Trophy,
  Flame,
  Target,
  Activity,
  Edit3,
  Check,
  Shield,
  LogOut,
  Calendar,
  Sparkles,
  BrainCircuit,
  Loader2
} from 'lucide-react';

interface Props {
  profile: UserProfile;
  history: AssessmentHistoryItem[];
  archetype: { title: string; color: string; bg: string };
  onUpdateName: (name: string) => void;
}

const ProfileView: React.FC<Props> = ({ profile, history, archetype, onUpdateName }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(profile.displayName || '');
  const [aiReport, setAiReport] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isTraining, setIsTraining] = useState(false);
  const [trainMessage, setTrainMessage] = useState<string | null>(null);

  const handleSaveName = () => {
    onUpdateName(tempName);
    setIsEditing(false);
  };

  const generateReport = async () => {
    setIsGenerating(true);
    const report = await getMindsetReport(history);
    setAiReport(report);
    setIsGenerating(false);
  };

  const handleTrainModel = async () => {
    setIsTraining(true);
    setTrainMessage(null);
    try {
      const result = await trainModelNow();
      setTrainMessage(`${result.message} (${result.dataPoints} data points)`);
    } catch (e) {
      setTrainMessage('Training failed. Check console.');
    }
    setIsTraining(false);
  };

  const avgStress = history.length > 0
    ? Math.round(history.reduce((acc, curr) => acc + curr.stressLevel, 0) / history.length)
    : 0;

  return (
    <div className="max-w-4xl mx-auto py-8 space-y-8 animate-in fade-in slide-in-from-bottom-2 duration-500">
      <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
        <div className="h-32 bg-indigo-600 relative">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '24px 24px' }} />
        </div>
        <div className="px-8 pb-8 relative">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 -mt-12">
            <div className="flex items-end gap-6">
              <div className="w-24 h-24 bg-white rounded-[2rem] border-4 border-white shadow-xl flex items-center justify-center text-indigo-600 relative overflow-hidden group">
                <div className="absolute inset-0 bg-indigo-50 flex items-center justify-center">
                  <User size={48} strokeWidth={1.5} />
                </div>
              </div>
              <div className="pb-2">
                <div className="flex items-center gap-2 group">
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={tempName}
                        onChange={(e) => setTempName(e.target.value)}
                        className="text-2xl font-black text-slate-900 bg-slate-50 border border-slate-200 px-3 py-1 rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Your name"
                        autoFocus
                      />
                      <button onClick={handleSaveName} className="p-2 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700">
                        <Check size={18} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <h2 className="text-3xl font-black text-slate-900 tracking-tighter">
                        {profile.displayName || 'Zen User'}
                      </h2>
                      <button onClick={() => setIsEditing(true)} className="p-1.5 text-slate-300 hover:text-indigo-600 transition-colors">
                        <Edit3 size={18} />
                      </button>
                    </>
                  )}
                </div>
                <p className="text-slate-500 font-medium">Joined {history.length > 0 ? new Date(history[history.length - 1].timestamp).toLocaleDateString() : 'Today'}</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className={`px-4 py-2 rounded-2xl flex items-center gap-2 font-bold text-sm ${archetype.bg} ${archetype.color} border border-transparent`}>
                <Sparkles size={16} />
                {archetype.title}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Current Streak</span>
            <Flame size={20} className="text-amber-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-slate-900">{profile.streak}</span>
            <span className="text-slate-400 font-bold">days</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Total Check-ins</span>
            <Calendar size={20} className="text-indigo-600" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-5xl font-black text-slate-900">{profile.totalAssessments}</span>
            <span className="text-slate-400 font-bold">sessions</span>
          </div>
        </div>

        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Avg. Stress</span>
            <Activity size={20} className="text-emerald-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className={`text-5xl font-black ${avgStress > 70 ? 'text-red-500' : avgStress > 40 ? 'text-amber-500' : 'text-emerald-500'}`}>
              {avgStress}
            </span>
            <span className="text-slate-400 font-bold">score</span>
          </div>
        </div>
      </div>

      <div className="bg-indigo-600 rounded-[3rem] p-10 text-white relative overflow-hidden group shadow-2xl shadow-indigo-100">
        <div className="absolute top-0 right-0 w-80 h-80 bg-white/10 rounded-full blur-3xl -mr-40 -mt-40 transition-all duration-1000 group-hover:bg-white/20" />
        <div className="relative flex flex-col md:flex-row items-center gap-10">
          <div className="w-32 h-32 bg-white/20 backdrop-blur-md rounded-[2.5rem] flex items-center justify-center flex-shrink-0 border border-white/30">
            <BrainCircuit size={64} className="text-white" />
          </div>
          <div className="flex-1 space-y-4 text-center md:text-left">
            <h3 className="text-2xl font-black tracking-tight flex items-center justify-center md:justify-start gap-3">
              Mindset Intelligence Report
              <span className="px-2 py-0.5 bg-indigo-500 text-[10px] font-bold rounded-full border border-white/20">Gemini 3 Pro</span>
            </h3>
            {aiReport ? (
              <p className="text-indigo-50 leading-relaxed text-lg italic">"{aiReport}"</p>
            ) : (
              <p className="text-indigo-100/80 leading-relaxed">Analyze your historical performance across sessions to identify patterns in your mental resilience and focus.</p>
            )}
            <button
              onClick={generateReport}
              disabled={isGenerating || history.length < 2}
              className="mt-2 px-8 py-3 bg-white text-indigo-600 rounded-2xl font-black text-sm hover:bg-indigo-50 transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center gap-2 mx-auto md:mx-0"
            >
              {isGenerating ? <Loader2 size={18} className="animate-spin" /> : <Sparkles size={18} />}
              {aiReport ? 'Refresh Report' : 'Generate AI Insights'}
            </button>
            {history.length < 2 && <p className="text-[10px] text-indigo-200 mt-2">Requires at least 2 sessions to analyze.</p>}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
          <h3 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Trophy size={20} className="text-amber-500" /> Lifetime Milestones
          </h3>
          <div className="space-y-4">
            {[
              { icon: <Target className="text-blue-500" />, label: 'Peak Precision', value: `${profile.bestAccuracy}% Accuracy`, done: profile.bestAccuracy > 0 },
              { icon: <Flame className="text-orange-500" />, label: 'Consistency King', value: '7 Day Streak', done: profile.streak >= 7 },
              { icon: <Shield className="text-emerald-500" />, label: 'Zen Initiate', value: 'First Assessment', done: profile.totalAssessments >= 1 },
              { icon: <Sparkles className="text-purple-500" />, label: 'Deep Mind', value: '10 Memory Tasks', done: profile.totalAssessments >= 10 }
            ].map((m, i) => (
              <div key={i} className={`flex items-center justify-between p-4 rounded-2xl border ${m.done ? 'bg-slate-50 border-slate-100' : 'bg-white border-slate-50 opacity-40'}`}>
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-white rounded-xl shadow-sm">
                    {m.icon}
                  </div>
                  <div>
                    <p className="font-bold text-slate-900 text-sm">{m.label}</p>
                    <p className="text-[10px] font-medium text-slate-500 uppercase tracking-widest">{m.value}</p>
                  </div>
                </div>
                {m.done && <Check className="text-emerald-500" size={18} />}
              </div>
            ))}
          </div>
        </div>

        <div className="bg-slate-900 p-10 rounded-[3rem] text-white space-y-6 relative overflow-hidden group">
          <h3 className="text-xl font-bold tracking-tight flex items-center gap-2">
            <Settings size={20} className="text-slate-400" /> Local Controls
          </h3>
          <div className="space-y-3">
            <button
              onClick={() => {
                const current = localStorage.getItem('zengauge_ai_provider');
                const next = current === 'ollama' ? 'gemini' : 'ollama';
                localStorage.setItem('zengauge_ai_provider', next);
                alert(`AI Provider switched to ${next.toUpperCase()}. Reloading...`);
                window.location.reload();
              }}
              className="w-full flex items-center justify-between p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl hover:bg-indigo-500/20 transition-all group/btn"
            >
              <span className="text-sm font-bold text-indigo-300">
                AI Provider: {localStorage.getItem('zengauge_ai_provider')?.toUpperCase() || 'GEMINI'}
              </span>
              <Settings size={16} className="text-indigo-300" />
            </button>
            <button
              onClick={handleTrainModel}
              disabled={isTraining}
              className="w-full flex items-center justify-between p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl hover:bg-emerald-500/20 transition-all group/btn disabled:opacity-50"
            >
              <span className="text-sm font-bold text-emerald-400">
                {isTraining ? 'Training…' : 'Train stress model'}
              </span>
              {isTraining ? <Loader2 size={16} className="text-emerald-400 animate-spin" /> : <BrainCircuit size={16} className="text-emerald-400" />}
            </button>
            {trainMessage && (
              <p className="text-xs text-slate-400 mt-1 px-1">{trainMessage}</p>
            )}
            <button
              onClick={() => { if (confirm('Wipe all local data?')) { localStorage.clear(); window.location.reload(); } }}
              className="w-full flex items-center justify-between p-4 bg-red-500/10 border border-red-500/20 rounded-2xl hover:bg-red-500/20 transition-all group/btn"
            >
              <span className="text-sm font-bold text-red-400">Delete My Records</span>
              <LogOut size={16} className="text-red-400" />
            </button>
          </div>
          <div className="pt-6">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em] mb-2">Privacy & Storage</p>
            <p className="text-xs text-slate-400 leading-relaxed">
              Your profile and history are strictly local. Data is only sent to the Gemini thinking engine during live analysis to provide personalized insights.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileView;
