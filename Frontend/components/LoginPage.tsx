import React, { useState } from 'react';
import { Eye, EyeOff, Mail, Lock, LogIn, UserPlus, User, Shield } from 'lucide-react';

export type UserRole = 'user' | 'admin';

interface LoginPageProps {
  onLoginSuccess: (username: string, email: string, role: UserRole) => void;
}

// Admin credentials (in a real app, this would be server-side validation)
const ADMIN_CREDENTIALS = {
  email: 'admin@zengauge.com',
  password: 'admin123'
};

const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [userRole, setUserRole] = useState<UserRole>('user');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    username: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    setError('');
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Validation
      if (!formData.email || !formData.password) {
        throw new Error('Please fill in all required fields');
      }

      if (!validateEmail(formData.email)) {
        throw new Error('Please enter a valid email address');
      }

      // Admin login validation
      if (userRole === 'admin') {
        if (formData.email !== ADMIN_CREDENTIALS.email || formData.password !== ADMIN_CREDENTIALS.password) {
          throw new Error('Invalid admin credentials');
        }
      }

      if (!isLoginMode && userRole === 'user') {
        if (!formData.username) {
          throw new Error('Username is required for registration');
        }

        if (formData.password.length < 6) {
          throw new Error('Password must be at least 6 characters long');
        }

        if (formData.password !== formData.confirmPassword) {
          throw new Error('Passwords do not match');
        }
      }

      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      // Store user session in localStorage
      const userData = {
        username: userRole === 'admin' ? 'Administrator' : (formData.username || 'User'),
        email: formData.email,
        role: userRole,
        loginDate: new Date().toISOString(),
        isLoggedIn: true
      };
      localStorage.setItem('zengauge_user', JSON.stringify(userData));

      // Call success callback
      onLoginSuccess(userData.username, userData.email, userRole);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      {/* Animated background elements */}
      <div className="absolute top-0 left-0 w-96 h-96 bg-purple-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob"></div>
      <div className="absolute -bottom-8 right-0 w-96 h-96 bg-pink-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-2000"></div>
      <div className="absolute -bottom-8 left-1/2 w-96 h-96 bg-blue-500 rounded-full mix-blend-multiply filter blur-3xl opacity-20 animate-blob animation-delay-4000"></div>

      {/* Login Card */}
      <div className="relative w-full max-w-md">
        <div className="bg-slate-800/50 backdrop-blur-md border border-purple-500/20 rounded-2xl shadow-2xl p-8">
          {/* Header */}
          <div className="text-center mb-6">
            <div className="flex items-center justify-center gap-2 mb-4">
              <div className={`p-3 rounded-lg ${userRole === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-500' : 'bg-gradient-to-br from-purple-500 to-pink-500'}`}>
                {userRole === 'admin' ? (
                  <Shield className="w-8 h-8 text-white" />
                ) : (
                  <svg className="w-8 h-8 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                    <circle cx="12" cy="12" r="1"/>
                    <path d="M12 1v6m8.66 2.34l-4.24 4.24m0 5.64l4.24 4.24M12 17v6m-8.66-2.34l4.24-4.24m0-5.64L3.34 3.34M1 12h6m11 0h6"/>
                  </svg>
                )}
              </div>
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Zen Gauge</h1>
            <p className="text-purple-200">
              {userRole === 'admin' 
                ? 'Admin Dashboard Access' 
                : (isLoginMode ? 'Welcome Back' : 'Join the Journey')
              }
            </p>
          </div>

          {/* Role Toggle */}
          <div className="flex bg-slate-700/50 rounded-xl p-1 mb-6">
            <button
              type="button"
              onClick={() => {
                setUserRole('user');
                setError('');
                setFormData({ username: '', email: '', password: '', confirmPassword: '' });
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
                userRole === 'user'
                  ? 'bg-gradient-to-r from-purple-600 to-pink-600 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <User size={18} />
              User
            </button>
            <button
              type="button"
              onClick={() => {
                setUserRole('admin');
                setIsLoginMode(true);
                setError('');
                setFormData({ username: '', email: '', password: '', confirmPassword: '' });
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-lg font-semibold transition-all ${
                userRole === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-white shadow-lg'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Shield size={18} />
              Admin
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg text-red-400 text-sm">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Username Field (Sign Up Only for Users) */}
            {!isLoginMode && userRole === 'user' && (
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Username
                </label>
                <input
                  type="text"
                  name="username"
                  value={formData.username}
                  onChange={handleInputChange}
                  placeholder="Choose your username"
                  className="w-full px-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>
            )}

            {/* Email Field */}
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                {userRole === 'admin' ? 'Admin Email' : 'Email Address'}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-3.5 w-5 h-5 text-purple-400" />
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder={userRole === 'admin' ? 'admin@zengauge.com' : 'your@email.com'}
                  className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-sm font-medium text-purple-200 mb-2">
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-4 top-3.5 w-5 h-5 text-purple-400" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••••"
                  className="w-full pl-12 pr-12 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-purple-400 hover:text-purple-300 transition"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Sign Up Only for Users) */}
            {!isLoginMode && userRole === 'user' && (
              <div>
                <label className="block text-sm font-medium text-purple-200 mb-2">
                  Confirm Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-4 top-3.5 w-5 h-5 text-purple-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={formData.confirmPassword}
                    onChange={handleInputChange}
                    placeholder="••••••••"
                    className="w-full pl-12 pr-4 py-3 bg-slate-700/50 border border-purple-500/30 rounded-lg text-white placeholder-slate-400 focus:outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-500/20 transition"
                  />
                </div>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 ${
                userRole === 'admin'
                  ? 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600'
                  : 'bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700'
              } disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-lg transition flex items-center justify-center gap-2 mt-6`}
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  {userRole === 'admin' ? (
                    <>
                      <Shield className="w-5 h-5" />
                      Access Dashboard
                    </>
                  ) : isLoginMode ? (
                    <>
                      <LogIn className="w-5 h-5" />
                      Sign In
                    </>
                  ) : (
                    <>
                      <UserPlus className="w-5 h-5" />
                      Create Account
                    </>
                  )}
                </>
              )}
            </button>
          </form>

          {/* Toggle Mode (Users Only) */}
          {userRole === 'user' && (
            <div className="mt-6 text-center">
              <p className="text-slate-300 text-sm">
                {isLoginMode ? "Don't have an account?" : 'Already have an account?'}
                <button
                  type="button"
                  onClick={() => {
                    setIsLoginMode(!isLoginMode);
                    setError('');
                    setFormData({ username: '', email: '', password: '', confirmPassword: '' });
                  }}
                  className="ml-2 text-purple-400 hover:text-purple-300 font-semibold transition"
                >
                  {isLoginMode ? 'Sign Up' : 'Sign In'}
                </button>
              </p>
            </div>
          )}

          {/* Credentials Info */}
          <div className="mt-6 p-4 bg-slate-700/30 border border-purple-500/20 rounded-lg">
            {userRole === 'admin' ? (
              <>
                <p className="text-xs text-slate-300 mb-2 flex items-center gap-1">
                  <Shield size={12} className="text-amber-400" /> Admin Credentials:
                </p>
                <p className="text-xs text-amber-300 font-mono">Email: admin@zengauge.com</p>
                <p className="text-xs text-amber-300 font-mono">Password: admin123</p>
              </>
            ) : (
              <>
                <p className="text-xs text-slate-300 mb-2">Demo User Credentials:</p>
                <p className="text-xs text-purple-300 font-mono">Email: demo@zengauge.com</p>
                <p className="text-xs text-purple-300 font-mono">Password: demo123</p>
              </>
            )}
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style>{`
        @keyframes blob {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }
        .animate-blob {
          animation: blob 7s infinite;
        }
        .animation-delay-2000 {
          animation-delay: 2s;
        }
        .animation-delay-4000 {
          animation-delay: 4s;
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
