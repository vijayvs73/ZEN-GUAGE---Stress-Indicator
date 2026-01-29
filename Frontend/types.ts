
export interface GameResult {
  reactionTime?: number; // in ms
  memoryScore?: number; // 0-100
  tappingSpeed?: number; // taps per second
  accuracy?: number; // 0-100
}

export interface RecoverySuggestion {
  title: string;
  description: string;
  type: 'breathing' | 'physical' | 'mental' | 'environment';
  duration: string;
}

export interface StressAnalysis {
  stressLevel: number; // 0-100
  summary: string;
  suggestions: RecoverySuggestion[];
  insights: string[];
  rawText?: string;
  mapLinks?: { title: string; uri: string }[];
  searchLinks?: { title: string; uri: string }[];
  videoLinks?: { title: string; uri: string }[];
}

export interface AssessmentHistoryItem {
  id: string;
  timestamp: string;
  stressLevel: number;
  results: GameResult;
}

export interface UserProfile {
  displayName?: string;
  streak: number;
  lastTestDate: string | null;
  bestAccuracy: number;
  totalAssessments: number;
}

export enum AppState {
  WELCOME = 'WELCOME',
  GAME_REACTION = 'GAME_REACTION',
  GAME_MEMORY = 'GAME_MEMORY',
  GAME_TAPPING = 'GAME_TAPPING',
  GAME_ACCURACY = 'GAME_ACCURACY',
  ANALYZING = 'ANALYZING',
  RESULTS = 'RESULTS'
}

export enum AppView {
  DASHBOARD = 'DASHBOARD',
  HISTORY = 'HISTORY',
  CHAT = 'CHAT',
  BREATHE = 'BREATHE',
  ZEN_GARDEN = 'ZEN_GARDEN',
  LOCATOR = 'LOCATOR',
  RELAX_VIDEOS = 'RELAX_VIDEOS',
  PROFILE = 'PROFILE'
}

export interface Message {
  role: 'user' | 'model' | 'system';
  content: string;
  timestamp: Date;
  thinking?: string;
  sources?: { title: string; uri: string }[];
}
