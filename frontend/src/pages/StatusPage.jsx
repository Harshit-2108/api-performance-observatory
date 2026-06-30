import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import {
  CheckCircle,
  AlertTriangle,
  Clock,
  ExternalLink,
  ShieldAlert,
  ChevronRight,
  Database,
  ArrowLeft
} from 'lucide-react';

const StatusPage = () => {
  const [statusData, setStatusData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPublicStatus = async () => {
    try {
      setLoading(true);
      // Directly hit the public endpoint (bypasses auth headers)
      const res = await axios.get('http://localhost:5000/api/public/status');
      if (res.data.success) {
        setStatusData(res.data);
      }
    } catch (err) {
      console.error('Failed to load public status details:', err);
      setError('Unable to fetch live status. Please check connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPublicStatus();
    // Poll public status details every 2 minutes
    const interval = setInterval(fetchPublicStatus, 120000);
    return () => clearInterval(interval);
  }, []);

  const getOverallBanner = (status, msg) => {
    switch (status) {
      case 'ALL_SYSTEMS_OPERATIONAL':
        return (
          <div className="p-6 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-4 shadow-lg shadow-emerald-500/5">
            <div className="p-2.5 bg-emerald-500/20 text-emerald-400 rounded-2xl shrink-0">
              <CheckCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-outfit text-white">All Systems Operational</h3>
              <p className="text-sm text-emerald-300 mt-0.5">{msg}</p>
            </div>
          </div>
        );
      case 'DEGRADED_PERFORMANCE':
        return (
          <div className="p-6 rounded-3xl bg-amber-500/10 border border-amber-500/20 flex items-center gap-4 shadow-lg shadow-amber-500/5">
            <div className="p-2.5 bg-amber-500/20 text-amber-400 rounded-2xl shrink-0">
              <Clock className="w-8 h-8 animate-pulse" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-outfit text-white">Degraded Performance</h3>
              <p className="text-sm text-amber-300 mt-0.5">{msg}</p>
            </div>
          </div>
        );
      case 'MAJOR_OUTAGE':
        return (
          <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 flex items-center gap-4 shadow-lg shadow-rose-500/5">
            <div className="p-2.5 bg-rose-500/20 text-rose-400 rounded-2xl shrink-0">
              <ShieldAlert className="w-8 h-8 animate-bounce" />
            </div>
            <div>
              <h3 className="text-xl font-bold font-outfit text-white">Partial Service Outage</h3>
              <p className="text-sm text-rose-300 mt-0.5">{msg}</p>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case 'UP':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">OPERATIONAL</span>;
      case 'DOWN':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-500/10 border border-rose-500/20 text-rose-400">OUTAGE</span>;
      case 'DEGRADED':
        return <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/10 border border-amber-500/20 text-amber-400">DEGRADED</span>;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col font-sans text-dark-200">
      
      {/* Public Header */}
      <header className="px-6 py-5 border-b border-dark-900 bg-dark-950/40 backdrop-blur-md sticky top-0 z-45">
        <div className="max-w-4xl w-full mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Database className="w-6 h-6 text-brand-500" />
            <h1 className="text-lg font-bold font-outfit text-white tracking-tight">
              API Status Observatory
            </h1>
          </div>
          <Link
            to="/login"
            className="text-xs font-mono text-dark-400 hover:text-white transition-colors flex items-center gap-1"
          >
            Sign In Console
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-6 py-12 space-y-10 animate-fade-in">
        {loading ? (
          <div className="flex flex-col items-center justify-center py-32 gap-3">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs text-dark-500 font-mono">RETRIEVING PLATFORM METRICS...</p>
          </div>
        ) : error ? (
          <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4">
            <p className="text-sm text-rose-200 font-semibold">{error}</p>
            <button
              onClick={fetchPublicStatus}
              className="px-4 py-2 bg-dark-900 border border-dark-800 text-white rounded-xl text-xs hover:border-brand-500 transition-colors"
            >
              Retry Connection
            </button>
          </div>
        ) : statusData ? (
          <>
            {/* 1. Overall Status Indicator Banner */}
            {getOverallBanner(statusData.overallStatus, statusData.overallMessage)}

            {/* 2. Active Incident banner details */}
            {statusData.activeIncidents.length > 0 && (
              <div className="space-y-4">
                <h4 className="text-xs font-mono tracking-widest text-dark-400 uppercase">Active Incidents</h4>
                {statusData.activeIncidents.map((incident) => (
                  <div
                    key={incident._id}
                    className="p-5 rounded-2xl bg-rose-500/5 border border-rose-500/10 space-y-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-white text-sm">{incident.monitorId?.name || 'Affected API Service'}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-500/20 text-rose-300 rounded">ONGOING OUTAGE</span>
                    </div>
                    <p className="text-xs text-rose-100 leading-relaxed font-semibold">{incident.message}</p>
                    <div className="text-[10px] text-dark-500 font-mono pt-1">
                      Outage started: {new Date(incident.downtimeStart).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 3. Operational Services listing */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono tracking-widest text-dark-400 uppercase">Monitor Health</h4>
              
              <div className="glass-panel rounded-3xl border border-dark-850 p-6 divide-y divide-dark-850 space-y-6">
                {statusData.services.map((service, sIdx) => (
                  <div key={service._id} className={`pt-6 first:pt-0 space-y-4`}>
                    
                    {/* Header line */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-white text-sm">{service.name}</h3>
                        <a
                          href={service.url}
                          target="_blank"
                          rel="noreferrer"
                          className="text-[11px] text-dark-500 font-mono hover:text-brand-400 flex items-center gap-1 mt-0.5"
                        >
                          {service.url}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                      <div className="flex items-center gap-4">
                        <span className="text-xs text-dark-400 font-mono">{service.uptime30d}% uptime</span>
                        {getStatusBadge(service.status)}
                      </div>
                    </div>

                    {/* Timeline grid (30 ticks representing 30 days) */}
                    <div>
                      <div className="h-6 flex items-center justify-between gap-1 w-full">
                        {service.dailyHistory.map((day, dIdx) => {
                          let colorClass = 'bg-emerald-500/80 hover:bg-emerald-400';
                          if (day.status === 'DOWN') colorClass = 'bg-rose-500 hover:bg-rose-400';
                          else if (day.status === 'DEGRADED') colorClass = 'bg-amber-500 hover:bg-amber-400';

                          return (
                            <div
                              key={day.date}
                              className={`flex-1 h-5 rounded-sm relative group cursor-pointer transition-colors duration-150 ${colorClass}`}
                            >
                              {/* Simple CSS Tooltip */}
                              <div className="absolute bottom-full mb-1.5 left-1/2 -translate-x-1/2 hidden group-hover:block bg-dark-900 border border-dark-800 text-[10px] text-white p-2 rounded-xl font-mono shrink-0 whitespace-nowrap shadow-2xl z-50">
                                <div>Date: {day.date}</div>
                                <div className="mt-0.5">Status: <span className="font-bold">{day.status}</span></div>
                              </div>
                            </div>
                          );
                        })}
                      </div>

                      {/* Timeline footer grid labels */}
                      <div className="flex items-center justify-between text-[10px] text-dark-500 font-mono mt-2">
                        <span>30 days ago</span>
                        <span className="w-16 h-[1px] bg-dark-850"></span>
                        <span>Today</span>
                      </div>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* 4. Recent Outages Post-Mortem history Log */}
            <div className="space-y-4">
              <h4 className="text-xs font-mono tracking-widest text-dark-400 uppercase">Recent Incidents</h4>
              
              <div className="space-y-4">
                {statusData.recentIncidents.length > 0 ? (
                  statusData.recentIncidents.map((incident) => {
                    const isResolved = incident.status === 'RESOLVED';
                    const isSlow = incident.type === 'SLOW';
                    const dateObj = new Date(incident.downtimeStart);

                    let label = 'OUTAGE TRIGGERED';
                    let borderClass = 'border-rose-500/10 bg-rose-500/5';
                    let textClass = 'text-rose-450';
                    
                    if (isSlow) {
                      label = 'PERFORMANCE DEGRADATION';
                      borderClass = 'border-amber-500/10 bg-amber-500/5';
                      textClass = 'text-amber-450';
                    } else if (isResolved) {
                      label = 'RESOLVED';
                      borderClass = 'border-dark-850 bg-dark-900/40';
                      textClass = 'text-emerald-450';
                    }

                    return (
                      <div
                        key={incident._id}
                        className={`p-6 rounded-3xl border space-y-4 ${borderClass}`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono text-dark-400">{dateObj.toLocaleDateString()}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded bg-dark-950/60 ${textClass}`}>
                            {label}
                          </span>
                        </div>

                        <div>
                          <h4 className="font-bold text-white text-sm">
                            {incident.monitorId?.name || 'Affected API Service'}
                          </h4>
                          <p className="text-xs text-dark-350 mt-1 leading-relaxed">{incident.message}</p>
                        </div>

                        {isResolved && (incident.resolutionNotes || incident.rootCause) && (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-3 border-t border-dark-850/50 text-xs">
                            {incident.rootCause && (
                              <div>
                                <span className="text-dark-500 font-mono block">ROOT CAUSE</span>
                                <p className="text-white/80 mt-0.5 leading-relaxed">{incident.rootCause}</p>
                              </div>
                            )}
                            {incident.resolutionNotes && (
                              <div>
                                <span className="text-dark-500 font-mono block">RESOLUTION NOTES</span>
                                <p className="text-white/80 mt-0.5 leading-relaxed">{incident.resolutionNotes}</p>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 rounded-3xl bg-dark-900/20 border border-dark-850 text-center text-xs text-dark-500 font-mono">
                    NO INCIDENTS REPORTED IN THE PAST 7 DAYS.
                  </div>
                )}
              </div>
            </div>
          </>
        ) : null}
      </main>

      {/* Public Footer */}
      <footer className="py-8 border-t border-dark-900 text-center text-xs text-dark-500 shrink-0">
        <div className="max-w-4xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <p>© 2026 API Observatory Platform. Real-time metrics consolidated automatically.</p>
          <div className="flex items-center gap-4">
            <Link to="/login" className="hover:text-white transition-colors">SignIn</Link>
            <span>•</span>
            <Link to="/register" className="hover:text-white transition-colors">SignUp</Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default StatusPage;
