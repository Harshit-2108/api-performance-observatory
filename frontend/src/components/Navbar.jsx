import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Activity, LogOut, Shield } from 'lucide-react';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <nav className="glass-panel border-b border-dark-800 sticky top-0 z-50 px-6 py-4">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        {/* Brand Identity */}
        <Link to="/" className="flex items-center gap-2 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-all duration-300">
            <Activity className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <h1 className="font-outfit font-extrabold text-lg tracking-wider text-white group-hover:text-brand-300 transition-colors duration-300">
              OBSERVATORY
            </h1>
            <p className="text-[10px] text-dark-400 font-mono tracking-widest leading-none">
              API PERFORMANCE
            </p>
          </div>
        </Link>

        {/* User context or Auth actions */}
        <div className="flex items-center gap-6">
          <Link
            to="/status"
            className="text-xs font-mono text-dark-400 hover:text-white transition-colors"
          >
            Public Status
          </Link>
          {user && (
            <Link
              to="/reports"
              className="text-xs font-mono text-dark-400 hover:text-white transition-colors"
            >
              SLA Reports
            </Link>
          )}
          {user ? (
            <>
              <div className="hidden sm:flex flex-col items-end">
                <span className="text-sm font-semibold text-white">{user.name}</span>
                <span className="text-[11px] text-dark-400 font-mono flex items-center gap-1">
                  {user.role === 'admin' && <Shield className="w-3 h-3 text-brand-400" />}
                  {user.role.toUpperCase()}
                </span>
              </div>
              
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-dark-900 border border-dark-800 text-dark-300 hover:text-white hover:bg-dark-800 hover:border-brand-500/30 transition-all duration-300 text-sm font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </>
          ) : (
            <div className="flex items-center gap-3">
              <Link
                to="/login"
                className="text-sm font-medium text-dark-300 hover:text-white transition-colors duration-200"
              >
                Sign In
              </Link>
              <Link
                to="/register"
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm transition-all duration-300 shadow-md shadow-brand-600/10 hover:shadow-brand-500/25"
              >
                Register
              </Link>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
