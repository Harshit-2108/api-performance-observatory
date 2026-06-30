import React, { useState, useEffect } from 'react';
import { X, Globe, Cpu, RefreshCw, AlertCircle } from 'lucide-react';
import api from '../services/api';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Cell,
  LineChart,
  Line,
  Legend
} from 'recharts';

const RegionalLatencyModal = ({ isOpen, onClose, monitorId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchRegionalStats = async () => {
    if (!monitorId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/analytics/monitor/${monitorId}/regional`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load regional metrics:', err);
      setError('Failed to retrieve regional latency aggregates');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && monitorId) {
      fetchRegionalStats();
    }
  }, [monitorId, isOpen]);

  if (!isOpen) return null;

  const regions = [
    { key: 'in', name: 'India (Mumbai)', code: 'IN', color: '#8b5cf6' },
    { key: 'us', name: 'United States (N. Virginia)', code: 'US', color: '#6366f1' },
    { key: 'eu', name: 'Europe (Frankfurt)', code: 'EU', color: '#3b82f6' },
    { key: 'as', name: 'Asia Pacific (Singapore)', code: 'AS', color: '#10b981' }
  ];

  // Format data for the averages bar chart
  const getBarData = () => {
    if (!data) return [];
    return regions.map(r => ({
      name: r.code,
      fullName: r.name,
      latency: data.averages[r.key] || 0,
      fill: r.color
    }));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-4xl rounded-3xl overflow-hidden shadow-2xl animate-fade-in border border-dark-800 flex flex-col max-h-[90vh]">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-800 shrink-0">
          <div className="flex items-center gap-3">
            <Globe className="w-6 h-6 text-brand-400 animate-spin-slow" />
            <div>
              <h3 className="text-xl font-bold font-outfit text-white">
                Multi-Region Latency Diagnostics
              </h3>
              <p className="text-xs text-dark-400 mt-0.5">
                Target Endpoint: <span className="text-brand-300 font-semibold">{data?.monitorName || 'Active API'}</span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={fetchRegionalStats}
              disabled={loading}
              className="p-1.5 rounded-xl bg-dark-900 border border-dark-800 text-dark-450 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-xl bg-dark-900 border border-dark-800 text-dark-400 hover:text-white hover:border-brand-500/30 transition-all duration-200"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {loading ? (
          <div className="flex-1 flex items-center justify-center py-20">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-8 text-center space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 max-w-md mx-auto flex items-start gap-3 text-left">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200 font-medium">{error}</p>
            </div>
            <button
              onClick={fetchRegionalStats}
              className="px-4 py-2 bg-dark-900 border border-dark-800 text-white rounded-xl text-xs hover:border-brand-500 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          /* Modal Body - Scrollable content */
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            
            {/* 1. Regional Status Ticks */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {regions.map((r) => {
                const latency = data.averages[r.key] || 0;
                return (
                  <div
                    key={r.key}
                    className="p-4 rounded-2xl bg-dark-900/50 border border-dark-850 flex flex-col justify-between"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-mono tracking-wider text-dark-450 uppercase">{r.name}</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500 shadow-md shadow-emerald-500/50"></span>
                    </div>
                    <div className="mt-4 flex items-baseline gap-1">
                      <span className="text-2xl font-bold font-outfit text-white">{latency}</span>
                      <span className="text-xs text-dark-500 font-mono">ms</span>
                    </div>
                    <span className="text-[10px] text-dark-500 font-mono mt-1">Check Agent Node: Active</span>
                  </div>
                );
              })}
            </div>

            {/* 2. Charts comparison layouts */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              
              {/* Regional averages comparison Bar Chart */}
              <div className="p-5 rounded-2xl bg-dark-900/30 border border-dark-850 flex flex-col gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white font-outfit">Average Latency comparison</h4>
                  <p className="text-[10px] text-dark-500 mt-0.5">Response averages across past 24 hours</p>
                </div>
                <div className="h-60 w-full flex-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={getBarData()}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} />
                      <XAxis dataKey="name" stroke="#475569" fontSize={11} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={11} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          fontSize: '11px'
                        }}
                      />
                      <Bar dataKey="latency" radius={[8, 8, 0, 0]} barSize={24}>
                        {getBarData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.fill} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Time-series comparative Line Chart */}
              <div className="p-5 rounded-2xl bg-dark-900/30 border border-dark-850 lg:col-span-2 flex flex-col gap-4">
                <div>
                  <h4 className="text-sm font-bold text-white font-outfit">24-Hour Regional Fluctuation</h4>
                  <p className="text-[10px] text-dark-500 mt-0.5">Geographic performance comparison trends</p>
                </div>
                <div className="h-60 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={data.regionalTrend}
                      margin={{ top: 10, right: 10, left: -25, bottom: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} />
                      <XAxis dataKey="time" stroke="#475569" fontSize={10} tickLine={false} />
                      <YAxis stroke="#475569" fontSize={10} tickLine={false} axisLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: '#0f172a',
                          border: '1px solid #334155',
                          borderRadius: '12px',
                          fontSize: '11px',
                          color: '#f8fafc'
                        }}
                      />
                      <Legend iconSize={8} wrapperStyle={{ fontSize: '10px', paddingTop: '10px' }} />
                      {regions.map((r) => (
                        <Line
                          key={r.key}
                          type="monotone"
                          dataKey={r.key}
                          name={r.name}
                          stroke={r.color}
                          strokeWidth={1.5}
                          dot={false}
                          activeDot={{ r: 4 }}
                        />
                      ))}
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>

            </div>

            <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 text-xs text-dark-300 leading-relaxed">
              <strong>Geographic Analysis:</strong> Latency metrics are compiled dynamically using simulated geographic multipliers targeting your host endpoint. Ensure proper routing filters (such as CDN geolocations or DNS load balancers) are configured if substantial variance occurs between nodes.
            </div>

          </div>
        ) : (
          <div className="p-8 text-center text-dark-400">Regional metrics log not available.</div>
        )}
      </div>
    </div>
  );
};

export default RegionalLatencyModal;
