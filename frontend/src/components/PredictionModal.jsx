import React, { useState, useEffect } from 'react';
import { X, Cpu, AlertTriangle, CheckCircle, Zap, Info, ShieldAlert } from 'lucide-react';
import api from '../services/api';

const PredictionModal = ({ isOpen, onClose, monitorId }) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPrediction = async () => {
    if (!monitorId) return;
    try {
      setLoading(true);
      setError('');
      const res = await api.get(`/analytics/monitor/${monitorId}/predict`);
      if (res.data.success) {
        setData(res.data);
      }
    } catch (err) {
      console.error('Failed to load predictions:', err);
      setError('Failed to compute outage forecasts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && monitorId) {
      fetchPrediction();
    }
  }, [monitorId, isOpen]);

  if (!isOpen) return null;

  // Visual settings based on Risk level
  const getRiskDetails = (risk) => {
    switch (risk) {
      case 'LOW':
        return {
          title: 'Low Outage Risk',
          color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5',
          progressColor: 'bg-emerald-500',
          icon: <CheckCircle className="w-8 h-8 text-emerald-400" />,
          recommendation: 'Baseline metrics match target SLA indexes. Maintain current polling cycles and review standard metrics logs.'
        };
      case 'MEDIUM':
        return {
          title: 'Moderate Outage Risk',
          color: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
          progressColor: 'bg-amber-500',
          icon: <AlertTriangle className="w-8 h-8 text-amber-400 animate-pulse" />,
          recommendation: 'Minor performance deviations detected. Review database query execution times and ensure cache handlers are operating normally.'
        };
      case 'HIGH':
        return {
          title: 'High Outage Risk',
          color: 'text-orange-400 border-orange-500/20 bg-orange-500/5',
          progressColor: 'bg-orange-500',
          icon: <AlertTriangle className="w-8 h-8 text-orange-400 animate-bounce" />,
          recommendation: 'Substantial latency spikes detected. Prepare failover container replicas, verify CDN edge configs, and review connection pool limits.'
        };
      case 'CRITICAL':
        return {
          title: 'Critical Outage Threat',
          color: 'text-rose-400 border-rose-500/20 bg-rose-500/5',
          progressColor: 'bg-rose-500',
          icon: <ShieldAlert className="w-8 h-8 text-rose-400 animate-bounce" />,
          recommendation: 'Outage imminent or ongoing. Trigger emergency recovery scripts, verify physical node connections, and restart node server clusters immediately.'
        };
      default:
        return {
          title: 'Safe',
          color: 'text-white border-dark-800 bg-dark-900',
          progressColor: 'bg-brand-500',
          icon: <Info className="w-8 h-8 text-white" />,
          recommendation: 'Monitor checks are operational.'
        };
    }
  };

  const risk = data?.prediction?.riskLevel || 'LOW';
  const confidence = data?.prediction?.confidence || 95;
  const config = getRiskDetails(risk);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="glass-panel w-full max-w-lg rounded-3xl overflow-hidden shadow-2xl animate-fade-in border border-dark-800 flex flex-col">
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-dark-800 shrink-0">
          <div className="flex items-center gap-3">
            <Cpu className="w-6 h-6 text-brand-400" />
            <div>
              <h3 className="text-xl font-bold font-outfit text-white">
                AI Outage Forecast Console
              </h3>
              <p className="text-xs text-dark-400 mt-0.5">
                Target Endpoint: <span className="text-brand-300 font-semibold">{data?.monitorName || 'Active API'}</span>
              </p>
            </div>
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
        ) : error ? (
          <div className="p-8 text-center space-y-4">
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 max-w-sm mx-auto flex items-start gap-3 text-left">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <p className="text-sm text-red-200 font-medium">{error}</p>
            </div>
            <button
              onClick={fetchPrediction}
              className="px-4 py-2 bg-dark-900 border border-dark-800 text-white rounded-xl text-xs hover:border-brand-500 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : data ? (
          <div className="p-6 space-y-6">
            
            {/* 1. Risk Level Banner */}
            <div className={`p-5 rounded-2xl border flex items-center gap-4 ${config.color}`}>
              <div className="p-2 bg-dark-950/40 rounded-xl shrink-0">
                {config.icon}
              </div>
              <div>
                <h4 className="font-outfit font-extrabold text-lg uppercase tracking-wider">{config.title}</h4>
                <p className="text-[11px] text-white/80 mt-0.5 leading-relaxed font-semibold">
                  Probability Index: <span className="font-bold underline">{confidence}%</span> confidence
                </p>
              </div>
            </div>

            {/* 2. Confidence score visual progress bar */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[10px] text-dark-500 font-mono">
                <span>IMMINENT BREACH PROBABILITY</span>
                <span>{100 - confidence}% Probability</span>
              </div>
              <div className="w-full h-3.5 bg-dark-900 border border-dark-850 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${config.progressColor}`}
                  style={{ width: `${Math.max(5, 100 - confidence)}%` }}
                ></div>
              </div>
            </div>

            {/* 3. Narrative Explanation */}
            <div className="space-y-1.5">
              <span className="text-[10px] font-mono tracking-widest text-dark-550 uppercase">Analysis Summary</span>
              <p className="text-xs text-white/95 leading-relaxed font-medium">
                {data.prediction.explanation}
              </p>
            </div>

            {/* 4. Contributing Anomaly Factors */}
            <div className="space-y-3">
              <span className="text-[10px] font-mono tracking-widest text-dark-550 uppercase block">Anomalous Risk Factors</span>
              <div className="space-y-2">
                {data.prediction.factors.map((factor, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-dark-900/50 border border-dark-850 text-xs text-white/80 font-mono flex items-center gap-2"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-400 shrink-0"></span>
                    <span>{factor}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* 5. Actionable recovery recommendation */}
            <div className="p-4 rounded-2xl bg-brand-500/5 border border-brand-500/10 space-y-2">
              <h5 className="text-[11px] font-mono tracking-wider text-brand-300 uppercase flex items-center gap-1.5 font-bold">
                <Zap className="w-3.5 h-3.5 text-brand-400 animate-pulse" />
                Actionable Operations Recommendation
              </h5>
              <p className="text-xs text-white/90 leading-relaxed font-semibold">
                {config.recommendation}
              </p>
            </div>

          </div>
        ) : null}

        {/* Modal Actions */}
        <div className="flex items-center justify-end px-6 py-4 border-t border-dark-800 shrink-0 bg-dark-900/20">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-dark-900 border border-dark-800 text-dark-300 hover:text-white hover:bg-dark-800 transition-all text-xs font-semibold"
          >
            Close Forecaster
          </button>
        </div>

      </div>
    </div>
  );
};

export default PredictionModal;
