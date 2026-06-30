import React, { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import api from '../services/api';
import {
  FileText,
  Calendar,
  Download,
  AlertCircle,
  Clock,
  Zap,
  RefreshCw,
  Award,
  BookOpen
} from 'lucide-react';

const SLAReports = () => {
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // Filter states
  const [month, setMonth] = useState(currentMonthStr);
  const [monitors, setMonitors] = useState([]);
  const [selectedMonitorId, setSelectedMonitorId] = useState('');
  
  // Data states
  const [slaData, setSlaData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Fetch active monitors list (for filter dropdown)
  const fetchMonitors = async () => {
    try {
      const res = await api.get('/monitors');
      if (res.data.success) {
        setMonitors(res.data.data);
      }
    } catch (err) {
      console.error('Failed to load monitors list:', err);
    }
  };

  // Fetch SLA analytics summary
  const fetchSLAReport = async () => {
    try {
      setLoading(true);
      setError('');
      
      let url = `/analytics/sla?month=${month}`;
      if (selectedMonitorId) {
        url += `&monitorId=${selectedMonitorId}`;
      }

      const res = await api.get(url);
      if (res.data.success) {
        setSlaData(res.data);
      }
    } catch (err) {
      console.error('Failed to query SLA reports:', err);
      setError(err.response?.data?.message || 'Failed to compile SLA records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMonitors();
  }, []);

  useEffect(() => {
    fetchSLAReport();
  }, [month, selectedMonitorId]);

  const handlePrint = () => {
    window.print();
  };

  // Format month name (e.g. June 2026)
  const formatMonthName = (monthStr) => {
    if (!monthStr) return '';
    const [year, mon] = monthStr.split('-');
    const date = new Date(parseInt(year), parseInt(mon) - 1, 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  // Format duration minutes
  const formatMins = (mins) => {
    if (mins === 0) return '0 mins';
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.floor(mins / 60);
    const remainingMins = mins % 60;
    return remainingMins > 0 ? `${hrs}h ${remainingMins}m` : `${hrs}h`;
  };

  // Format MTBF duration
  const formatMTBF = (mins) => {
    if (mins >= 43200) return '30 days (No Failures)';
    if (mins < 60) return `${mins} mins`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hours`;
    const days = Math.round((hrs / 24) * 10) / 10;
    return `${days} days`;
  };

  const getSlaGrade = (uptime) => {
    if (uptime >= 99.9) return { label: 'Three Nines (Tier 1)', color: 'text-emerald-400 border-emerald-500/20 bg-emerald-500/5' };
    if (uptime >= 99.0) return { label: 'Standard SLA Compliant', color: 'text-brand-300 border-brand-500/20 bg-brand-500/5' };
    if (uptime >= 95.0) return { label: 'Minor SLA Breach', color: 'text-amber-400 border-amber-500/20 bg-amber-500/5' };
    return { label: 'Critical SLA Violation', color: 'text-rose-400 border-rose-500/20 bg-rose-500/5' };
  };

  const reportMonthName = formatMonthName(slaData?.month || month);

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col font-sans">
      
      {/* Navbar - hidden on print */}
      <div className="print:hidden">
        <Navbar />
      </div>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col gap-8 print:p-0 print:max-w-full">
        
        {/* Printable SLA official letterhead header */}
        <div className="hidden print:flex flex-col border-b-2 border-dark-800 pb-6 mb-8 text-white">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-extrabold tracking-wider font-outfit">
                API PERFORMANCE OBSERVATORY
              </h1>
              <p className="text-[10px] text-dark-400 font-mono tracking-widest leading-none mt-1">
                ENTERPRISE SERVICE LEVEL AGREEMENT REPORT
              </p>
            </div>
            <div className="text-right text-xs font-mono text-dark-400 space-y-1">
              <div>REPORT MONTH: {reportMonthName.toUpperCase()}</div>
              <div>COMPILED ON: {new Date().toLocaleDateString()}</div>
            </div>
          </div>
        </div>

        {/* Console view title headers - hidden on print */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <h2 className="text-3xl font-extrabold font-outfit text-white tracking-tight">
              SLA Compliance Reporting
            </h2>
            <p className="text-dark-400 text-sm mt-1">
              Generate, evaluate and export formal monthly uptime & reliability statistics.
            </p>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={handlePrint}
              disabled={loading || error}
              className="px-4 py-2.5 rounded-2xl bg-brand-600 hover:bg-brand-500 disabled:bg-dark-900 text-white font-medium text-sm flex items-center gap-2 transition-all shadow-md shadow-brand-500/10 hover:shadow-brand-500/25"
            >
              <Download className="w-4 h-4" />
              <span>Export PDF / Print</span>
            </button>
          </div>
        </div>

        {/* Filter controls panel - hidden on print */}
        <div className="glass-panel rounded-3xl p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 print:hidden">
          <div className="flex flex-wrap items-center gap-4">
            {/* Month select */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono tracking-wider text-dark-400 uppercase">
                Reporting Month
              </label>
              <div className="relative flex items-center">
                <Calendar className="w-4 h-4 text-dark-400 absolute left-3 pointer-events-none" />
                <input
                  type="month"
                  value={month}
                  onChange={(e) => setMonth(e.target.value)}
                  className="bg-dark-900 border border-dark-800 rounded-xl pl-9 pr-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
            </div>

            {/* Monitor Select Filter */}
            <div className="space-y-1.5">
              <label className="block text-[10px] font-mono tracking-wider text-dark-400 uppercase">
                Target Endpoint
              </label>
              <select
                value={selectedMonitorId}
                onChange={(e) => setSelectedMonitorId(e.target.value)}
                className="bg-dark-900 border border-dark-800 rounded-xl px-4 py-2 text-xs text-white focus:outline-none focus:border-brand-500"
              >
                <option value="">All Monitored APIs</option>
                {monitors.map((m) => (
                  <option key={m._id} value={m._id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <button
            onClick={fetchSLAReport}
            className="p-2.5 rounded-xl border border-dark-850 hover:border-dark-700 bg-dark-900/50 hover:bg-dark-900 text-dark-400 hover:text-white transition-all self-end sm:self-auto"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {/* Report Render Core */}
        {loading ? (
          <div className="h-96 glass-panel rounded-3xl flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        ) : error ? (
          <div className="p-6 rounded-3xl bg-rose-500/10 border border-rose-500/20 text-center space-y-4 print:hidden">
            <p className="text-sm text-rose-200 font-semibold">{error}</p>
            <button
              onClick={fetchSLAReport}
              className="px-4 py-2 bg-dark-900 border border-dark-800 text-white rounded-xl text-xs hover:border-brand-500 transition-colors"
            >
              Retry Compilation
            </button>
          </div>
        ) : slaData ? (
          <div className="space-y-8">
            
            {/* Global Summary Title - Print only */}
            <div className="hidden print:block text-white">
              <h2 className="text-lg font-bold font-outfit border-b border-dark-800 pb-2 uppercase">
                Executive Summary: {reportMonthName}
              </h2>
            </div>

            {/* 1. Global KPI Metrics Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-5 gap-6 print:grid-cols-5">
              
              {/* Uptime Index */}
              <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between print:bg-transparent print:border print:border-dark-800">
                <span className="text-[10px] font-mono tracking-wider text-dark-400 uppercase">Average Uptime</span>
                <h3 className="text-3xl font-bold font-outfit text-white mt-3">
                  {slaData.globalSummary.averageUptime}%
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono mt-1 flex items-center gap-1">
                  <Award className="w-3.5 h-3.5" />
                  Grade: {slaData.globalSummary.averageUptime >= 99.9 ? 'AAA' : 'SLA Target'}
                </span>
              </div>

              {/* Total Downtime */}
              <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between print:bg-transparent print:border print:border-dark-800">
                <span className="text-[10px] font-mono tracking-wider text-dark-400 uppercase">Total Downtime</span>
                <h3 className="text-3xl font-bold font-outfit text-white mt-3">
                  {formatMins(slaData.globalSummary.totalDowntime)}
                </h3>
                <span className="text-[10px] text-dark-400 font-mono mt-1">Accumulated outage logs</span>
              </div>

              {/* Incident count */}
              <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between print:bg-transparent print:border print:border-dark-800">
                <span className="text-[10px] font-mono tracking-wider text-dark-400 uppercase">Total Outages</span>
                <h3 className="text-3xl font-bold font-outfit text-white mt-3">
                  {slaData.globalSummary.totalIncidents}
                </h3>
                <span className="text-[10px] text-dark-400 font-mono mt-1">Check failure events</span>
              </div>

              {/* MTTR (Mean time to resolution) */}
              <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between print:bg-transparent print:border print:border-dark-800">
                <span className="text-[10px] font-mono tracking-wider text-dark-400 uppercase">Global MTTR</span>
                <h3 className="text-3xl font-bold font-outfit text-white mt-3">
                  {slaData.globalSummary.averageMTTR}m
                </h3>
                <span className="text-[10px] text-dark-400 font-mono mt-1">Mean Time to Resolution</span>
              </div>

              {/* MTBF (Mean time between failures) */}
              <div className="glass-panel rounded-3xl p-6 flex flex-col justify-between print:bg-transparent print:border print:border-dark-800">
                <span className="text-[10px] font-mono tracking-wider text-dark-400 uppercase">Global MTBF</span>
                <h3 className="text-2xl font-bold font-outfit text-white mt-3.5">
                  {formatMTBF(slaData.globalSummary.averageMTBF)}
                </h3>
                <span className="text-[10px] text-dark-400 font-mono mt-1">Mean Time Between Failures</span>
              </div>

            </div>

            {/* 2. Detailed SLA Reports Table */}
            <div className="glass-panel rounded-3xl overflow-hidden print:border print:border-dark-800 print:bg-transparent">
              <div className="px-6 py-5 border-b border-dark-850 flex items-center justify-between print:border-dark-800">
                <h3 className="font-bold text-white text-sm font-outfit">SLA Compliance By Endpoint</h3>
                <span className="text-[11px] text-dark-400 font-mono">Reporting Period: {reportMonthName}</span>
              </div>

              <div className="overflow-x-auto w-full">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-dark-900/60 text-dark-400 font-mono tracking-wider border-b border-dark-850 print:bg-transparent print:border-dark-800">
                      <th className="px-6 py-4 font-semibold uppercase">Endpoint Name</th>
                      <th className="px-6 py-4 font-semibold uppercase">Uptime Ratio</th>
                      <th className="px-6 py-4 font-semibold uppercase">Downtime Duration</th>
                      <th className="px-6 py-4 font-semibold uppercase">Outage Counts</th>
                      <th className="px-6 py-4 font-semibold uppercase">MTTR</th>
                      <th className="px-6 py-4 font-semibold uppercase">MTBF</th>
                      <th className="px-6 py-4 font-semibold uppercase print:hidden">SLA Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-dark-850 print:divide-dark-800">
                    {slaData.reports.map((report) => {
                      const grade = getSlaGrade(report.uptime);

                      return (
                        <tr
                          key={report.monitorId}
                          className="hover:bg-dark-900/10 transition-colors text-white/90 print:hover:bg-transparent"
                        >
                          <td className="px-6 py-4 font-medium">
                            <div>
                              <div className="font-bold text-sm text-white">{report.monitorName}</div>
                              <div className="text-[10px] text-dark-500 font-mono mt-0.5">{report.url}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 font-mono font-bold text-sm">
                            <span className={report.uptime >= 99.9 ? 'text-emerald-400' : report.uptime >= 99.0 ? 'text-brand-300' : 'text-rose-400'}>
                              {report.uptime}%
                            </span>
                          </td>
                          <td className="px-6 py-4 font-mono">{formatMins(report.downtime)}</td>
                          <td className="px-6 py-4 font-mono">{report.incidentsCount} events</td>
                          <td className="px-6 py-4 font-mono">{report.mttr} mins</td>
                          <td className="px-6 py-4 font-mono">{formatMTBF(report.mtbf)}</td>
                          <td className="px-6 py-4 print:hidden">
                            <span className={`px-2.5 py-0.5 rounded text-[10px] font-medium border ${grade.color}`}>
                              {grade.label}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. Formal compliance sign-off block - Print only */}
            <div className="hidden print:grid grid-cols-2 gap-12 pt-16 text-white text-xs">
              <div className="space-y-4">
                <span className="text-dark-500 font-mono block border-b border-dark-800 pb-2">PREPARED BY (OBSERVATORY CLOUD)</span>
                <div className="pt-6">
                  <div className="w-48 h-[1px] bg-dark-600"></div>
                  <div className="text-[10px] text-dark-400 font-mono mt-1">Platform Automated Auditor Signature</div>
                </div>
              </div>
              
              <div className="space-y-4">
                <span className="text-dark-500 font-mono block border-b border-dark-800 pb-2">ACKNOWLEDGED BY CLIENT / OPERATIONS REPRESENTATIVE</span>
                <div className="pt-6 flex items-end justify-between">
                  <div>
                    <div className="w-48 h-[1px] bg-dark-600"></div>
                    <div className="text-[10px] text-dark-400 font-mono mt-1">Authorized Operations Manager Sign-off</div>
                  </div>
                  <div className="text-[10px] text-dark-500 font-mono">DATE: ____ / ____ / ________</div>
                </div>
              </div>
            </div>

          </div>
        ) : null}
      </main>
    </div>
  );
};

export default SLAReports;
