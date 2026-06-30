import React, { useState, useEffect } from 'react';
import { X, Save, AlertCircle } from 'lucide-react';

const MonitorFormModal = ({ isOpen, onClose, onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: '',
    url: '',
    method: 'GET',
    interval: 5,
    expectedStatus: 200,
    description: '',
    tags: ''
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        url: initialData.url || '',
        method: initialData.method || 'GET',
        interval: initialData.interval || 5,
        expectedStatus: initialData.expectedStatus || 200,
        description: initialData.description || '',
        tags: Array.isArray(initialData.tags) ? initialData.tags.join(', ') : ''
      });
    } else {
      setFormData({
        name: '',
        url: '',
        method: 'GET',
        interval: 5,
        expectedStatus: 200,
        description: '',
        tags: ''
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  if (!isOpen) return null;

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({
      ...formData,
      [name]: value
    });
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Monitor name is required';
    }

    if (!formData.url.trim()) {
      newErrors.url = 'Endpoint URL is required';
    } else {
      // Basic URL format validation
      const urlPattern = /^(https?:\/\/)[^\s/$.?#].[^\s]*$/i;
      if (!urlPattern.test(formData.url.trim())) {
        newErrors.url = 'Must be a valid URL starting with http:// or https://';
      }
    }

    if (!formData.interval || formData.interval < 1) {
      newErrors.interval = 'Interval must be at least 1 minute';
    }

    if (!formData.expectedStatus || formData.expectedStatus < 100 || formData.expectedStatus > 599) {
      newErrors.expectedStatus = 'Status code must be between 100 and 599';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    // Parse tags back into array of strings
    const processedTags = formData.tags
      ? formData.tags.split(',').map((t) => t.trim()).filter((t) => t.length > 0)
      : [];

    const submitPayload = {
      ...formData,
      interval: Number(formData.interval),
      expectedStatus: Number(formData.expectedStatus),
      tags: processedTags
    };

    const success = await onSubmit(submitPayload);
    setIsSubmitting(false);

    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fade-in border border-dark-800">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-800">
          <h3 className="text-xl font-bold font-outfit text-white">
            {initialData ? 'Edit Monitored API' : 'Register New API Monitor'}
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-900 border border-dark-800 text-dark-400 hover:text-white hover:border-brand-500/30 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body / Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Monitor Name */}
            <div className="md:col-span-2">
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Monitor Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g. Stripe Payments Gateway"
                className={`w-full px-4 py-3 bg-dark-900/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-white text-sm transition-all ${
                  errors.name ? 'border-red-500/50 focus:border-red-500' : 'border-dark-800 focus:border-brand-500'
                }`}
              />
              {errors.name && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.name}
                </p>
              )}
            </div>

            {/* Target URL */}
            <div className="md:col-span-2">
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Endpoint URL
              </label>
              <input
                type="text"
                name="url"
                value={formData.url}
                onChange={handleChange}
                placeholder="https://api.myplatform.com/v1/health"
                className={`w-full px-4 py-3 bg-dark-900/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-white text-sm transition-all ${
                  errors.url ? 'border-red-500/50 focus:border-red-500' : 'border-dark-800 focus:border-brand-500'
                }`}
              />
              {errors.url && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.url}
                </p>
              )}
            </div>

            {/* HTTP Method */}
            <div>
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                HTTP Method
              </label>
              <select
                name="method"
                value={formData.method}
                onChange={handleChange}
                className="w-full px-4 py-3 bg-dark-900 border border-dark-800 rounded-2xl text-white text-sm focus:outline-none focus:border-brand-500"
              >
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="PUT">PUT</option>
                <option value="DELETE">DELETE</option>
              </select>
            </div>

            {/* Interval */}
            <div>
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Polling Interval (Mins)
              </label>
              <input
                type="number"
                name="interval"
                min="1"
                max="60"
                value={formData.interval}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-dark-900/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-white text-sm transition-all ${
                  errors.interval ? 'border-red-500/50 focus:border-red-500' : 'border-dark-800 focus:border-brand-500'
                }`}
              />
              {errors.interval && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.interval}
                </p>
              )}
            </div>

            {/* Expected Status */}
            <div>
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Expected Status Code
              </label>
              <input
                type="number"
                name="expectedStatus"
                placeholder="200"
                value={formData.expectedStatus}
                onChange={handleChange}
                className={`w-full px-4 py-3 bg-dark-900/50 border rounded-2xl focus:outline-none focus:ring-2 focus:ring-brand-500/20 text-white text-sm transition-all ${
                  errors.expectedStatus ? 'border-red-500/50 focus:border-red-500' : 'border-dark-800 focus:border-brand-500'
                }`}
              />
              {errors.expectedStatus && (
                <p className="text-xs text-red-400 flex items-center gap-1 mt-1.5 font-medium">
                  <AlertCircle className="w-3.5 h-3.5" />
                  {errors.expectedStatus}
                </p>
              )}
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Tags (Comma-separated)
              </label>
              <input
                type="text"
                name="tags"
                value={formData.tags}
                onChange={handleChange}
                placeholder="stripe, core, production"
                className="w-full px-4 py-3 bg-dark-900/50 border border-dark-800 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-white text-sm transition-all"
              />
            </div>

            {/* Description */}
            <div className="md:col-span-2">
              <label className="block text-xs font-mono tracking-widest text-dark-300 uppercase mb-2">
                Description
              </label>
              <textarea
                name="description"
                rows="3"
                value={formData.description}
                onChange={handleChange}
                placeholder="Details about what this service API represents..."
                className="w-full px-4 py-3 bg-dark-900/50 border border-dark-800 rounded-2xl focus:outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 text-white text-sm transition-all resize-none"
              />
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
                  Save Monitor
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default MonitorFormModal;
