import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, User, Mail, Lock, UserPlus, AlertCircle } from 'lucide-react';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'user'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
    if (error) setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    const result = await register(
      formData.name,
      formData.email,
      formData.password,
      formData.role
    );

    if (result.success) {
      navigate('/dashboard');
    } else {
      setError(result.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-950 px-4 relative overflow-hidden">
      {/* Background Ambient Glows */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-brand-500/10 rounded-full blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md animate-fade-in">
        {/* Logo Section */}
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 mb-3">
            <Activity className="w-6 h-6 text-white" />
          </div>
          <h2 className="text-3xl font-extrabold tracking-tight font-outfit text-white">
            Get Started
          </h2>
          <p className="text-dark-400 text-sm mt-1">
            Build your API observability foundation
          </p>
        </div>

        {/* Register Card */}
        <div className="glass-panel rounded-3xl p-8 shadow-2xl relative">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200 font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Full Name
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-50">
                  <User className="w-5 h-5 text-dark-500" />
                </span>
                <input
                  type="text"
                  name="name"
                  required
                  placeholder="John Doe"
                  value={formData.name}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-dark-900/50 border border-dark-800 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-white placeholder-dark-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Email Address
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-50">
                  <Mail className="w-5 h-5 text-dark-500" />
                </span>
                <input
                  type="email"
                  name="email"
                  required
                  placeholder="name@company.com"
                  value={formData.email}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-dark-900/50 border border-dark-800 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-white placeholder-dark-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Password
              </label>
              <div className="relative">
                <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-dark-50">
                  <Lock className="w-5 h-5 text-dark-500" />
                </span>
                <input
                  type="password"
                  name="password"
                  required
                  placeholder="At least 6 characters"
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full pl-11 pr-4 py-3 bg-dark-900/50 border border-dark-800 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-white placeholder-dark-500 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Account Role
              </label>
              <select
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-dark-900/50 border border-dark-800 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 transition-all text-white text-sm"
              >
                <option value="user" className="bg-dark-950">Observatory User (View & Manage)</option>
                <option value="admin" className="bg-dark-950">Observatory Admin (Full Access)</option>
              </select>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-4 mt-2 rounded-2xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 transition-all duration-300 shadow-lg shadow-brand-600/20 hover:shadow-brand-500/40 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <UserPlus className="w-4 h-4" />
                  Create Account
                </>
              )}
            </button>
          </form>

          <div className="mt-8 text-center">
            <p className="text-sm text-dark-400">
              Already have an account?{' '}
              <Link
                to="/login"
                className="text-brand-400 hover:text-brand-300 font-semibold transition-colors duration-200"
              >
                Sign In
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;
