import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import MonitorFormModal from '../components/MonitorFormModal';
import SettingsModal from '../components/SettingsModal';
import IncidentDetailModal from '../components/IncidentDetailModal';
import RegionalLatencyModal from '../components/RegionalLatencyModal';
import PredictionModal from '../components/PredictionModal';
import api from '../services/api';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
  ReferenceLine
} from 'recharts';
import {
  Activity,
  ShieldAlert,
  Cpu,
  CheckCircle,
  Database,
  Edit,
  Trash2,
  ExternalLink,
  Power,
  RefreshCw,
  AlertTriangle,
  Clock,
  Calendar,
  Settings,
  ChevronRight,
  ListFilter,
  Globe,
  GitBranch,
  Tag,
  Github,
  Plus
} from 'lucide-react';

const Dashboard = () => {
  const { user, updateUser } = useAuth();
  
  // Tab states: 'monitors' or 'incidents'
  const [activeTab, setActiveTab] = useState('monitors');

  // Lists state
  const [monitors, setMonitors] = useState([]);
  const [loadingMonitors, setLoadingMonitors] = useState(true);

  const [incidents, setIncidents] = useState([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [incidentFilter, setIncidentFilter] = useState('ALL');

  const [deployments, setDeployments] = useState([]);
  const [loadingDeployments, setLoadingDeployments] = useState(true);
  const [isSimulating, setIsSimulating] = useState(false);

  const [dashboardData, setDashboardData] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(true);

  const [healthStatus, setHealthStatus] = useState(null);
  const [loadingHealth, setLoadingHealth] = useState(true);

  // Modals state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isIncidentModalOpen, setIsIncidentModalOpen] = useState(false);
  const [isRegionalModalOpen, setIsRegionalModalOpen] = useState(false);
  const [isPredictionModalOpen, setIsPredictionModalOpen] = useState(false);
  
  const [editingMonitor, setEditingMonitor] = useState(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState(null);
  const [selectedRegionalMonitorId, setSelectedRegionalMonitorId] = useState(null);
  const [selectedPredictionMonitorId, setSelectedPredictionMonitorId] = useState(null);
  const [checkingStates, setCheckingStates] = useState({});

  const handleRegionalTrigger = (id) => {
    setSelectedRegionalMonitorId(id);
    setIsRegionalModalOpen(true);
  };

  const handlePredictionTrigger = (id) => {
    setSelectedPredictionMonitorId(id);
    setIsPredictionModalOpen(true);
  };

  // Get active deployment reference indicators matching trend buckets (last 24 hours)
  const getDeploymentReferenceLines = () => {
    if (!deployments || deployments.length === 0) return [];
    
    const lines = [];
    const seenTimes = new Set();
    
    deployments.forEach((event) => {
      const date = new Date(event.timestamp);
      const hours = date.getHours().toString().padStart(2, '0');
      const timeStr = `${hours}:00`;
      
      const existsInTrend = dashboardData?.latencyTrend?.some(t => t.time === timeStr);
      
      if (existsInTrend && !seenTimes.has(timeStr)) {
        seenTimes.add(timeStr);
        lines.push({
          time: timeStr,
          label: event.type === 'DEPLOYMENT' ? 'Deploy' : event.type === 'RELEASE' ? 'Release' : 'Commit',
          type: event.type
        });
      }
    });
    
    return lines;
  };

  // Fetch dashboard summary analytics
  const fetchDashboardAnalytics = async () => {
    try {
      setLoadingAnalytics(true);
      const res = await api.get('/analytics/dashboard');
      if (res.data.success) {
        setDashboardData(res.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard analytical stats:', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch monitors
  const fetchMonitors = async () => {
    try {
      setLoadingMonitors(true);
      const res = await api.get('/monitors');
      if (res.data.success) {
        setMonitors(res.data.data);
      }
    } catch (err) {
      console.error('Failed to retrieve monitors list:', err);
    } finally {
      setLoadingMonitors(false);
    }
  };

  // Fetch full incidents log list
  const fetchIncidents = async () => {
    try {
      setLoadingIncidents(true);
      const res = await api.get('/incidents');
      if (res.data.success) {
        setIncidents(res.data.data);
      }
    } catch (err) {
      console.error('Failed to retrieve incidents log:', err);
    } finally {
      setLoadingIncidents(false);
    }
  };

  // Fetch deployment events
  const fetchDeployments = async () => {
    try {
      setLoadingDeployments(true);
      const res = await api.get('/analytics/deployments');
      if (res.data.success) {
        setDeployments(res.data.events);
      }
    } catch (err) {
      console.error('Failed to retrieve deployment events:', err);
    } finally {
      setLoadingDeployments(false);
    }
  };

  // Simulate receiving a GitHub event payload
  const handleSimulateWebhook = async (type, repository, title, description) => {
    try {
      setIsSimulating(true);
      const res = await api.post('/webhooks/github/simulate', {
        type,
        title,
        description,
        repository
      });
      if (res.data.success) {
        await reloadAll();
      }
    } catch (err) {
      console.error('Webhook simulation failed:', err);
    } finally {
      setIsSimulating(false);
    }
  };

  // Fetch engine health
  const fetchHealth = async () => {
    try {
      setLoadingHealth(true);
      const res = await api.get('/health');
      setHealthStatus(res.data);
    } catch (err) {
      console.error('Failed to query backend health:', err);
    } finally {
      setLoadingHealth(false);
    }
  };

  const reloadAll = async () => {
    await Promise.all([
      fetchMonitors(),
      fetchIncidents(),
      fetchDashboardAnalytics(),
      fetchHealth(),
      fetchDeployments()
    ]);
  };

  useEffect(() => {
    reloadAll();
  }, []);

  // Save monitor config
  const handleSaveMonitor = async (payload) => {
    try {
      if (editingMonitor) {
        const res = await api.put(`/monitors/${editingMonitor._id}`, payload);
        if (res.data.success) {
          reloadAll();
          return true;
        }
      } else {
        const res = await api.post('/monitors', payload);
        if (res.data.success) {
          reloadAll();
          return true;
        }
      }
    } catch (error) {
      console.error('Error saving monitor details:', error);
      alert(error.response?.data?.message || 'Failed to save monitor details');
    }
    return false;
  };

  // Delete monitor
  const handleDeleteMonitor = async (id) => {
    if (window.confirm('Are you sure you want to delete this API monitor? All metrics and history will be cleared.')) {
      try {
        const res = await api.delete(`/monitors/${id}`);
        if (res.data.success) {
          reloadAll();
        }
      } catch (error) {
        console.error('Failed to delete monitor:', error);
        alert('Failed to delete monitor');
      }
    }
  };

  // Toggle active
  const handleToggleActive = async (monitor) => {
    try {
      const res = await api.put(`/monitors/${monitor._id}`, {
        active: !monitor.active
      });
      if (res.data.success) {
        reloadAll();
      }
    } catch (error) {
      console.error('Failed to toggle monitor state:', error);
    }
  };

  // Run check now
  const handleManualCheck = async (id) => {
    setCheckingStates((prev) => ({ ...prev, [id]: true }));
    try {
      const res = await api.post(`/monitors/${id}/check`);
      if (res.data.success) {
        // Refresh analytics and monitors list to sync graphs
        await reloadAll();
      }
    } catch (error) {
      console.error('Manual check request failed:', error);
      alert(error.response?.data?.message || 'Failed to execute check');
    } finally {
      setCheckingStates((prev) => ({ ...prev, [id]: false }));
    }
  };

  // Modal triggers
  const handleCreateTrigger = () => {
    setEditingMonitor(null);
    setIsModalOpen(true);
  };

  const handleEditTrigger = (monitor) => {
    setEditingMonitor(monitor);
    setIsModalOpen(true);
  };

  const handleIncidentClick = (id) => {
    setSelectedIncidentId(id);
    setIsIncidentModalOpen(true);
  };

  // Checked time formatter
  const formatLastChecked = (dateString) => {
    if (!dateString) return 'Never checked';
    const date = new Date(dateString);
    const seconds = Math.floor((new Date() - date) / 1000);

    if (seconds < 5) return 'Just now';
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Incident duration formatter
  const formatIncidentDuration = (start, end) => {
    const startTime = new Date(start).getTime();
    const endTime = end ? new Date(end).getTime() : Date.now();
    const diffMins = Math.round((endTime - startTime) / 60000);

    if (diffMins < 1) return 'less than a min';
    if (diffMins === 1) return '1 min';
    return `${diffMins} mins`;
  };

  // Stats summaries fallback values
  const stats = dashboardData?.stats || {
    uptimePercentage: 100,
    avgResponseTime: 0,
    totalMonitors: monitors.length,
    activeMonitors: monitors.filter((m) => m.active).length,
    incidentsCount: 0
  };

  // Get active unresolved incidents count
  const unresolvedIncidentsCount = incidents.filter(
    (inc) => inc.status === 'OPEN' || inc.status === 'ACKNOWLEDGED'
  ).length;

  const monitorNames = monitors.map((m) => m.name);
  const chartColors = ['#8b5cf6', '#3b82f6', '#10b981', '#f59e0b', '#ef4444'];

  // Filter incidents list
  const filteredIncidents = incidents.filter((inc) => {
    if (incidentFilter === 'ALL') return true;
    return inc.status === incidentFilter;
  });

  return (
    <div className="min-h-screen bg-dark-950 flex flex-col">
      <Navbar />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-10 flex flex-col gap-8 animate-fade-in">
        
        {/* Welcome Dashboard Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-3xl font-extrabold font-outfit text-white tracking-tight">
              Observatory Analytics
            </h2>
            <p className="text-dark-400 text-sm mt-1">
              Welcome back, <span className="text-brand-300 font-semibold">{user?.name}</span>. Performance graphs are compiled dynamically below.
            </p>
          </div>
          <div className="flex items-center gap-3 self-start md:self-auto">
            {/* Alert settings toggle */}
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="px-4 py-2 rounded-2xl bg-dark-900 border border-dark-800 text-dark-300 hover:text-white hover:bg-dark-800 hover:border-brand-500/30 transition-all duration-300 text-sm font-medium flex items-center gap-1.5"
            >
              <Settings className="w-4 h-4" />
              <span>Notification Setup</span>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-dark-900 border border-dark-800">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 absolute"></span>
              <span className="text-xs text-dark-300 font-mono pl-1.5">LIVE CONNECTIVITY</span>
            </div>
          </div>
        </div>

        {/* Dashboard Grid Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {/* Card 1: Total Monitors */}
          <div className="glass-panel rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono tracking-wider text-dark-400 uppercase">Monitors</p>
              <h3 className="text-3xl font-bold font-outfit text-white mt-2">{stats.totalMonitors}</h3>
              <p className="text-xs text-dark-500 mt-1">{stats.activeMonitors} active polling</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-brand-500/10 flex items-center justify-center text-brand-400 border border-brand-500/20">
              <Database className="w-6 h-6" />
            </div>
          </div>

          {/* Card 2: Active Incidents */}
          <div className="glass-panel rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono tracking-wider text-dark-400 uppercase">Active Incidents</p>
              <h3 className={`text-3xl font-bold font-outfit mt-2 ${stats.incidentsCount > 0 ? 'text-rose-400' : 'text-white'}`}>
                {stats.incidentsCount}
              </h3>
              <p className="text-xs text-dark-500 mt-1">Endpoints offline</p>
            </div>
            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${
              stats.incidentsCount > 0 
                ? 'bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-lg shadow-rose-500/10' 
                : 'bg-dark-900 border-dark-800 text-dark-400'
            }`}>
              <ShieldAlert className="w-6 h-6" />
            </div>
          </div>

          {/* Card 3: Global Uptime */}
          <div className="glass-panel rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono tracking-wider text-dark-400 uppercase">24h Global Uptime</p>
              <h3 className="text-3xl font-bold font-outfit text-white mt-2">{stats.uptimePercentage}%</h3>
              <p className="text-xs text-dark-500 mt-1">Uptime index</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
              <CheckCircle className="w-6 h-6" />
            </div>
          </div>

          {/* Card 4: Global Avg response latency */}
          <div className="glass-panel rounded-3xl p-6 flex items-center justify-between">
            <div>
              <p className="text-xs font-mono tracking-wider text-dark-400 uppercase">Average Latency</p>
              <h3 className="text-3xl font-bold font-outfit text-white mt-2">{stats.avgResponseTime}ms</h3>
              <p className="text-xs text-dark-500 mt-1">Check response average</p>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 border border-indigo-500/20">
              <Activity className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* Charts & Trends Visualizations */}
        {!loadingAnalytics && dashboardData ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            
            {/* Latency Area Chart widget */}
            <div className="glass-panel rounded-3xl p-6 lg:col-span-2 flex flex-col gap-4">
              <div>
                <h4 className="font-outfit font-bold text-lg text-white">24-Hour Latency Trend (ms)</h4>
                <p className="text-xs text-dark-400">Average response times plotted in hourly segments</p>
              </div>
              <div className="h-80 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={dashboardData.latencyTrend}
                    margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                  >
                    <defs>
                      {monitorNames.map((name, idx) => {
                        const color = chartColors[idx % chartColors.length];
                        return (
                          <linearGradient key={name} id={`grad_${idx}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={color} stopOpacity={0.2} />
                            <stop offset="95%" stopColor={color} stopOpacity={0.0} />
                          </linearGradient>
                        );
                      })}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.3} />
                    <XAxis
                      dataKey="time"
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                    />
                    <YAxis
                      stroke="#475569"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '16px',
                        color: '#f8fafc',
                        fontFamily: 'Outfit, sans-serif',
                        fontSize: '12px'
                      }}
                    />
                    {monitorNames.map((name, idx) => {
                      const color = chartColors[idx % chartColors.length];
                      return (
                        <Area
                          key={name}
                          type="monotone"
                          dataKey={name}
                          stroke={color}
                          strokeWidth={2}
                          fillOpacity={1}
                          fill={`url(#grad_${idx})`}
                        />
                      );
                    })}

                    {/* Deployments / webhook events ReferenceLines */}
                    {getDeploymentReferenceLines().map((line) => {
                      let strokeColor = '#818cf8'; // indigo for commits
                      if (line.type === 'DEPLOYMENT') strokeColor = '#f43f5e'; // rose for deployments
                      else if (line.type === 'RELEASE') strokeColor = '#10b981'; // emerald for releases

                      return (
                        <ReferenceLine
                          key={line.time}
                          x={line.time}
                          stroke={strokeColor}
                          strokeDasharray="4 4"
                          strokeWidth={1.5}
                          label={{
                            value: line.label,
                            fill: strokeColor,
                            fontSize: 10,
                            position: 'top',
                            fontWeight: 'bold',
                            fontFamily: 'monospace'
                          }}
                        />
                      );
                    })}
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Uptime Bar Chart widget */}
            <div className="glass-panel rounded-3xl p-6 flex flex-col gap-4">
              <div>
                <h4 className="font-outfit font-bold text-lg text-white">Uptime By Monitor</h4>
                <p className="text-xs text-dark-400">Total success rates calculated across past 24 hours</p>
              </div>
              <div className="h-80 w-full flex-1">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={dashboardData.monitorUptime}
                    layout="vertical"
                    margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" opacity={0.2} />
                    <XAxis
                      type="number"
                      domain={[90, 100]}
                      stroke="#475569"
                      fontSize={10}
                      tickLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      stroke="#f8fafc"
                      fontSize={10}
                      tickLine={false}
                      width={100}
                    />
                    <Tooltip
                      contentStyle={{
                        background: '#0f172a',
                        border: '1px solid #334155',
                        borderRadius: '16px',
                        fontSize: '12px'
                      }}
                    />
                    <Bar dataKey="uptime" radius={[0, 8, 8, 0]} barSize={16}>
                      {dashboardData.monitorUptime.map((entry, index) => {
                        let barColor = '#10b981'; // Green (UP)
                        if (!entry.active) barColor = '#475569'; // Gray (paused)
                        else if (entry.status === 'DOWN') barColor = '#ef4444'; // Red (DOWN)
                        else if (entry.uptime < 99) barColor = '#f59e0b'; // Amber (warning)
                        
                        return <Cell key={`cell-${index}`} fill={barColor} />;
                      })}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        ) : (
          <div className="h-80 glass-panel rounded-3xl flex items-center justify-center">
            <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
          </div>
        )}

        {/* Detailed Status Area */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
          
          {/* Main Content Area - Monitored list or Incidents Log Tab */}
          <div className="glass-panel rounded-3xl p-8 lg:col-span-2 flex flex-col gap-6">
            
            {/* Custom Tab Headers */}
            <div className="flex items-center justify-between border-b border-dark-800 pb-2">
              <div className="flex items-center gap-6">
                <button
                  onClick={() => setActiveTab('monitors')}
                  className={`pb-3 text-sm font-bold font-outfit transition-all relative ${
                    activeTab === 'monitors' ? 'text-white' : 'text-dark-500 hover:text-dark-300'
                  }`}
                >
                  Monitored APIs
                  {activeTab === 'monitors' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-500"></span>}
                </button>
                <button
                  onClick={() => setActiveTab('incidents')}
                  className={`pb-3 text-sm font-bold font-outfit transition-all relative flex items-center gap-2 ${
                    activeTab === 'incidents' ? 'text-white' : 'text-dark-500 hover:text-dark-300'
                  }`}
                >
                  <span>Incident Logs</span>
                  {unresolvedIncidentsCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-rose-500/20 text-rose-400 text-[10px] flex items-center justify-center border border-rose-500/30 font-bold">
                      {unresolvedIncidentsCount}
                    </span>
                  )}
                  {activeTab === 'incidents' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-500"></span>}
                </button>
                <button
                  onClick={() => setActiveTab('deployments')}
                  className={`pb-3 text-sm font-bold font-outfit transition-all relative flex items-center gap-2 ${
                    activeTab === 'deployments' ? 'text-white' : 'text-dark-500 hover:text-dark-300'
                  }`}
                >
                  <span>Deployments</span>
                  {activeTab === 'deployments' && <span className="absolute bottom-0 left-0 w-full h-[2px] bg-brand-500"></span>}
                </button>
              </div>

              {activeTab === 'monitors' ? (
                <button
                  onClick={handleCreateTrigger}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white font-medium text-xs rounded-xl shadow-md shadow-brand-500/10 hover:shadow-brand-500/20 transition-all duration-300"
                >
                  + Register API
                </button>
              ) : activeTab === 'incidents' ? (
                /* Incidents filter dropdown */
                <div className="flex items-center gap-2 text-xs text-dark-400 font-mono">
                  <ListFilter className="w-3.5 h-3.5" />
                  <select
                    value={incidentFilter}
                    onChange={(e) => setIncidentFilter(e.target.value)}
                    className="bg-dark-900 border border-dark-800 rounded-lg px-2 py-1 text-white focus:outline-none focus:border-brand-500"
                  >
                    <option value="ALL">All States</option>
                    <option value="OPEN">Open Outages</option>
                    <option value="ACKNOWLEDGED">Acknowledged</option>
                    <option value="RESOLVED">Resolved Logs</option>
                  </select>
                </div>
              ) : (
                /* Deployments Simulation trigger */
                <div className="flex items-center gap-2">
                  <span className="text-[10px] text-dark-400 font-mono">Simulate Webhooks:</span>
                  <button
                    onClick={() => handleSimulateWebhook('COMMIT', 'stripe-payment-gateway', 'Commit: Optimized checkouts loops', 'Added index optimizations for stripe latency reduction.')}
                    disabled={isSimulating}
                    className="px-2.5 py-1 hover:bg-dark-800 border border-dark-800 text-brand-400 hover:text-brand-300 rounded-lg text-[10px] font-mono transition-all bg-dark-900"
                  >
                    Sim Commit
                  </button>
                  <button
                    onClick={() => handleSimulateWebhook('DEPLOYMENT', 'stripe-payment-gateway', 'Deploy: Production rollout (v1.0.5)', 'Deployment pushed to production environment.')}
                    disabled={isSimulating}
                    className="px-2.5 py-1 hover:bg-dark-800 border border-dark-800 text-rose-400 hover:text-rose-300 rounded-lg text-[10px] font-mono transition-all bg-dark-900"
                  >
                    Sim Deploy
                  </button>
                </div>
              )}
            </div>

            {/* TAB CONTENT: MONITORS */}
            {activeTab === 'monitors' && (
              loadingMonitors ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : monitors.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-center text-dark-500 mb-4">
                    <Database className="w-8 h-8" />
                  </div>
                  <h5 className="font-outfit font-semibold text-white">No endpoints registered</h5>
                  <p className="text-xs text-dark-400 max-w-sm mt-1">
                    Click the "+ Register API" button above to add your first endpoint check.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {monitors.map((monitor) => (
                    <div
                      key={monitor._id}
                      className="p-5 rounded-2xl bg-dark-900/40 border border-dark-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:border-dark-700/50 transition-all duration-300 animate-fade-in"
                    >
                      <div className="flex items-start gap-4">
                        <span
                          className={`w-3.5 h-3.5 rounded-full mt-1.5 shrink-0 border-2 ${
                            !monitor.active
                              ? 'bg-dark-600 border-dark-800'
                              : monitor.status === 'UP'
                              ? 'bg-emerald-500 border-emerald-500/20 shadow-lg shadow-emerald-500/50'
                              : 'bg-rose-500 border-rose-500/20 shadow-lg shadow-rose-500/50'
                          }`}
                        ></span>

                        <div className="flex flex-col gap-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-outfit font-bold text-white leading-snug">
                              {monitor.name}
                            </h5>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-dark-900 border border-dark-800 text-dark-300">
                              {monitor.method}
                            </span>
                          </div>
                          <a
                            href={monitor.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-xs text-dark-400 font-mono flex items-center gap-1 hover:text-brand-300 transition-colors"
                          >
                            {monitor.url}
                            <ExternalLink className="w-3 h-3" />
                          </a>

                          {monitor.description && (
                            <p className="text-xs text-dark-500 mt-1 max-w-md">
                              {monitor.description}
                            </p>
                          )}

                          {monitor.lastChecked && (
                            <div className="text-[11px] text-dark-400 font-mono mt-1.5 flex items-center gap-2">
                              <span>Checked: {formatLastChecked(monitor.lastChecked)}</span>
                              <span className="text-dark-600">•</span>
                              <span className={monitor.status === 'UP' ? 'text-emerald-400' : 'text-rose-400'}>
                                {monitor.status}
                              </span>
                            </div>
                          )}

                          {monitor.tags && monitor.tags.length > 0 && (
                            <div className="flex flex-wrap gap-1.5 mt-2">
                              {monitor.tags.map((tag) => (
                                <span
                                  key={tag}
                                  className="text-[10px] font-medium text-brand-300 bg-brand-500/5 border border-brand-500/10 px-2 py-0.5 rounded-md"
                                >
                                  #{tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 border-t border-dark-800/40 sm:border-0 pt-4 sm:pt-0">
                        <div className="flex items-center gap-4 text-xs font-mono text-dark-400">
                          <div className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{monitor.interval}m</span>
                          </div>
                          <div>
                            <span>Exp: {monitor.expectedStatus}</span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          
                          {/* Regional diagnostics globe button */}
                          <button
                            onClick={() => handleRegionalTrigger(monitor._id)}
                            disabled={!monitor.active}
                            title="Multi-Region Latency Diagnostics"
                            className={`p-2 rounded-xl border transition-all ${
                              !monitor.active
                                ? 'bg-dark-900 border-dark-850 text-dark-600 cursor-not-allowed'
                                : 'bg-dark-900 border-dark-800 text-brand-400 hover:text-white hover:border-brand-500/30'
                            }`}
                          >
                            <Globe className="w-4 h-4" />
                          </button>

                          {/* AI Prediction trigger button */}
                          <button
                            onClick={() => handlePredictionTrigger(monitor._id)}
                            disabled={!monitor.active}
                            title="AI Outage Risk Prediction"
                            className={`p-2 rounded-xl border transition-all ${
                              !monitor.active
                                ? 'bg-dark-900 border-dark-850 text-dark-600 cursor-not-allowed'
                                : 'bg-dark-900 border-dark-800 text-indigo-400 hover:text-white hover:border-indigo-500/30'
                            }`}
                          >
                            <Cpu className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleManualCheck(monitor._id)}
                            disabled={!monitor.active || checkingStates[monitor._id]}
                            title="Run health check now"
                            className={`p-2 rounded-xl border transition-all ${
                              checkingStates[monitor._id]
                                ? 'bg-brand-500/10 border-brand-500/20 text-brand-400'
                                : !monitor.active
                                ? 'bg-dark-900 border-dark-850 text-dark-600 cursor-not-allowed'
                                : 'bg-dark-900 border-dark-800 text-dark-300 hover:text-white hover:border-brand-500/30'
                            }`}
                          >
                            <RefreshCw
                              className={`w-4 h-4 ${checkingStates[monitor._id] ? 'animate-spin' : ''}`}
                            />
                          </button>

                          <button
                            onClick={() => handleToggleActive(monitor)}
                            title={monitor.active ? 'Pause polling' : 'Resume polling'}
                            className={`p-2 rounded-xl border transition-all ${
                              monitor.active
                                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400 hover:bg-emerald-500/20'
                                : 'bg-dark-900 border-dark-800 text-dark-500 hover:text-white hover:border-dark-700'
                            }`}
                          >
                            <Power className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleEditTrigger(monitor)}
                            className="p-2 rounded-xl bg-dark-900 border border-dark-800 text-dark-400 hover:text-white hover:border-brand-500/30 transition-all"
                          >
                            <Edit className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => handleDeleteMonitor(monitor._id)}
                            className="p-2 rounded-xl bg-dark-900 border border-dark-800 text-rose-400 hover:bg-rose-500/10 hover:border-rose-500/30 transition-all"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}

            {/* TAB CONTENT: INCIDENTS LOG */}
            {activeTab === 'incidents' && (
              loadingIncidents ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : filteredIncidents.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-center text-dark-500 mb-4">
                    <CheckCircle className="w-8 h-8 text-emerald-500" />
                  </div>
                  <h5 className="font-outfit font-semibold text-white">No incidents found</h5>
                  <p className="text-xs text-dark-400 max-w-sm mt-1">
                    No logs found matching filter "{incidentFilter}".
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredIncidents.map((incident) => {
                    const isSlow = incident.type === 'SLOW';
                    const isResolved = incident.status === 'RESOLVED';
                    
                    let bgBorder = 'bg-rose-500/5 border-rose-500/10 hover:border-rose-500/25';
                    let statusColor = 'text-rose-400';
                    if (isSlow) {
                      bgBorder = 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/25';
                      statusColor = 'text-amber-400';
                    } else if (isResolved) {
                      bgBorder = 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/25';
                      statusColor = 'text-emerald-400';
                    }

                    return (
                      <div
                        key={incident._id}
                        onClick={() => handleIncidentClick(incident._id)}
                        className={`p-5 rounded-2xl border flex items-center justify-between gap-4 cursor-pointer transition-all duration-300 ${bgBorder}`}
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h5 className="font-outfit font-bold text-white leading-snug">
                              {incident.monitorId?.name || 'Unknown API'}
                            </h5>
                            <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${statusColor} bg-dark-950`}>
                              {isSlow ? 'SLOW' : incident.status}
                            </span>
                          </div>
                          <p className="text-xs text-dark-300 max-w-md line-clamp-1">{incident.message}</p>
                          
                          <div className="flex flex-wrap items-center gap-3 text-[10px] text-dark-500 font-mono pt-1">
                            <span className="flex items-center gap-1">
                              <Calendar className="w-3.5 h-3.5" />
                              {new Date(incident.downtimeStart).toLocaleDateString()}
                            </span>
                            <span>•</span>
                            <span>
                              {isSlow
                                ? 'Transient Latency Spike'
                                : isResolved
                                ? `Duration: ${formatIncidentDuration(incident.downtimeStart, incident.downtimeEnd)}`
                                : `Downtime: ${formatIncidentDuration(incident.downtimeStart, null)}`
                              }
                            </span>
                          </div>
                        </div>

                        <ChevronRight className="w-5 h-5 text-dark-500 shrink-0" />
                      </div>
                    );
                  })}
                </div>
              )
            )}

            {/* TAB CONTENT: DEPLOYMENTS */}
            {activeTab === 'deployments' && (
              loadingDeployments ? (
                <div className="flex items-center justify-center py-20">
                  <div className="w-10 h-10 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                </div>
              ) : deployments.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <div className="w-16 h-16 rounded-2xl bg-dark-900 border border-dark-800 flex items-center justify-center text-dark-500 mb-4">
                    <Github className="w-8 h-8" />
                  </div>
                  <h5 className="font-outfit font-semibold text-white">No GitHub events logged</h5>
                  <p className="text-xs text-dark-400 max-w-sm mt-1">
                    Deliver pushes, deployments, or releases to "/api/webhooks/github" or use the simulate triggers above.
                  </p>
                </div>
              ) : (
                <div className="space-y-6">
                  {deployments.map((event) => {
                    const isCommit = event.type === 'COMMIT';
                    const isRelease = event.type === 'RELEASE';
                    const isDeploy = event.type === 'DEPLOYMENT';

                    let typeIcon = <GitBranch className="w-4 h-4 text-indigo-400" />;
                    let typeBadge = 'bg-indigo-500/10 text-indigo-300 border-indigo-500/20';
                    if (isRelease) {
                      typeIcon = <Tag className="w-4 h-4 text-emerald-400" />;
                      typeBadge = 'bg-emerald-500/10 text-emerald-300 border-emerald-500/20';
                    } else if (isDeploy) {
                      typeIcon = <Github className="w-4 h-4 text-rose-400" />;
                      typeBadge = 'bg-rose-500/10 text-rose-300 border-rose-500/20';
                    }

                    return (
                      <div
                        key={event._id}
                        className="p-5 rounded-2xl bg-dark-900/40 border border-dark-800 space-y-4 hover:border-dark-700/50 transition-all duration-300 animate-fade-in"
                      >
                        {/* Event Header */}
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex items-start gap-3">
                            <div className={`p-2 rounded-xl border shrink-0 bg-dark-950`}>
                              {typeIcon}
                            </div>
                            <div>
                              <h5 className="font-outfit font-bold text-white leading-snug">
                                {event.title}
                              </h5>
                              <p className="text-xs text-dark-400 mt-0.5 leading-relaxed">
                                {event.description}
                              </p>
                            </div>
                          </div>
                          <span className={`text-[9px] font-mono tracking-wider font-bold px-2 py-0.5 rounded-full border ${typeBadge} shrink-0`}>
                            {event.type}
                          </span>
                        </div>

                        {/* Metadata grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-3 border-t border-dark-850/60 text-[10px] text-dark-400 font-mono">
                          <div>
                            <span className="text-dark-500 block text-[9px] uppercase tracking-wider">Repository</span>
                            <span className="text-white font-medium mt-0.5 block">{event.repository}</span>
                          </div>
                          <div>
                            <span className="text-dark-500 block text-[9px] uppercase tracking-wider">Author</span>
                            <span className="text-white font-medium mt-0.5 block">{event.author}</span>
                          </div>
                          {event.sha && (
                            <div>
                              <span className="text-dark-500 block text-[9px] uppercase tracking-wider">Commit SHA</span>
                              <span className="text-brand-300 font-bold mt-0.5 block">{event.sha}</span>
                            </div>
                          )}
                          <div>
                            <span className="text-dark-500 block text-[9px] uppercase tracking-wider">Timestamp</span>
                            <span className="text-white/80 mt-0.5 block">{new Date(event.timestamp).toLocaleString()}</span>
                          </div>
                        </div>

                        {/* Correlated Anomalies Warnings */}
                        {(event.incidentCorrelation || event.latencyCorrelation) && (
                          <div className="mt-3 p-3.5 rounded-xl bg-rose-500/5 border border-rose-500/10 space-y-2.5">
                            
                            {/* Incident Outage warning */}
                            {event.incidentCorrelation && (
                              <div
                                onClick={() => handleIncidentClick(event.incidentCorrelation.incidentId)}
                                className="flex items-start gap-2 text-xs text-rose-300 cursor-pointer hover:underline text-left"
                              >
                                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-rose-200">⚠️ Outage Incident Correlation:</strong> Monitor "{event.incidentCorrelation.monitorName}" triggered downtime ({event.incidentCorrelation.message}) within 15 minutes of this commit/deployment.
                                </div>
                              </div>
                            )}

                            {/* Latency spike warning */}
                            {event.latencyCorrelation && (
                              <div className="flex items-start gap-2 text-xs text-amber-300 text-left">
                                <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                                <div>
                                  <strong className="text-amber-200">⚡ Latency Degradation:</strong> Average response times of "{event.latencyCorrelation.monitorName}" surged by <span className="font-bold underline">{event.latencyCorrelation.growth}%</span> ({event.latencyCorrelation.before}ms ➔ {event.latencyCorrelation.after}ms) following this webhook event.
                                </div>
                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )
            )}
          </div>

          {/* Sidebar Area: Recent Incidents */}
          <div className="glass-panel rounded-3xl p-8 flex flex-col gap-6">
            <div>
              <h4 className="font-outfit font-bold text-lg text-white pb-1">
                Alert & Outage Log
              </h4>
              <p className="text-xs text-dark-400">Historical alerts feed across endpoints</p>
            </div>
            
            <div className="flex-1 overflow-y-auto space-y-4 max-h-[450px] pr-1">
              {!loadingAnalytics && dashboardData && dashboardData.recentIncidents.length > 0 ? (
                dashboardData.recentIncidents.map((incident) => {
                  const isSlow = incident.type === 'SLOW';
                  const isResolved = incident.status === 'RESOLVED';

                  let borderClass = 'bg-rose-500/5 border-rose-500/10 hover:border-rose-500/25';
                  let iconClass = 'bg-rose-500/10 text-rose-400';
                  let badgeClass = 'bg-rose-500/10 text-rose-300';
                  let iconEl = <AlertTriangle className="w-4 h-4" />;
                  let typeLabel = incident.status;

                  if (isSlow) {
                    borderClass = 'bg-amber-500/5 border-amber-500/10 hover:border-amber-500/25';
                    iconClass = 'bg-amber-500/10 text-amber-400';
                    badgeClass = 'bg-amber-500/10 text-amber-300';
                    iconEl = <Clock className="w-4 h-4" />;
                    typeLabel = 'SLOW';
                  } else if (isResolved) {
                    borderClass = 'bg-emerald-500/5 border-emerald-500/10 hover:border-emerald-500/25';
                    iconClass = 'bg-emerald-500/10 text-emerald-400';
                    badgeClass = 'bg-emerald-500/10 text-emerald-300';
                    iconEl = <CheckCircle className="w-4 h-4" />;
                  }

                  return (
                    <div
                      key={incident._id}
                      onClick={() => handleIncidentClick(incident._id)}
                      className={`p-4 rounded-2xl border flex items-start gap-3 cursor-pointer transition-all duration-300 animate-fade-in ${borderClass}`}
                    >
                      <div className={`p-1.5 rounded-lg mt-0.5 shrink-0 ${iconClass}`}>
                        {iconEl}
                      </div>

                      <div className="flex-1 flex flex-col gap-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white leading-tight">
                            {incident.monitorId?.name || 'Unknown API'}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded leading-none ${badgeClass}`}>
                            {typeLabel}
                          </span>
                        </div>

                        <p className="text-dark-300 text-[11px] leading-relaxed mt-0.5 line-clamp-2">
                          {incident.message}
                        </p>

                        <div className="text-[10px] text-dark-500 font-mono mt-1.5 flex items-center gap-1">
                          <span>{new Date(incident.downtimeStart).toLocaleDateString()}</span>
                          <span>•</span>
                          <span>
                            {isSlow
                              ? 'Latency Spike'
                              : isResolved
                              ? `${formatIncidentDuration(incident.downtimeStart, incident.downtimeEnd)}`
                              : `${formatIncidentDuration(incident.downtimeStart, null)}`
                            }
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                /* Empty alerts state */
                <div className="flex-1 flex flex-col items-center justify-center text-center py-20">
                  <span className="text-xs font-mono text-emerald-400 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                    ALL SYSTEMS OPERATIONAL
                  </span>
                  <p className="text-xs text-dark-500 mt-3 max-w-xs">
                    No outages have been logged in the past 24 hours.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Monitor Configuration Modal */}
      <MonitorFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSubmit={handleSaveMonitor}
        initialData={editingMonitor}
      />

      {/* User Preferences settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        user={user}
        onUpdate={updateUser}
      />

      {/* Incident Post-Mortem & Timeline Modal */}
      <IncidentDetailModal
        isOpen={isIncidentModalOpen}
        onClose={() => setIsIncidentModalOpen(false)}
        incidentId={selectedIncidentId}
        onActionComplete={reloadAll}
      />

      {/* Regional Latency Diagnostics Modal */}
      <RegionalLatencyModal
        isOpen={isRegionalModalOpen}
        onClose={() => setIsRegionalModalOpen(false)}
        monitorId={selectedRegionalMonitorId}
      />

      {/* AI Outage Prediction Modal */}
      <PredictionModal
        isOpen={isPredictionModalOpen}
        onClose={() => setIsPredictionModalOpen(false)}
        monitorId={selectedPredictionMonitorId}
      />
    </div>
  );
};

export default Dashboard;
