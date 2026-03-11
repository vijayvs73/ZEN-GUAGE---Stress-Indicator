
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { AppState, AppView, GameResult, StressAnalysis, AssessmentHistoryItem, UserProfile, GameDifficulty } from './types';
import { analyzeStress, getDailyAffirmation } from './services/aiService';
import { initModelTraining } from './services/modelTraining';
import { websocketService } from './services/websocketService';
import { loadLanguage, saveLanguage, t, SupportedLanguage } from './services/i18n';
import { supabase, signOut as supabaseSignOut, getCurrentUser } from './services/supabaseClient';
import LoginPage, { UserRole } from './components/LoginPage';
import AdminDashboard from './components/AdminDashboard';
import ReactionGame from './components/ReactionGame';
import MemoryGame from './components/MemoryGame';
import WhackAStressGame from './components/RainRhythmGame';
import BalloonBreathingGame from './components/BalloonBreathingGame';
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
  const gameResultRef = useRef<GameResult>({}); // Ref to track results synchronously
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

  const handleLogout = async () => {
    try {
      await supabaseSignOut();
    } catch (error) {
      console.log('Supabase signout failed, continuing with local logout');
    }
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
    gameResultRef.current = {}; // Reset the ref too
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
        <div className="max-w-xl mx-auto py-8 fade-in">
          {/* Progress Steps */}
          <div className="mb-8 px-4">
            <div className="flex items-center justify-between relative">
              {/* Progress line */}
              <div className="absolute top-4 left-0 right-0 h-0.5 bg-slate-200 -z-10"></div>
              <div 
                className="absolute top-4 left-0 h-0.5 bg-gradient-to-r from-indigo-600 to-violet-600 -z-10 transition-all duration-500"
                style={{ width: `${(currentStepIndex / (assessmentSteps.length - 1)) * 100}%` }}
              ></div>
              
              {assessmentSteps.map((step, idx) => (
                <div key={idx} className="flex flex-col items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                    idx === currentStepIndex 
                      ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white ring-4 ring-indigo-100 shadow-lg scale-110' 
                      : idx < currentStepIndex 
                        ? 'bg-indigo-600 text-white' 
                        : 'bg-slate-100 text-slate-400 border-2 border-slate-200'
                  }`}>
                    {idx < currentStepIndex ? '✓' : idx + 1}
                  </div>
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${
                    idx === currentStepIndex ? 'text-indigo-600' : 'text-slate-400'
                  }`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
          
          <div className="bg-white/80 backdrop-blur-xl border border-slate-200/50 rounded-3xl p-8 sm:p-10 shadow-xl shadow-slate-100 scale-in">
            {appState === AppState.GAME_REACTION && <ReactionGame difficulty={difficulty} onComplete={onReactionComplete} />}
            {appState === AppState.GAME_MEMORY && <MemoryGame difficulty={difficulty} onComplete={onMemoryComplete} />}
            {appState === AppState.GAME_TAPPING && <WhackAStressGame difficulty={difficulty} onComplete={onTappingComplete} />}
            {appState === AppState.GAME_ACCURACY && <BalloonBreathingGame difficulty={difficulty} onComplete={onAccuracyComplete} />}
          </div>
          {appState !== AppState.ANALYZING && (
            <button
              onClick={() => setAppState(AppState.WELCOME)}
              className="mt-6 w-full text-slate-400 font-semibold text-sm hover:text-red-500 transition-colors flex items-center justify-center gap-2 py-3 rounded-xl hover:bg-red-50"
            >
              ✕ Cancel Assessment
            </button>
          )}
        </div>
      );
    } else if (activeView === AppView.DASHBOARD) {
      if (appState === AppState.ANALYZING) {
        return (
          <div className="flex flex-col items-center justify-center py-40 space-y-8 fade-in">
            <div className="relative">
              <div className="w-20 h-20 border-4 border-indigo-100 rounded-full"></div>
              <div className="absolute inset-0 w-20 h-20 border-4 border-transparent border-t-indigo-600 rounded-full animate-spin"></div>
              <div className="absolute inset-2 w-16 h-16 bg-gradient-to-br from-indigo-100 to-violet-100 rounded-full flex items-center justify-center">
                <Brain size={28} className="text-indigo-600" />
              </div>
            </div>
            <div className="text-center">
              <h2 className="text-2xl font-bold text-slate-900 mb-2">{t(language, 'processing_title')}</h2>
              <p className="text-slate-500">{t(language, 'processing_body')}</p>
            </div>
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
              <div className="w-2 h-2 bg-indigo-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
            </div>
          </div>
        );
      }
      if (appState === AppState.RESULTS) {
        return analysis ? (
          <div className="max-w-4xl mx-auto py-8 space-y-8 fade-in">
            <ResultsView data={analysis} results={gameResult} onRestart={startAssessment} />
          </div>
        ) : null;
      }
      return (
        <div className="max-w-5xl mx-auto space-y-8 py-6 fade-in">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-gradient-to-br from-indigo-600 via-violet-600 to-purple-700 rounded-3xl p-8 md:p-10 text-white shadow-2xl shadow-indigo-200 relative overflow-hidden group">
              {/* Animated background elements */}
              <div className="absolute inset-0 overflow-hidden">
                <div className="absolute -right-20 -top-20 w-72 h-72 bg-white/10 rounded-full blur-3xl group-hover:bg-white/20 transition-all duration-1000 float" />
                <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-violet-500/30 rounded-full blur-2xl" />
                <div className="absolute right-1/4 bottom-1/4 w-32 h-32 bg-pink-500/20 rounded-full blur-xl" />
              </div>
              <div className="relative space-y-6">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="px-4 py-2 bg-white/15 backdrop-blur-md rounded-full text-xs font-bold uppercase tracking-widest border border-white/20">
                    ✨ {t(language, 'hero_badge')}
                  </div>
                  {profile.streak > 0 && (
                    <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-400 to-orange-500 text-amber-950 rounded-full text-xs font-bold uppercase tracking-widest shadow-lg">
                      <Flame size={14} /> {profile.streak} Day Streak
                    </div>
                  )}
                </div>
                <h1 className="text-4xl md:text-5xl font-black leading-tight tracking-tight">
                  {t(language, 'hero_title_line1')} <br /> <span className="text-indigo-200">{t(language, 'hero_title_line2')}</span>
                </h1>
                <p className="text-indigo-100/80 text-lg max-w-md leading-relaxed">
                  {t(language, 'hero_subtitle')}
                </p>
                <div className="flex flex-wrap gap-4 pt-4">
                  <button
                    onClick={startAssessment}
                    className="bg-white text-indigo-600 px-8 py-4 rounded-2xl font-bold text-base hover:bg-indigo-50 transition-all shadow-xl hover:shadow-2xl btn-press flex items-center gap-3 group"
                  >
                    <span>{t(language, 'hero_start_test')}</span>
                    <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center group-hover:bg-indigo-200 transition-all">
                      <Plus size={18} />
                    </div>
                  </button>
                  <button
                    onClick={() => setActiveView(AppView.RELAX_VIDEOS)}
                    className="bg-white/15 text-white border border-white/30 backdrop-blur-md px-8 py-4 rounded-2xl font-bold hover:bg-white/25 transition-all btn-press flex items-center gap-3"
                  >
                    {t(language, 'hero_relax_videos')} <Video size={20} />
                  </button>
                </div>
                <div className="pt-4">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-indigo-200 mb-3">Game Difficulty</p>
                  <div className="inline-flex rounded-xl bg-white/10 border border-white/20 p-1 backdrop-blur-sm">
                    {(['easy', 'medium', 'hard'] as GameDifficulty[]).map((level) => (
                      <button
                        key={level}
                        onClick={() => setDifficulty(level)}
                        className={`px-5 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
                          difficulty === level
                            ? 'bg-white text-indigo-700 shadow-lg'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="bg-white/80 backdrop-blur-xl p-6 rounded-2xl border border-slate-200/50 shadow-sm space-y-5 card-hover">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-slate-900">{t(language, 'stats_title')}</h3>
                  <div className="w-8 h-8 bg-indigo-100 rounded-lg flex items-center justify-center">
                    <BarChart2 size={16} className="text-indigo-600" />
                  </div>
                </div>
                <div className="space-y-4">
                  <div className={`flex items-center justify-between p-4 rounded-xl ${archetype.bg} border border-slate-100`}>
                    <div>
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Archetype</p>
                      <p className={`font-black text-lg ${archetype.color}`}>{archetype.title}</p>
                    </div>
                    <div className={`w-12 h-12 ${archetype.bg} rounded-xl flex items-center justify-center`}>
                      <Activity size={24} className={archetype.color} />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {t(language, 'stats_best_acc')}
                      </p>
                      <p className="text-2xl font-black text-slate-900">{profile.bestAccuracy}<span className="text-sm text-slate-400">%</span></p>
                    </div>
                    <div className="bg-gradient-to-br from-slate-50 to-slate-100 p-4 rounded-xl border border-slate-200/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">
                        {t(language, 'stats_tests')}
                      </p>
                      <p className="text-2xl font-black text-slate-900">{profile.totalAssessments}</p>
                    </div>
                  </div>
                </div>

                {/* Burnout Risk Model Display */}
                <div className="pt-4 border-t border-slate-100">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-2">
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
                className="bg-gradient-to-br from-emerald-500 to-teal-600 p-6 rounded-2xl text-white shadow-xl shadow-emerald-100 cursor-pointer hover:scale-[1.02] hover:shadow-2xl transition-all group card-hover"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center backdrop-blur-sm group-hover:rotate-12 transition-transform">
                    <Wind size={24} />
                  </div>
                  <ChevronRight size={20} className="opacity-60 group-hover:translate-x-1 transition-transform" />
                </div>
                <h4 className="text-xl font-bold mb-1">{t(language, 'quick_calm_title')}</h4>
                <p className="text-emerald-100 text-sm leading-relaxed">{t(language, 'quick_calm_body')}</p>
              </div>
            </div>
          </div>
        </div>
      );
    }
  };

  const onReactionComplete = (time: number) => {
    gameResultRef.current = { ...gameResultRef.current, reactionTime: time };
    setGameResult(gameResultRef.current);
    console.log('Reaction complete:', time, 'ms - Results so far:', gameResultRef.current);
    setAppState(AppState.GAME_MEMORY);
  };

  const onMemoryComplete = (score: number) => {
    gameResultRef.current = { ...gameResultRef.current, memoryScore: score };
    setGameResult(gameResultRef.current);
    console.log('Memory complete:', score, '- Results so far:', gameResultRef.current);
    setAppState(AppState.GAME_TAPPING);
  };

  const onTappingComplete = (tapsPerSec: number) => {
    gameResultRef.current = { ...gameResultRef.current, tappingSpeed: tapsPerSec };
    setGameResult(gameResultRef.current);
    console.log('Tapping complete:', tapsPerSec, '- Results so far:', gameResultRef.current);
    setAppState(AppState.GAME_ACCURACY);
  };

  const onAccuracyComplete = async (accuracyScore: number) => {
    gameResultRef.current = { ...gameResultRef.current, accuracy: accuracyScore };
    const finalResults = { ...gameResultRef.current };
    console.log('All games complete! Final results:', finalResults);
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
    <div className="min-h-screen flex bg-slate-50 mesh-gradient">
          {isSidebarOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-40 lg:hidden" onClick={() => setIsSidebarOpen(false)} />
      )}

      <aside className={`fixed inset-y-0 left-0 w-72 bg-white/80 backdrop-blur-xl border-r border-slate-200/50 z-50 transform transition-all duration-500 ease-out lg:translate-x-0 lg:static lg:inset-auto shadow-2xl shadow-slate-200/50 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="h-full flex flex-col p-6">
          <div className="flex items-center gap-3 mb-8 px-2">
            <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-violet-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-indigo-200 shine">
              <BarChart2 size={26} />
            </div>
            <div>
              <span className="text-xl font-black text-slate-900 tracking-tight block">{t(language, 'app_name')}</span>
              <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Stress Monitor</span>
            </div>
          </div>

          <div className="mb-6 bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100/50 rounded-2xl p-4 shadow-sm card-hover">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-indigo-600 shadow-sm flex-shrink-0">
                <Sparkles size={20} />
              </div>
              <div>
                <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest mb-1">
                  {t(language, 'affirmation_badge')}
                </p>
                <p className="text-sm font-semibold text-slate-700 italic leading-relaxed">"{affirmation}"</p>
              </div>
            </div>
          </div>

          <nav className="flex-1 space-y-1.5 stagger-children">
            {sidebarItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  if (item.id !== AppView.DASHBOARD) setAppState(AppState.WELCOME);
                  setIsSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-4 px-4 py-3.5 rounded-xl font-semibold transition-all duration-200 btn-press ${activeView === item.id
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-indigo-600'
                  }`}
              >
                <div className={`${activeView === item.id ? 'text-white' : 'text-slate-400'}`}>
                  {item.icon}
                </div>
                <span className="text-sm">{item.label}</span>
                {activeView === item.id && (
                  <ChevronRight size={16} className="ml-auto" />
                )}
              </button>
            ))}
          </nav>

          <div className="mt-auto space-y-4">
            <div className="p-5 bg-gradient-to-br from-amber-50 to-orange-50 rounded-2xl border border-amber-100/50 shadow-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 bg-gradient-to-br from-amber-400 to-orange-500 rounded-lg flex items-center justify-center shadow-sm">
                  <Flame size={16} className="text-white" />
                </div>
                <span className="text-xs font-bold text-amber-800 uppercase tracking-widest">
                  {t(language, 'streak_label')}
                </span>
              </div>
              <p className="text-3xl font-black text-slate-900">
                {profile.streak} <span className="text-lg font-bold text-slate-500">{t(language, 'streak_days_suffix')}</span>
              </p>
            </div>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col h-screen overflow-hidden relative">
        <header className="h-20 bg-white/70 backdrop-blur-xl border-b border-slate-200/50 px-6 lg:px-10 flex items-center justify-between sticky top-0 z-30 shadow-sm">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="lg:hidden p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all"><Menu size={24} /></button>
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              <span className="font-bold text-slate-600 text-sm uppercase tracking-widest">{activeView.replace('_', ' ')}</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1 rounded-full bg-slate-100/80 backdrop-blur-sm px-1 py-1 text-xs font-semibold text-slate-600 border border-slate-200/50">
              <span className="px-2 text-slate-400">{t(language, 'language_label')}</span>
              <button
                onClick={() => { setLanguage('en'); saveLanguage('en'); }}
                className={`px-3 py-1.5 rounded-full transition-all ${language === 'en' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-white'}`}
              >
                EN
              </button>
              <button
                onClick={() => { setLanguage('hi'); saveLanguage('hi'); }}
                className={`px-3 py-1.5 rounded-full transition-all ${language === 'hi' ? 'bg-indigo-600 text-white shadow-sm' : 'hover:bg-white'}`}
              >
                HI
              </button>
            </div>
            <button className="p-2.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-xl transition-all relative notification-pulse">
              <Bell size={20} />
            </button>
            <div className="relative" data-profile-menu>
              <button
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className={`flex items-center gap-3 p-1.5 pr-4 rounded-full border-2 transition-all duration-200 btn-press ${activeView === AppView.PROFILE || isProfileMenuOpen
                  ? 'bg-gradient-to-r from-indigo-600 to-violet-600 border-transparent text-white shadow-lg shadow-indigo-200'
                  : 'bg-white border-slate-200 text-slate-700 hover:border-indigo-400 hover:shadow-md'
                  }`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${activeView === AppView.PROFILE || isProfileMenuOpen ? 'bg-white/20' : 'bg-gradient-to-br from-indigo-100 to-violet-100 text-indigo-600'}`}>
                  <User size={18} />
                </div>
                <span className="text-sm font-bold truncate max-w-[100px]">
                  {profile.displayName || 'Zen User'}
                </span>
              </button>
              
              {/* Dropdown Menu */}
              {isProfileMenuOpen && (
                <div className="absolute right-0 mt-3 w-52 bg-white/90 backdrop-blur-xl border border-slate-200/50 rounded-2xl shadow-2xl shadow-slate-200/50 z-50 overflow-hidden scale-in">
                  <div className="p-3 bg-gradient-to-r from-indigo-50 to-violet-50 border-b border-slate-100">
                    <p className="text-xs font-bold text-indigo-600 uppercase tracking-widest">Signed in as</p>
                    <p className="text-sm font-semibold text-slate-800 truncate">{currentUser?.email || 'User'}</p>
                  </div>
                  <button
                    onClick={() => {
                      setActiveView(AppView.PROFILE);
                      setAppState(AppState.WELCOME);
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-all"
                  >
                    <User size={16} className="text-indigo-600" />
                    View Profile
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 transition-all border-t border-slate-100"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto px-6 py-8 md:px-10 no-scrollbar">
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
