import React, { useState, useEffect, useMemo } from 'react';
import { 
  Users, 
  Activity, 
  TrendingUp, 
  TrendingDown, 
  Brain, 
  Zap, 
  Target, 
  Crosshair,
  Calendar,
  Download,
  Search,
  Filter,
  RefreshCw,
  BarChart2,
  PieChart,
  AlertTriangle,
  CheckCircle,
  Clock,
  Trash2,
  Eye
} from 'lucide-react';
import { AssessmentHistoryItem } from '../types';

interface AdminDashboardProps {
  onLogout: () => void;
}

interface UserData {
  odatatype: 'email' | 'username';
  identifier: string;
  sessions: AssessmentHistoryItem[];
  lastActive: string;
  avgStress: number;
  totalSessions: number;
}

const ADMIN_DATA_KEY = 'zengauge_admin_data';

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onLogout }) => {
  const [allData, setAllData] = useState<AssessmentHistoryItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStress, setFilterStress] = useState<'all' | 'low' | 'medium' | 'high'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'stress' | 'accuracy'>('date');
  const [selectedSession, setSelectedSession] = useState<AssessmentHistoryItem | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = () => {
    setIsRefreshing(true);
    // Load user assessment data
    const userHistory = localStorage.getItem('zengauge_history');
    const adminStoredData = localStorage.getItem(ADMIN_DATA_KEY);
    
    let combinedData: AssessmentHistoryItem[] = [];
    
    if (userHistory) {
      try {
        const parsed = JSON.parse(userHistory);
        combinedData = [...combinedData, ...parsed];
      } catch (e) { console.error(e); }
    }
    
    if (adminStoredData) {
      try {
        const parsed = JSON.parse(adminStoredData);
        combinedData = [...combinedData, ...parsed];
      } catch (e) { console.error(e); }
    }

    // Remove duplicates by ID
    const uniqueData = combinedData.reduce((acc: AssessmentHistoryItem[], curr) => {
      if (!acc.find(item => item.id === curr.id)) {
        acc.push(curr);
      }
      return acc;
    }, []);

    // Sort by date descending
    uniqueData.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    setAllData(uniqueData);
    
    // Store combined data for persistence
    localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(uniqueData));
    
    setTimeout(() => setIsRefreshing(false), 500);
  };

  const stats = useMemo(() => {
    if (allData.length === 0) {
      return {
        totalSessions: 0,
        avgStress: 0,
        avgReaction: 0,
        avgAccuracy: 0,
        avgMemory: 0,
        avgTapping: 0,
        highStressCount: 0,
        lowStressCount: 0,
        todaySessions: 0
      };
    }

    const today = new Date().toDateString();
    const todaySessions = allData.filter(d => new Date(d.timestamp).toDateString() === today).length;

    return {
      totalSessions: allData.length,
      avgStress: Math.round(allData.reduce((sum, d) => sum + (d.stressLevel || 0), 0) / allData.length),
      avgReaction: Math.round(allData.reduce((sum, d) => sum + (d.results?.reactionTime || 0), 0) / allData.length),
      avgAccuracy: Math.round(allData.reduce((sum, d) => sum + (d.results?.accuracy || 0), 0) / allData.length),
      avgMemory: Math.round(allData.reduce((sum, d) => sum + (d.results?.memoryScore || 0), 0) / allData.length),
      avgTapping: (allData.reduce((sum, d) => sum + (d.results?.tappingSpeed || 0), 0) / allData.length).toFixed(1),
      highStressCount: allData.filter(d => d.stressLevel >= 70).length,
      lowStressCount: allData.filter(d => d.stressLevel <= 30).length,
      todaySessions
    };
  }, [allData]);

  const filteredData = useMemo(() => {
    let filtered = [...allData];

    // Filter by stress level
    if (filterStress === 'low') {
      filtered = filtered.filter(d => d.stressLevel <= 30);
    } else if (filterStress === 'medium') {
      filtered = filtered.filter(d => d.stressLevel > 30 && d.stressLevel < 70);
    } else if (filterStress === 'high') {
      filtered = filtered.filter(d => d.stressLevel >= 70);
    }

    // Sort
    if (sortBy === 'stress') {
      filtered.sort((a, b) => b.stressLevel - a.stressLevel);
    } else if (sortBy === 'accuracy') {
      filtered.sort((a, b) => (b.results?.accuracy || 0) - (a.results?.accuracy || 0));
    } else {
      filtered.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    }

    // Search
    if (searchTerm) {
      filtered = filtered.filter(d => 
        d.id.includes(searchTerm) || 
        new Date(d.timestamp).toLocaleDateString().includes(searchTerm)
      );
    }

    return filtered;
  }, [allData, filterStress, sortBy, searchTerm]);

  const getStressColor = (level: number) => {
    if (level <= 30) return 'text-emerald-600 bg-emerald-50';
    if (level <= 60) return 'text-amber-600 bg-amber-50';
    return 'text-red-600 bg-red-50';
  };

  const getStressLabel = (level: number) => {
    if (level <= 30) return 'Low';
    if (level <= 60) return 'Medium';
    return 'High';
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Date', 'Time', 'Stress Level', 'Reaction Time (ms)', 'Memory Score', 'Tapping Speed', 'Accuracy (%)'];
    const rows = allData.map(d => [
      d.id,
      new Date(d.timestamp).toLocaleDateString(),
      new Date(d.timestamp).toLocaleTimeString(),
      d.stressLevel,
      d.results?.reactionTime || 0,
      d.results?.memoryScore || 0,
      d.results?.tappingSpeed?.toFixed(2) || 0,
      d.results?.accuracy || 0
    ]);

    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `zengauge_data_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const deleteSession = (id: string) => {
    if (confirm('Are you sure you want to delete this session?')) {
      const updated = allData.filter(d => d.id !== id);
      setAllData(updated);
      localStorage.setItem(ADMIN_DATA_KEY, JSON.stringify(updated));
      localStorage.setItem('zengauge_history', JSON.stringify(updated));
    }
  };

  const clearAllData = () => {
    if (confirm('Are you sure you want to delete ALL assessment data? This cannot be undone.')) {
      setAllData([]);
      localStorage.removeItem(ADMIN_DATA_KEY);
      localStorage.removeItem('zengauge_history');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900">
      {/* Header */}
      <header className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-2 bg-gradient-to-br from-purple-600 to-pink-600 rounded-xl">
              <BarChart2 size={28} className="text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Zen Gauge Admin</h1>
              <p className="text-sm text-slate-400">Assessment Data Dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={loadAllData}
              disabled={isRefreshing}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition"
            >
              <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={exportToCSV}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition"
            >
              <Download size={18} />
              Export CSV
            </button>
            <button
              onClick={onLogout}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition"
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-gradient-to-br from-indigo-600 to-purple-600 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <Users size={24} className="opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Total</span>
            </div>
            <p className="text-4xl font-black">{stats.totalSessions}</p>
            <p className="text-sm opacity-80 mt-1">Total Sessions</p>
          </div>

          <div className="bg-gradient-to-br from-amber-500 to-orange-500 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <Activity size={24} className="opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Average</span>
            </div>
            <p className="text-4xl font-black">{stats.avgStress}%</p>
            <p className="text-sm opacity-80 mt-1">Avg Stress Level</p>
          </div>

          <div className="bg-gradient-to-br from-emerald-500 to-teal-500 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <CheckCircle size={24} className="opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">Low Stress</span>
            </div>
            <p className="text-4xl font-black">{stats.lowStressCount}</p>
            <p className="text-sm opacity-80 mt-1">Sessions ≤30%</p>
          </div>

          <div className="bg-gradient-to-br from-red-500 to-rose-500 p-6 rounded-2xl text-white">
            <div className="flex items-center justify-between mb-4">
              <AlertTriangle size={24} className="opacity-80" />
              <span className="text-xs bg-white/20 px-2 py-1 rounded-full">High Stress</span>
            </div>
            <p className="text-4xl font-black">{stats.highStressCount}</p>
            <p className="text-sm opacity-80 mt-1">Sessions ≥70%</p>
          </div>
        </div>

        {/* Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/20 rounded-lg">
                <Zap size={20} className="text-yellow-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Avg Reaction</p>
                <p className="text-xl font-bold text-white">{stats.avgReaction}ms</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/20 rounded-lg">
                <Brain size={20} className="text-purple-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Avg Memory</p>
                <p className="text-xl font-bold text-white">{stats.avgMemory}</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/20 rounded-lg">
                <Target size={20} className="text-blue-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Avg Tapping</p>
                <p className="text-xl font-bold text-white">{stats.avgTapping}/s</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-800 border border-slate-700 p-4 rounded-xl">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-500/20 rounded-lg">
                <Crosshair size={20} className="text-emerald-500" />
              </div>
              <div>
                <p className="text-xs text-slate-400 uppercase tracking-wider">Avg Accuracy</p>
                <p className="text-xl font-bold text-white">{stats.avgAccuracy}%</p>
              </div>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl p-6 mb-6">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex-1 min-w-[200px]">
              <div className="relative">
                <Search size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search by ID or date..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Filter size={18} className="text-slate-400" />
              <select
                value={filterStress}
                onChange={(e) => setFilterStress(e.target.value as any)}
                className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
              >
                <option value="all">All Stress Levels</option>
                <option value="low">Low (≤30%)</option>
                <option value="medium">Medium (31-69%)</option>
                <option value="high">High (≥70%)</option>
              </select>
            </div>

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-3 py-2 bg-slate-700 border border-slate-600 rounded-lg text-white focus:outline-none focus:border-purple-500"
            >
              <option value="date">Sort by Date</option>
              <option value="stress">Sort by Stress</option>
              <option value="accuracy">Sort by Accuracy</option>
            </select>

            <button
              onClick={clearAllData}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg transition"
            >
              <Trash2 size={18} />
              Clear All
            </button>
          </div>
        </div>

        {/* Data Table */}
        <div className="bg-slate-800 border border-slate-700 rounded-2xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-700/50">
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Date & Time</th>
                  <th className="text-left px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Session ID</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Stress Level</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Reaction</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Memory</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Tapping</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Accuracy</th>
                  <th className="text-center px-6 py-4 text-xs font-bold text-slate-300 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-700">
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-slate-400">
                      <Activity size={48} className="mx-auto mb-4 opacity-50" />
                      <p className="text-lg font-semibold">No assessment data found</p>
                      <p className="text-sm">Assessment data will appear here when users complete tests</p>
                    </td>
                  </tr>
                ) : (
                  filteredData.map((session) => (
                    <tr key={session.id} className="hover:bg-slate-700/30 transition">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-slate-400" />
                          <div>
                            <p className="text-sm font-semibold text-white">
                              {new Date(session.timestamp).toLocaleDateString()}
                            </p>
                            <p className="text-xs text-slate-400">
                              {new Date(session.timestamp).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-xs font-mono text-slate-300 bg-slate-700 px-2 py-1 rounded">
                          #{session.id.slice(-8)}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-bold ${getStressColor(session.stressLevel)}`}>
                          {session.stressLevel}%
                          <span className="text-xs font-normal">({getStressLabel(session.stressLevel)})</span>
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-white font-semibold">
                          {session.results?.reactionTime || '—'}ms
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-white font-semibold">
                          {session.results?.memoryScore || '—'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-white font-semibold">
                          {session.results?.tappingSpeed?.toFixed(1) || '—'}/s
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="text-sm text-white font-semibold">
                          {session.results?.accuracy || '—'}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedSession(session)}
                            className="p-2 text-slate-400 hover:text-purple-400 hover:bg-purple-500/20 rounded-lg transition"
                            title="View Details"
                          >
                            <Eye size={18} />
                          </button>
                          <button
                            onClick={() => deleteSession(session.id)}
                            className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-500/20 rounded-lg transition"
                            title="Delete"
                          >
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          
          {/* Table Footer */}
          <div className="bg-slate-700/30 px-6 py-4 flex items-center justify-between">
            <p className="text-sm text-slate-400">
              Showing <span className="font-bold text-white">{filteredData.length}</span> of{' '}
              <span className="font-bold text-white">{allData.length}</span> sessions
            </p>
            <p className="text-sm text-slate-400">
              <Clock size={14} className="inline mr-1" />
              Last updated: {new Date().toLocaleTimeString()}
            </p>
          </div>
        </div>
      </main>

      {/* Session Detail Modal */}
      {selectedSession && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 border border-slate-700 rounded-2xl max-w-lg w-full p-6">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-bold text-white">Session Details</h3>
              <button
                onClick={() => setSelectedSession(null)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-700 rounded-lg transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Session ID</p>
                  <p className="font-mono text-white">#{selectedSession.id}</p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">Date & Time</p>
                  <p className="text-white">{new Date(selectedSession.timestamp).toLocaleString()}</p>
                </div>
              </div>

              <div className={`p-4 rounded-xl ${getStressColor(selectedSession.stressLevel)}`}>
                <p className="text-xs uppercase tracking-wider mb-1 opacity-80">Stress Level</p>
                <p className="text-3xl font-black">{selectedSession.stressLevel}%</p>
                <p className="text-sm opacity-80">{getStressLabel(selectedSession.stressLevel)} Stress</p>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Zap size={16} className="text-yellow-500" />
                    <p className="text-xs text-slate-400 uppercase">Reaction Time</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedSession.results?.reactionTime || 0}ms</p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Brain size={16} className="text-purple-500" />
                    <p className="text-xs text-slate-400 uppercase">Memory Score</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedSession.results?.memoryScore || 0}</p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Target size={16} className="text-blue-500" />
                    <p className="text-xs text-slate-400 uppercase">Tapping Speed</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedSession.results?.tappingSpeed?.toFixed(2) || 0}/s</p>
                </div>
                <div className="bg-slate-700/50 p-4 rounded-xl">
                  <div className="flex items-center gap-2 mb-2">
                    <Crosshair size={16} className="text-emerald-500" />
                    <p className="text-xs text-slate-400 uppercase">Accuracy</p>
                  </div>
                  <p className="text-2xl font-bold text-white">{selectedSession.results?.accuracy || 0}%</p>
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setSelectedSession(null)}
                className="flex-1 py-3 bg-slate-700 hover:bg-slate-600 text-white rounded-xl font-semibold transition"
              >
                Close
              </button>
              <button
                onClick={() => {
                  deleteSession(selectedSession.id);
                  setSelectedSession(null);
                }}
                className="py-3 px-6 bg-red-600 hover:bg-red-700 text-white rounded-xl font-semibold transition flex items-center gap-2"
              >
                <Trash2 size={18} />
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
