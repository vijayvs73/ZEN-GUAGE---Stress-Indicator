
import React, { useState, useEffect, useMemo } from 'react';
import { AppState, AppView, GameResult, StressAnalysis, AssessmentHistoryItem, UserProfile, GameDifficulty } from './types';
import { analyzeStress, getDailyAffirmation } from './services/aiService';
import { initModelTraining } from './services/modelTraining';
import { websocketService } from './services/websocketService';
import { loadLanguage, saveLanguage, t, SupportedLanguage } from './services/i18n';
import LoginPage, { UserRole } from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import ReactionGame from './components/ReactionGame';
import MemoryGame from './components/MemoryGame';
import TappingGame from './components/TappingGame';
import AccuracyGame from './components/AccuracyGame';
import ResultsView from './components/ResultsView';
import ProgressView from './components/ProgressView';
import ChatBox from './components/ChatBox';
import BreathingCircle from './components/BreathingCircle';
import BurnoutRiskWidget from './components/BurnoutRiskWidget';
import PersonalityDetector from './components/PersonalityDetector';

import PsychiatristLocator from './components/PsychiatristLocator';
import RelaxationLibrary from './components/RelaxationLibrary';
import ProfileView from './components/ProfileView';
import {
  Zap,
  Brain,
  Target,
  ChevronRight,
  Loader2,
  BarChart2,
  Crosshair,
  TrendingUp,
  History,
  LayoutDashboard,
  MessageSquare,
  Menu,
  Plus,
  Wind,
  Trophy,
  Flame,
  Activity,
  UserCircle,
  Sparkles,
  Mountain,
  MapPin,
  Video,
  User,
  Bell,
  LogOut
} from 'lucide-react';

const STORAGE_KEY = 'zengauge_history';
const PROFILE_KEY = 'zengauge_profile';
const DIFFICULTY_KEY = 'zengauge_difficulty';
const USER_KEY = 'zengauge_user';

