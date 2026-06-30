import React, { useState, useEffect } from 'react';
import { X, ShieldAlert, Check, AlertTriangle, Calendar, Clock, ChevronRight, Sparkles } from 'lucide-react';
import api from '../services/api';

const IncidentDetailModal = ({ isOpen, onClose, incidentId, onActionComplete }) => {
  const [incident, setIncident] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Resolution form states
  const [rootCause, setRootCause] = useState('');
  const [resolutionNotes, setResolutionNotes] = useState('');
  
  // AI Assistant states
  const [aiAnalysis, setAiAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchIncidentDetails = async () => {
    if (!incidentId) return;
    try {
      setLoading(true);
      const res = await api.get(`/incidents/${incidentId}`);
      if (res.data.success) {
        setIncident(res.data.data);
        // Pre-fill if already resolved
        if (res.data.data.status === 'RESOLVED') {
          setRootCause(res.data.data.rootCause || '');
          setResolutionNotes(res.data.data.resolutionNotes || '');
        } else {
          setRootCause('');
          setResolutionNotes('');
        }
      }
    } catch (err) {
      console.error('Failed to load incident details:', err);
      setError('Failed to load incident details');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && incidentId) {
      fetchIncidentDetails();
      setError('');
      setAiAnalysis(null);
    }
  }, [incidentId, isOpen]);

  if (!isOpen) return null;

  // Acknowledge incident handler
  const handleAcknowledge = async () => {
    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/incidents/${incidentId}/acknowledge`);
      if (res.data.success) {
        await fetchIncidentDetails();
        if (onActionComplete) onActionComplete();
      }
    } catch (err) {
      console.error('Acknowledge failed:', err);
      setError(err.response?.data?.message || 'Failed to acknowledge incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolve incident handler
  const handleResolve = async (e) => {
    e.preventDefault();
    if (!rootCause.trim() || !resolutionNotes.trim()) {
      setError('Please provide root cause and resolution notes');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      const res = await api.post(`/incidents/${incidentId}/resolve`, {
        rootCause,
        resolutionNotes
      });
      if (res.data.success) {
        await fetchIncidentDetails();
        if (onActionComplete) onActionComplete();
      }
    } catch (err) {
      console.error('Resolution failed:', err);
      setError(err.response?.data?.message || 'Failed to resolve incident');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAIAnalysis = async () => {
    setAnalyzing(true);
    setError('');
    try {
      const res = await api.post(`/analytics/incident/${incidentId}/analyze`);
      if (res.data.success) {
        setAiAnalysis(res.data.analysis);
      }
    } catch (err) {
      console.error('AI Analysis failed:', err);
      setError('AI root cause analysis failed. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  // Status Badge configurations
  const getStatusBadge = (status) => {
    switch (status) {
      case 'OPEN':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400">OPEN</span>;
      case 'ACKNOWLEDGED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">ACKNOWLEDGED</span>;
      case 'RESOLVED':
        return <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">RESOLVED</span>;
      default:
        return null;
    }
  };

  const getTimelineDotColor = (type) => {
    switch (type) {
      case 'TRIGGERED': return 'bg-rose-500 ring-rose-500/20';
      case 'ACKNOWLEDGED': return 'bg-amber-500 ring-amber-500/20';
      case 'RESOLVED': return 'bg-emerald-500 ring-emerald-500/20';
      default: return 'bg-blue-500 ring-blue-500/20';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-2xl rounded-3xl overflow-hidden shadow-2xl animate-fade-in border border-dark-800 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-800 shrink-0">
          <div className="flex items-center gap-3">
            <h3 className="text-xl font-bold font-outfit text-white">
              Incident Management Console
            </h3>
            {incident && getStatusBadge(incident.status)}
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-xl bg-dark-900 border border-dark-800 text-dark-400 hover:text-white hover:border-brand-500/30 transition-all duration-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : incident ? (
          /* Modal Body - Scrollable content */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {error && (
              <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                <div className="text-sm text-red-200 font-medium">{error}</div>
              </div>
            )}

            {/* API Outage Summary Card */}
            <div className="p-5 rounded-2xl bg-dark-900/50 border border-dark-850 space-y-4">
              <div>
                <h4 className="text-xs font-mono tracking-widest text-dark-400 uppercase">Monitored Service</h4>
                <h5 className="text-lg font-bold text-white mt-1">{incident.monitorId?.name || 'Unknown API'}</h5>
                <a href={incident.monitorId?.url} target="_blank" rel="noreferrer" className="text-xs text-brand-400 font-mono mt-0.5 inline-block hover:underline">{incident.monitorId?.url}</a>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 border-t border-dark-800/40 pt-4">
                <div className="text-xs space-y-1">
                  <span className="text-dark-500 font-mono block">OUTAGE STARTED</span>
                  <span className="text-white font-medium flex items-center gap-1.5 mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-dark-400" />
                    {new Date(incident.downtimeStart).toLocaleString()}
                  </span>
                </div>

                <div className="text-xs space-y-1">
                  <span className="text-dark-500 font-mono block">OUTAGE RESOLVED</span>
                  <span className="text-white font-medium flex items-center gap-1.5 mt-0.5">
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                    {incident.downtimeEnd ? new Date(incident.downtimeEnd).toLocaleString() : 'Ongoing Outage'}
                  </span>
                </div>
              </div>

              <div className="border-t border-dark-800/40 pt-4">
                <span className="text-xs text-dark-500 font-mono block">OUTAGE REPORT MESSAGE</span>
                <p className="text-sm text-white/90 font-medium mt-1 leading-relaxed">{incident.message}</p>
              </div>
            </div>

            {/* Action forms based on status */}
            {incident.status === 'OPEN' && (
              <div className="p-5 rounded-2xl bg-brand-500/5 border border-brand-500/10 flex items-center justify-between gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white">Acknowledge Incident</h4>
                  <p className="text-xs text-dark-400 mt-0.5">Assign this alert to yourself to mark it as actively in progress.</p>
                </div>
                <button
                  onClick={handleAcknowledge}
                  disabled={isSubmitting}
                  className="px-4 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-brand-500/10 disabled:opacity-50"
                >
                  <ShieldAlert className="w-4 h-4" />
                  Acknowledge
                </button>
              </div>
            )}

            {(incident.status === 'OPEN' || incident.status === 'ACKNOWLEDGED') && (
              <div className="p-5 rounded-2xl bg-dark-900/30 border border-dark-850">
                <h4 className="text-sm font-bold text-white border-b border-dark-850 pb-3">
                  Document Outage Resolution
                </h4>
                
                <form onSubmit={handleResolve} className="space-y-4 mt-4">
                  <div>
                    <label className="block text-[10px] font-mono tracking-wider text-dark-350 uppercase mb-2">
                      Root Cause
                    </label>
                    <input
                      type="text"
                      value={rootCause}
                      onChange={(e) => setRootCause(e.target.value)}
                      placeholder="e.g. Upstream database server CPU exhaustion"
                      className="w-full px-4 py-2.5 bg-dark-900/50 border border-dark-800 rounded-xl text-white text-xs focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-mono tracking-wider text-dark-350 uppercase mb-2">
                      Resolution Notes
                    </label>
                    <textarea
                      rows="3"
                      value={resolutionNotes}
                      onChange={(e) => setResolutionNotes(e.target.value)}
                      placeholder="Detail the manual fixes, hotpatching, or auto-reboots that resolved the issue..."
                      className="w-full px-4 py-2.5 bg-dark-900/50 border border-dark-800 rounded-xl text-white text-xs focus:outline-none focus:border-brand-500 resize-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-emerald-600/10 disabled:opacity-50 ml-auto"
                  >
                    <Check className="w-4 h-4" />
                    Resolve Incident
                  </button>
                </form>
              </div>
            )}

            {/* Resolved Incident logs details display */}
            {incident.status === 'RESOLVED' && (
              <div className="p-5 rounded-2xl bg-dark-900/30 border border-dark-850 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <h4 className="text-sm font-bold text-white border-b border-dark-850 pb-2">
                    Post-Mortem Analysis
                  </h4>
                </div>
                <div>
                  <span className="text-xs text-dark-500 font-mono block">ROOT CAUSE</span>
                  <p className="text-xs text-white/90 mt-1 leading-relaxed font-semibold">
                    {incident.rootCause || 'No root cause logged.'}
                  </p>
                </div>
                <div>
                  <span className="text-xs text-dark-500 font-mono block">RESOLUTION NOTES</span>
                  <p className="text-xs text-white/90 mt-1 leading-relaxed font-semibold">
                    {incident.resolutionNotes || 'No resolution notes logged.'}
                  </p>
                </div>
              </div>
            )}

            {/* AI Post-Mortem Diagnostics board */}
            <div className="p-5 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-brand-400 animate-pulse" />
                  <div>
                    <h4 className="text-sm font-bold text-white">AI Root Cause Assistant</h4>
                    <p className="text-[10px] text-dark-400 mt-0.5">Diagnose outages & compile optimization advice</p>
                  </div>
                </div>
                {!aiAnalysis && (
                  <button
                    onClick={handleAIAnalysis}
                    disabled={analyzing}
                    className="px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-semibold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-brand-500/10 disabled:opacity-50 shrink-0"
                  >
                    {analyzing ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Analyzing...
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-3.5 h-3.5" />
                        Analyze Incident
                      </>
                    )}
                  </button>
                )}
              </div>

              {aiAnalysis && (
                <div className="space-y-4 pt-2 border-t border-dark-850 animate-fade-in">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-3 bg-dark-950/40 border border-dark-850 rounded-xl">
                      <span className="text-[10px] text-brand-300 font-mono block uppercase">Probable Root Cause</span>
                      <p className="text-xs text-white/90 mt-1 leading-relaxed font-semibold">
                        {aiAnalysis.rootCause}
                      </p>
                    </div>
                    <div className="p-3 bg-dark-950/40 border border-dark-850 rounded-xl">
                      <span className="text-[10px] text-indigo-300 font-mono block uppercase">Performance Explanation</span>
                      <p className="text-xs text-white/90 mt-1 leading-relaxed font-semibold">
                        {aiAnalysis.performanceExplanation}
                      </p>
                    </div>
                  </div>
                  <div className="p-3 bg-dark-950/40 border border-dark-850 rounded-xl">
                    <span className="text-[10px] text-emerald-300 font-mono block uppercase mb-1">SRE Optimization Recommendations</span>
                    <ul className="space-y-1.5 list-disc list-inside">
                      {aiAnalysis.recommendations.map((rec, idx) => (
                        <li key={idx} className="text-xs text-white/80 font-medium">
                          {rec}
                        </li>
                      ))}
                    </ul>
                  </div>
                  <div className="flex justify-end">
                    <button
                      onClick={handleAIAnalysis}
                      disabled={analyzing}
                      className="text-[10px] text-brand-400 hover:text-brand-300 flex items-center gap-1 font-mono transition-colors"
                    >
                      <Sparkles className="w-3 h-3" />
                      {analyzing ? 'Re-analyzing...' : 'Re-run AI Diagnosis'}
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Vertical Incident Timeline Display */}
            <div className="space-y-4">
              <h4 className="font-outfit font-bold text-sm text-white">Incident Activity Timeline</h4>
              
              <div className="relative pl-6 border-l border-dark-800 space-y-6">
                {incident.timeline && incident.timeline.length > 0 ? (
                  incident.timeline.map((event, idx) => (
                    <div key={event._id || idx} className="relative group">
                      
                      {/* Timeline dot */}
                      <span className={`absolute -left-[31px] top-1.5 w-3 h-3 rounded-full ring-4 ${getTimelineDotColor(event.type)}`}></span>
                      
                      <div className="flex flex-col gap-0.5 text-xs">
                        <span className="text-white font-semibold group-hover:text-brand-300 transition-colors">
                          {event.message}
                        </span>
                        <span className="text-dark-500 font-mono text-[10px] flex items-center gap-1.5 mt-0.5">
                          <Clock className="w-3 h-3" />
                          {new Date(event.timestamp).toLocaleString()}
                        </span>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-dark-500">No activity logged.</p>
                )}
              </div>
            </div>

          </div>
        ) : (
          <div className="p-8 text-center text-dark-400">Incident log not available.</div>
        )}
      </div>
    </div>
  );
};

export default IncidentDetailModal;
