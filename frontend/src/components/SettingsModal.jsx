import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle, Check } from 'lucide-react';
import api from '../services/api';

const SettingsModal = ({ isOpen, onClose, user, onUpdate }) => {
  const [emailEnabled, setEmailEnabled] = useState(true);
  const [slowThreshold, setSlowThreshold] = useState(1500);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (user && user.notificationPreferences) {
      setEmailEnabled(user.notificationPreferences.emailEnabled ?? true);
      setSlowThreshold(user.notificationPreferences.slowThreshold ?? 1500);
    }
    setError('');
    setSuccess(false);
  }, [user, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);
    setIsSubmitting(true);

    if (slowThreshold < 100) {
      setError('Slow threshold must be at least 100ms');
      setIsSubmitting(false);
      return;
    }

    try {
      const res = await api.put('/users/preferences', {
        emailEnabled,
        slowThreshold: Number(slowThreshold)
      });

      if (res.data.success) {
        setSuccess(true);
        // Call callback to sync user session state in AuthContext
        if (onUpdate) {
          onUpdate(res.data.user);
        }
        setTimeout(() => {
          onClose();
        }, 1000);
      }
    } catch (err) {
      console.error('Failed to update alert settings:', err);
      setError(err.response?.data?.message || 'Failed to update configurations');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-md rounded-3xl overflow-hidden shadow-2xl animate-fade-in border border-dark-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-800">
          <h3 className="text-xl font-bold font-outfit text-white">
            Alert & Notification Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-900 border border-dark-800 text-dark-400 hover:text-white hover:border-brand-500/30 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="text-sm text-red-200 font-medium">{error}</div>
            </div>
          )}

          {success && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
              <div className="text-sm text-emerald-200 font-medium">Settings saved successfully!</div>
            </div>
          )}

          {/* Preferences inputs */}
          <div className="space-y-5">
            {/* Email Notifications Toggle */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-dark-900/40 border border-dark-800">
              <div>
                <h4 className="text-sm font-semibold text-white">Email Alerting</h4>
                <p className="text-xs text-dark-450 mt-0.5">Receive email alerts on status changes</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={emailEnabled}
                  onChange={(e) => setEmailEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-dark-850 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-dark-400 after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-600 peer-checked:after:bg-white"></div>
              </label>
            </div>

            {/* Slow response latency trigger */}
            <div>
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Slow Latency Alert Limit (ms)
              </label>
              <input
                type="number"
                name="slowThreshold"
                value={slowThreshold}
                onChange={(e) => setSlowThreshold(e.target.value)}
                placeholder="1500"
                className="w-full px-4 py-3 bg-dark-900/50 border border-dark-800 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-white text-sm transition-all"
              />
              <p className="text-[11px] text-dark-500 mt-1.5 leading-relaxed">
                Triggers performance warning alert emails when an API response exceeds this latency check parameter.
              </p>
            </div>
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-dark-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-dark-900 border border-dark-800 text-dark-300 hover:text-white hover:bg-dark-800 transition-all text-sm font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium text-sm flex items-center gap-1.5 transition-all shadow-md shadow-brand-600/10 hover:shadow-brand-500/20"
            >
              {isSubmitting ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Preferences
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SettingsModal;
