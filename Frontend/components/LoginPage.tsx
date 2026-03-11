import React, { useState } from 'react';
import { BarChart2, Mail, Lock, User, Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { signIn, signUp, isAdmin, supabase } from '../services/supabaseClient';

export type UserRole = 'user' | 'admin';

interface LoginPageProps {
  onLoginSuccess: (username: string, email: string, role: UserRole) => void;
}

const USER_KEY = 'zengauge_user';

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [isAdminLogin, setIsAdminLogin] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Validation
      if (!email || !password) {
        throw new Error('Please fill in all fields');
      }

      if (!email.includes('@')) {
        throw new Error('Please enter a valid email');
      }

      if (password.length < 6) {
        throw new Error('Password must be at least 6 characters');
      }

      if (isSignUp && password !== confirmPassword) {
        throw new Error('Passwords do not match');
      }

      if (isAdminLogin) {
        // Admin login via Supabase
        const { user } = await signIn(email, password);
        
        if (user) {
          const adminCheck = await isAdmin(user.id);
          if (!adminCheck) {
            throw new Error('Access denied. Not an admin account.');
          }
          
          const userData = { 
            username: user.email?.split('@')[0] || 'Admin', 
            email: user.email || email, 
            role: 'admin' as UserRole 
          };
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
          onLoginSuccess(userData.username, userData.email, 'admin');
        }
      } else if (isSignUp) {
        // User signup via Supabase
        const { user } = await signUp(email, password, username);
        
        if (user) {
          const userData = { 
            username: username || email.split('@')[0], 
            email, 
            role: 'user' as UserRole 
          };
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
          onLoginSuccess(userData.username, userData.email, 'user');
        }
      } else {
        // User login via Supabase
        const { user } = await signIn(email, password);
        
        if (user) {
          const userData = { 
            username: user.email?.split('@')[0] || 'User', 
            email: user.email || email, 
            role: 'user' as UserRole 
          };
          localStorage.setItem(USER_KEY, JSON.stringify(userData));
          onLoginSuccess(userData.username, userData.email, 'user');
        }
      }
    } catch (err: any) {
      console.error('Auth error:', err);
      setError(err.message || 'Authentication failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-900 to-slate-900 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Animated background decoration */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-purple-500/20 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-cyan-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-1/4 left-1/3 w-48 h-48 bg-pink-500/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: '1.5s' }} />
        {/* Grid pattern */}
        <div className="absolute inset-0 opacity-5" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '50px 50px'
        }} />
      </div>

      <div className="w-full max-w-md relative z-10">
        {/* Logo with animation */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-3xl mb-5 shadow-2xl shadow-indigo-500/40 relative group">
            <BarChart2 className="w-10 h-10 text-white relative z-10" />
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-400 to-violet-500 rounded-3xl blur-lg opacity-50 group-hover:opacity-75 transition-opacity" />
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-2">ZenGauge</h1>
          <p className="text-indigo-300 text-lg">Your personal stress monitor</p>
        </div>

        {/* Role Toggle with better styling */}
        <div className="flex justify-center mb-8">
          <div className="inline-flex rounded-2xl bg-white/5 border border-white/10 p-1.5 backdrop-blur-sm">
            <button
              onClick={() => { setIsAdminLogin(false); setError(''); }}
              className={`px-8 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center gap-2 ${
                !isAdminLogin
                  ? 'bg-gradient-to-r from-indigo-500 to-violet-600 text-white shadow-lg shadow-indigo-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <User size={18} />
              User
            </button>
            <button
              onClick={() => { setIsAdminLogin(true); setIsSignUp(false); setError(''); }}
              className={`px-8 py-3 text-sm font-bold rounded-xl transition-all duration-300 flex items-center gap-2 ${
                isAdminLogin
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg shadow-amber-500/30'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              <Shield size={18} />
              Admin
            </button>
          </div>
        </div>

        {/* Login Card with glass effect */}
        <div className={`bg-white/5 backdrop-blur-2xl border rounded-[2rem] p-8 shadow-2xl transition-all duration-300 ${
          isAdminLogin ? 'border-amber-500/20' : 'border-white/10'
        }`}>
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            {isAdminLogin ? 'Admin Portal' : (isSignUp ? 'Create Account' : 'Welcome Back')}
          </h2>
          <p className="text-indigo-300/80 text-center mb-8">
            {isAdminLogin 
              ? 'Access the admin dashboard' 
              : (isSignUp ? 'Start your wellness journey' : 'Sign in to continue')}
          </p>

          <form onSubmit={handleSubmit} className="space-y-5">
            {isSignUp && !isAdminLogin && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-indigo-200">Username</label>
                <div className="relative group">
                  <User className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" size={18} />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                    placeholder="Choose a username"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-indigo-200">Email</label>
              <div className="relative group">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" size={18} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                  placeholder="Enter your email"
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-sm font-semibold text-indigo-200">Password</label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" size={18} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-12 text-white placeholder-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-indigo-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {isSignUp && !isAdminLogin && (
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-indigo-200">Confirm Password</label>
                <div className="relative group">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-indigo-400 group-focus-within:text-indigo-300 transition-colors" size={18} />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full bg-white/5 border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-white placeholder-indigo-400/40 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 focus:border-indigo-500/50 focus:bg-white/10 transition-all"
                    placeholder="Confirm your password"
                  />
                </div>
              </div>
            )}

            {error && (
              <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 text-red-300 text-sm text-center backdrop-blur-sm flex items-center justify-center gap-2">
                <span className="text-red-400">⚠</span> {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading}
              className={`w-full py-4 rounded-xl font-bold text-white transition-all duration-300 flex items-center justify-center gap-3 mt-6 ${
                isAdminLogin
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 shadow-lg shadow-amber-500/25 hover:shadow-amber-500/40'
                  : 'bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-600 hover:to-violet-700 shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40'
              } disabled:opacity-50 disabled:cursor-not-allowed hover:scale-[1.02] active:scale-[0.98]`}
            >
              {isLoading ? (
                <>
                  <Loader2 className="animate-spin" size={20} />
                  <span>{isAdminLogin ? 'Authenticating...' : (isSignUp ? 'Creating Account...' : 'Signing In...')}</span>
                </>
              ) : (
                <>
                  <span>{isAdminLogin ? 'Access Dashboard' : (isSignUp ? 'Create Account' : 'Sign In')}</span>
                  <span className="text-lg">→</span>
                </>
              )}
            </button>
          </form>

          {!isAdminLogin && (
            <div className="text-center mt-8 pt-6 border-t border-white/10">
              <p className="text-indigo-300/80">
                {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
                <button
                  onClick={() => { setIsSignUp(!isSignUp); setError(''); }}
                  className="text-white font-bold hover:text-indigo-300 transition-colors"
                >
                  {isSignUp ? 'Sign In' : 'Sign Up'}
                </button>
              </p>
            </div>
          )}
        </div>

        <p className="text-center text-indigo-400/40 text-xs mt-8">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default LoginPage;