const App: React.FC = () => {
  const [isLoggedIn, setIsLoggedIn] = useState<boolean>(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    return !!savedUser;
  });
  const [userRole, setUserRole] = useState<UserRole>(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        return parsed.role || 'user';
      } catch { return 'user'; }
    }
    return 'user';
  });
  const [currentUser, setCurrentUser] = useState<{ username: string; email: string } | null>(() => {
    const savedUser = localStorage.getItem(USER_KEY);
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [activeView, setActiveView] = useState<AppView>(AppView.DASHBOARD);
  const [appState, setAppState] = useState<AppState>(AppState.WELCOME);
  const [gameResult, setGameResult] = useState<GameResult>({});
  const [analysis, setAnalysis] = useState<StressAnalysis | null>(null);
  const [coords, setCoords] = useState<{ latitude: number, longitude: number } | undefined>();
  const [history, setHistory] = useState<AssessmentHistoryItem[]>([]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [affirmation, setAffirmation] = useState<string>("Take a deep breath. You're doing great.");
  const [language, setLanguage] = useState<SupportedLanguage>(() => loadLanguage());
  const [difficulty, setDifficulty] = useState<GameDifficulty>(() => {
    const saved = localStorage.getItem(DIFFICULTY_KEY) as GameDifficulty | null;
    return saved ?? 'easy';
  });
  const [profile, setProfile] = useState<UserProfile>({
    streak: 0,
    lastTestDate: null,
    bestAccuracy: 0,
    totalAssessments: 0,
    displayName: ''
  });

  const handleLoginSuccess = (username: string, email: string, role: UserRole) => {
    setCurrentUser({ username, email });
    setUserRole(role);
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    localStorage.removeItem(USER_KEY);
    setIsLoggedIn(false);
    setCurrentUser(null);
    setUserRole('user');
    setActiveView(AppView.DASHBOARD);
  };

  const normalizeResults = (results: GameResult): GameResult => ({
    reactionTime: Number.isFinite(results.reactionTime) ? results.reactionTime : 0,
    memoryScore: Number.isFinite(results.memoryScore) ? results.memoryScore : 0,
    tappingSpeed: Number.isFinite(results.tappingSpeed) ? results.tappingSpeed : 0,
    accuracy: Number.isFinite(results.accuracy) ? results.accuracy : 0
  });

  const normalizeHistoryItem = (item: AssessmentHistoryItem): AssessmentHistoryItem => ({
    ...item,
    stressLevel: Number.isFinite(item.stressLevel) ? item.stressLevel : 0,
    results: normalizeResults(item.results || {})
  });

  useEffect(() => {
    const savedHistory = localStorage.getItem(STORAGE_KEY);
    const savedProfile = localStorage.getItem(PROFILE_KEY);

    let initialHistory: AssessmentHistoryItem[] = [];
    if (savedHistory) {
      try {
        initialHistory = JSON.parse(savedHistory)
          .map(normalizeHistoryItem)
          .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
        setHistory(initialHistory);
      } catch (e) { console.error(e); }
    }

    if (savedProfile) {
      try {
        setProfile(JSON.parse(savedProfile));
      } catch (e) { console.error(e); }
    }

    // Fetch context-aware affirmation on mount using latest history with timeout
    const latest = initialHistory[0];
    const timeoutId = setTimeout(() => {
      getDailyAffirmation(latest ? { stressLevel: latest.stressLevel, accuracy: latest.results.accuracy } : undefined)
        .then(setAffirmation)
        .catch(() => setAffirmation("You are doing great! Keep moving forward."));
    }, 500); // Defer to avoid blocking initial render

    // Auto-activate provider detection and background model training
    setTimeout(() => {
      initModelTraining();
    }, 800);

    // Connect to backend WebSocket
    websocketService.connect();
    return () => {
      clearTimeout(timeoutId);
      websocketService.disconnect();
    };
  }, []);

  useEffect(() => {
    localStorage.setItem(DIFFICULTY_KEY, difficulty);
  }, [difficulty]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const profileMenu = (event.target as HTMLElement).closest('[data-profile-menu]');
      if (!profileMenu) {
        setIsProfileMenuOpen(false);
      }
    };
    if (isProfileMenuOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isProfileMenuOpen]);

  const updateProfile = (stressLevel: number, accuracy: number) => {
    const today = new Date().toDateString();
    let newStreak = profile.streak;

    if (profile.lastTestDate !== today) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      if (profile.lastTestDate === yesterday.toDateString()) {
        newStreak += 1;
      } else {
        newStreak = 1;
      }
    }

    const newProfile: UserProfile = {
      ...profile,
      streak: newStreak,
      lastTestDate: today,
      bestAccuracy: Math.max(profile.bestAccuracy, accuracy),
      totalAssessments: profile.totalAssessments + 1
    };

    setProfile(newProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
  };

  const updateDisplayName = (name: string) => {
    const newProfile = { ...profile, displayName: name };
    setProfile(newProfile);
    localStorage.setItem(PROFILE_KEY, JSON.stringify(newProfile));
  };

  const saveToHistory = (stressLevel: number, results: GameResult) => {
    const normalizedResults = normalizeResults(results);
    const normalizedStress = Number.isFinite(stressLevel) ? Math.round(stressLevel) : 0;
    const newItem: AssessmentHistoryItem = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      stressLevel: normalizedStress,
      results: normalizedResults
    };
    const updatedHistory = [newItem, ...history].slice(0, 100);
    setHistory(updatedHistory);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedHistory));
    updateProfile(normalizedStress, normalizedResults.accuracy || 0);
  };

  const archetype = useMemo(() => {
    if (history.length === 0) return { title: "Newcomer", color: "text-slate-600", bg: "bg-slate-100" };
    const latest = history[0];
    if (latest.stressLevel < 30) return { title: "Mindful Sage", color: "text-emerald-600", bg: "bg-emerald-50" };
    if (latest.results.reactionTime && latest.results.reactionTime < 240) return { title: "Fast Reactor", color: "text-indigo-600", bg: "bg-indigo-50" };
    if (latest.results.accuracy && latest.results.accuracy > 90) return { title: "Precision Master", color: "text-amber-600", bg: "bg-amber-50" };
    return { title: "Daily Achiever", color: "text-blue-600", bg: "bg-blue-50" };
  }, [history]);

  const startAssessment = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setCoords({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        (err) => console.warn(err)
      );
    }
    setAppState(AppState.GAME_REACTION);
    setActiveView(AppView.DASHBOARD);
    setGameResult({});
    setAnalysis(null);
  };

  const renderDashboard = () => {
    const isAssessmentFlow = [
      AppState.GAME_REACTION,
      AppState.GAME_MEMORY,
      AppState.GAME_TAPPING,
      AppState.GAME_ACCURACY
    ].includes(appState);

    if (isAssessmentFlow && activeView === AppView.DASHBOARD) {
      // Assessment flow
      return (
        <div className="max-w-xl mx-auto py-8">
          <div className="mb-8 flex items-center justify-between px-2">
            {assessmentSteps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${idx === currentStepIndex ? 'bg-indigo-600 text-white ring-4 ring-indigo-50' :
                  idx < currentStepIndex ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-100 text-slate-400'
                  }`}>
                  {idx + 1}
                </div>
              </div>
            ))}
          </div>
          <div className="bg-white border border-slate-200 rounded-[2.5rem] p-8 sm:p-12 shadow-sm">
            {appState === AppState.GAME_REACTION && <ReactionGame difficulty={difficulty} onComplete={onReactionComplete} />}
            {appState === AppState.GAME_MEMORY && <MemoryGame difficulty={difficulty} onComplete={onMemoryComplete} />}
            {appState === AppState.GAME_TAPPING && <TappingGame difficulty={difficulty} onComplete={onTappingComplete} />}
            {appState === AppState.GAME_ACCURACY && <AccuracyGame difficulty={difficulty} onComplete={onAccuracyComplete} />}
          </div>
          {appState !== AppState.ANALYZING && (
            <button
              onClick={() => setAppState(AppState.WELCOME)}
              className="mt-8 w-full text-slate-400 font-bold text-sm hover:text-slate-600 transition-colors flex items-center justify-center gap-2"
            >
              Cancel Test
            </button>
          )}
        </div>
      );
    } else if (activeView === AppView.DASHBOARD) {
      if (appState === AppState.ANALYZING) {
        return (
          <div className="flex flex-col items-center justify-center py-40 space-y-6">
            <Loader2 className="animate-spin text-indigo-600" size={48} />
            <div className="text-center">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">{t(language, 'processing_title')}</h2>
              <p className="text-slate-500">{t(language, 'processing_body')}</p>
            </div>
          </div>
        );
      }
      if (appState === AppState.RESULTS) {
        return analysis ? (
          <div className="max-w-4xl mx-auto py-8 space-y-8">
            <ResultsView data={analysis} results={gameResult} onRestart={startAssessment} />
          </div>
        ) : null;
      }
      return (
        <div className="max-w-5xl mx-auto space-y-8 py-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 bg-indigo-600 rounded-[2.5rem] p-8 md:p-12 text-white shadow-2xl shadow-indigo-100 relative overflow-hidden group">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-700" />
              <div className="relative space-y-6">
                <div className="flex items-center gap-4">
                  <div className="px-4 py-1.5 bg-white/20 rounded-full text-xs font-bold uppercase tracking-widest backdrop-blur-md">
                    {t(language, 'hero_badge')}
                  </div>
                  {profile.streak > 0 && (
                    <div className="flex items-center gap-1.5 px-4 py-1.5 bg-amber-400 text-amber-950 rounded-full text-xs font-bold uppercase tracking-widest">
                      <Flame size={14} /> {profile.streak} Day Streak
                    </div>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tighter">
                  {t(language, 'hero_title_line1')} <br /> <span className="text-indigo-200">{t(language, 'hero_title_line2')}</span>
                </h1>
                <p className="text-indigo-100/80 text-lg max-w-md">
                  {t(language, 'hero_subtitle')}
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <button
                    onClick={startAssessment}
                    className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-black text-lg hover:bg-indigo-50 transition-all shadow-xl active:scale-95 flex items-center gap-2"
                  >
                    {t(language, 'hero_start_test')} <Plus size={20} />
                  </button>
                  <button
                    onClick={() => setActiveView(AppView.RELAX_VIDEOS)}
                    className="bg-indigo-500/50 text-white border border-white/20 backdrop-blur-md px-8 py-4 rounded-2xl font-bold hover:bg-indigo-500 transition-all active:scale-95 flex items-center gap-2"
                  >
                    {t(language, 'hero_relax_videos')} <Video size={20} />
                  </button>
                </div>
                <div className="pt-2">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-100/80 mb-2">Game Level</p>
                  <div className="inline-flex rounded-2xl bg-white/10 border border-white/20 p-1">
                    {(['easy', 'medium', 'hard'] as GameDifficulty[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-xl transition-all ${
                          difficulty === level
                            ? 'bg-white text-indigo-700 shadow-sm'
                            : 'text-white/80 hover:text-white'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900 tracking-tight">{t(language, 'stats_title')}</h3>
                </div>
                <div className="space-y-4">
                  <div className={`flex items-center justify-between p-4 rounded-2xl ${archetype.bg}`}>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Archetype</p>
                      <p className={`font-black ${archetype.color}`}>{archetype.title}</p>
                    </div>
                    <Activity size={24} className={archetype.color} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t(language, 'stats_best_acc')}
                      </p>
                      <p className="text-xl font-black text-slate-900">{profile.bestAccuracy}%</p>
                    </div>
                    <div className="bg-slate-50 p-4 rounded-2xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                        {t(language, 'stats_tests')}
                      </p>
                      <p className="text-xl font-black text-slate-900">{profile.totalAssessments}</p>
                    </div>
                  </div>
                </div>

                {/* Burnout Risk Model Display */}
                <div className="mt-6 pt-6 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1">
                      <Activity size={12} /> {t(language, 'burnout_badge')}
                    </span>
                  </div>
                  {(() => {
                    // Inline logic to get risk (safe to do here as it's synchronous)
                    // In a real app we'd use useEffect, but this is a quick patch for the 'training' request
                    // We need to import the service. Since we can't easily top-level import in this partial edit,
                    // we will rely on a helper or just render a placeholder that gets hydrated?
                    // Actually, let's just make sure we pass 'history' to this component properly.
                    // Wait, 'renderDashboard' is inside App.tsx, so we have access to 'history'.
                    // We can call the singleton directly.
                    return (
                      <BurnoutRiskWidget history={history} />
                    );
                  })()}
                </div>
              </div>

              <div
                onClick={() => setActiveView(AppView.BREATHE)}
                className="bg-emerald-500 p-8 rounded-[2.5rem] text-white shadow-xl shadow-emerald-100 cursor-pointer hover:scale-[1.02] transition-all group"
              >
                <Wind size={32} className="mb-4 opacity-80 group-hover:rotate-12 transition-transform" />
                <h4 className="text-xl font-bold mb-1">{t(language, 'quick_calm_title')}</h4>
                <p className="text-emerald-100 text-sm">{t(language, 'quick_calm_body')}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const onReactionComplete = (time: number) => {
    setGameResult(prev => ({ ...prev, reactionTime: time }));
    setAppState(AppState.GAME_MEMORY);
  };

  const onMemoryComplete = (score: number) => {
    setGameResult(prev => ({ ...prev, memoryScore: score }));
    setAppState(AppState.GAME_TAPPING);
  };

  const onTappingComplete = (tapsPerSec: number) => {
    setGameResult(prev => ({ ...prev, tappingSpeed: tapsPerSec }));
    setAppState(AppState.GAME_ACCURACY);
  };

  const onAccuracyComplete = async (accuracyScore: number) => {
    const finalResults = { ...gameResult, accuracy: accuracyScore };
    setGameResult(finalResults);
    setAppState(AppState.ANALYZING);
    
    try {
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Analysis timeout')), 15000)
      );
      const result = await Promise.race([analyzeStress(finalResults, coords), timeoutPromise]) as StressAnalysis;
      setAnalysis(result);
      saveToHistory(result.stressLevel, finalResults);
      websocketService.send({ type: 'assessment_complete', payload: { stressLevel: result.stressLevel, id: Date.now().toString(), results: finalResults } });

      // Update affirmation based on latest results (with timeout)
      getDailyAffirmation({ stressLevel: result.stressLevel, accuracy: accuracyScore })
        .then(setAffirmation)
        .catch(() => setAffirmation("Great effort! Keep pushing forward."));
    } catch (error) {
      console.error('Analysis failed:', error);
      // Fallback analysis
      const fallbackAnalysis: StressAnalysis = {
        stressLevel: 50,
        summary: "Assessment completed. Try again to get personalized insights.",
        suggestions: [],
        insights: []
      };
      setAnalysis(fallbackAnalysis);
      saveToHistory(50, finalResults);
      websocketService.send({ type: 'assessment_complete', payload: { stressLevel: 50, id: Date.now().toString(), results: finalResults } });
    }

    setAppState(AppState.RESULTS);
  };

  const sidebarItems = [
    { id: AppView.DASHBOARD, label: 'Dashboard', icon: <LayoutDashboard size={20} /> },

    { id: AppView.RELAX_VIDEOS, label: 'Relax Library', icon: <Video size={20} /> },
    { id: AppView.LOCATOR, label: 'Near Me', icon: <MapPin size={20} /> },

    { id: AppView.HISTORY, label: 'Performance', icon: <TrendingUp size={20} /> },
    { id: AppView.CHAT, label: 'Mindset AI', icon: <MessageSquare size={20} /> },
    { id: AppView.PERSONALITY, label: 'Personality', icon: <Sparkles size={20} /> },
  ];

  const assessmentSteps = [
    { state: AppState.GAME_REACTION, label: 'Reaction', icon: <Zap size={14} /> },
    { state: AppState.GAME_MEMORY, label: 'Memory', icon: <Brain size={14} /> },
    { state: AppState.GAME_TAPPING, label: 'Focus', icon: <Target size={14} /> },
    { state: AppState.GAME_ACCURACY, label: 'Accuracy', icon: <Crosshair size={14} /> }
  ];

  const currentStepIndex = assessmentSteps.findIndex(s => s.state === appState);

  // Show login page if not logged in (after all hooks are defined)
  if (!isLoggedIn) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  // Show admin dashboard if logged in as admin
  if (userRole === 'admin') {
    return <AdminDashboard onLogout={handleLogout} />;
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
          {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white border-r border-slate-200 z-50 transform transition-transform duration-300 lg:translate-x-0 lg:static lg:inset-auto ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-12 h-12 bg-indigo-600 rounded-[1rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
              <BarChart2 size={28} />
            </div>
                <span className="text-2xl font-black text-slate-900 tracking-tighter">{t(language, 'app_name')}</span>
          </div>

          <div className="mb-6 bg-indigo-50 border border-indigo-100 rounded-2xl p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm">
                <Sparkles size={18} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">
                  {t(language, 'affirmation_badge')}
                </p>
                <p className="text-sm font-bold text-slate-800 italic leading-snug">"{affirmation}"</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-2">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  if (item.id !== AppView.DASHBOARD) setAppState(AppState.WELCOME);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-5 py-4 rounded-2xl font-bold transition-all ${activeView === item.id
                  ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100'
                  : 'text-slate-500 hover:bg-slate-50 hover:text-indigo-600'
                  }`}
              >
                {item.icon}
                <span className="text-sm">{item.label}</span>
              </button>
            ))}
          </nav>

          <div className="mt-auto">
            <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100">
              <div className="flex items-center gap-2 mb-2">
                <Flame size={16} className="text-amber-500" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  {t(language, 'streak_label')}
                </span>
              </div>
              <p className="text-xl font-black text-slate-900">
                {profile.streak} {t(language, 'streak_days_suffix')}
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-20 bg-white/50 backdrop-blur-md border-b border-slate-100 px-6 lg:px-12 flex items-center justify-between sticky top-0 z-30">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2 text-slate-500"><Menu size={24} /></button>
            <span className="hidden lg:block font-bold text-slate-500 text-sm tracking-tight uppercase tracking-[0.2em]">{activeView.replace('_', ' ')}</span>
          </div>

          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 text-xs font-semibold text-slate-600">
              <span>{t(language, 'language_label')}:</span>
              <button
                onClick={() => { setLanguage('en'); saveLanguage('en'); }}
                className={`px-2 py-0.5 rounded-full ${language === 'en' ? 'bg-indigo-600 text-white' : ''}`}
              >
                EN
              </button>
              <button
                onClick={() => { setLanguage('hi'); saveLanguage('hi'); }}
                className={`px-2 py-0.5 rounded-full ${language === 'hi' ? 'bg-indigo-600 text-white' : ''}`}
              >
                HI
              </button>
            </div>
            <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all">
              <Bell size={20} />
            </button>
            <div className="relative" data-profile-menu>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`flex items-center gap-3 p-1.5 pr-4 rounded-full border transition-all ${activeView === AppView.PROFILE || isProfileMenuOpen
                  ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-500'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeView === AppView.PROFILE || isProfileMenuOpen ? 'bg-white/20' : 'bg-slate-100 text-indigo-600'}`}>
                  <User size={18} />
                </div>
                <span className="text-sm font-bold truncate max-w-[100px]">
                  {profile.displayName || 'Zen User'}
                </span>
              </button>
              
              {/* Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50">
                  <button
                    onClick={() => {
                      setActiveView(AppView.PROFILE);
                      setAppState(AppState.WELCOME);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all border-b border-slate-100"
                  >
                    <User size={16} className="text-indigo-600" />
                    View Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-12 no-scrollbar">
          {activeView === AppView.HISTORY ? (
            <ProgressView
              history={history}
              onBack={() => setActiveView(AppView.DASHBOARD)}
              onClear={() => { setHistory([]); localStorage.removeItem(STORAGE_KEY); }}
              onDeleteSession={(id) => {
                const updated = history.filter(item => item.id !== id);
                setHistory(updated);
                localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
              }}
            />
          ) : activeView === AppView.CHAT ? (
            <div className="h-full flex flex-col max-w-4xl mx-auto">
              <div className="pb-8">
                <h2 className="text-3xl font-black text-slate-900 mb-2">{t(language, 'chat_heading')}</h2>
                <p className="text-slate-500">{t(language, 'chat_subtitle')}</p>
              </div>
              <ChatBox isOpen={true} onClose={() => { }} isEmbedded={true} />
            </div>
          ) : activeView === AppView.BREATHE ? (
            <BreathingCircle onBack={() => setActiveView(AppView.DASHBOARD)} />

          ) : activeView === AppView.PERSONALITY ? (
            <div className="max-w-2xl mx-auto py-8">
              <div className="mb-6">
                <button 
                  onClick={() => setActiveView(AppView.DASHBOARD)}
                  className="flex items-center gap-1 text-sm font-bold text-indigo-600 mb-2 hover:gap-2 transition-all"
                >
                  ← Back to Dashboard
                </button>
                <h2 className="text-3xl font-black text-slate-900 mb-2">Personality Profile</h2>
                <p className="text-slate-500">Discover your personality traits through a quick assessment.</p>
              </div>
              <PersonalityDetector />
            </div>

          ) : activeView === AppView.LOCATOR ? (
            <PsychiatristLocator />
          ) : activeView === AppView.RELAX_VIDEOS ? (
            <RelaxationLibrary />
          ) : activeView === AppView.PROFILE ? (
            <ProfileView
              profile={profile}
              history={history}
              archetype={archetype}
              onUpdateName={updateDisplayName}
            />
          ) : (
            renderDashboard()
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
