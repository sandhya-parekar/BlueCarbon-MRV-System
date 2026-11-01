import React, { useEffect, useState } from 'react';
import {
  Sprout, Trees, ShieldCheck, HeartHandshake, MessageSquare, Bell,
  Calendar, MapPin, ArrowRight, TrendingUp, CheckCircle, Clock,
  AlertCircle, RefreshCw, Sparkles, ExternalLink, Activity
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { CommunityDashboardData } from '../types';

interface CommunityDashboardProps {
  onNavigate: (page: string) => void;
}

export const CommunityDashboardPage: React.FC<CommunityDashboardProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState<boolean>(true);
  const [data, setData] = useState<CommunityDashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.getCommunityDashboard();
      setData(res);
    } catch (err: any) {
      console.error('Failed to load community dashboard', err);
      setError(err.message || 'Unable to load dashboard data. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Planted':
      case 'Growing':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Ready for planting':
      case 'Planning':
        return 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border-cyan-500/30';
      case 'Monitoring':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Completed':
        return 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  const getTicketStatusBadge = (status: string) => {
    switch (status) {
      case 'Open':
        return 'bg-sky-500/15 text-sky-600 dark:text-sky-400 border-sky-500/30';
      case 'Assigned':
        return 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30';
      case 'In Progress':
        return 'bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30';
      case 'Waiting for User':
        return 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border-rose-500/30';
      case 'Resolved':
        return 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30';
      case 'Closed':
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  if (loading) {
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center p-8">
        <RefreshCw className="w-9 h-9 text-forest-500 animate-spin mb-3" />
        <p className="text-sm font-medium text-slate-600 dark:text-slate-300">
          Loading your personalized planting dashboard...
        </p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="p-8 max-w-2xl mx-auto">
        <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 text-rose-700 dark:text-rose-300 flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="flex-1">
            <h4 className="font-semibold text-sm">Failed to Load Dashboard</h4>
            <p className="text-xs mt-1 text-rose-600 dark:text-rose-400">{error}</p>
            <button
              onClick={fetchDashboard}
              className="mt-3 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-600 text-white hover:bg-rose-700 transition"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-6">
      
      {/* Personalized Welcome Banner */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-forest-900 via-navy-900 to-ocean-950 p-6 md:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 rounded-full bg-forest-500/15 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-32 -mb-16 w-56 h-56 rounded-full bg-ocean-500/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-forest-500/20 text-forest-300 text-xs font-semibold mb-3 border border-forest-500/30">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Community Planter Portal • {data.user_info.user_type || 'Farmer'}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              Welcome back, {data.user_info.name}!
            </h1>
            <p className="text-sm text-slate-300 mt-1 max-w-2xl leading-relaxed">
              Track your mangrove and coastal tree restoration, record sapling monitoring logs, and get direct scientific advice from certified blue carbon experts.
            </p>
            <div className="flex items-center space-x-4 mt-3 text-xs text-ocean-300 font-medium">
              <span className="flex items-center space-x-1">
                <MapPin className="w-3.5 h-3.5 text-forest-400" />
                <span>{data.user_info.location || 'India'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center space-x-1">
                <HeartHandshake className="w-3.5 h-3.5 text-teal-400" />
                <span>{user?.organization || 'Community Restoration Group'}</span>
              </span>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex flex-wrap md:flex-col gap-2.5 shrink-0">
            <button
              onClick={() => onNavigate('planner')}
              className="px-4 py-2.5 rounded-xl bg-forest-600 hover:bg-forest-500 text-white text-xs font-semibold shadow-lg shadow-forest-900/40 transition flex items-center justify-center space-x-2"
            >
              <Sprout className="w-4 h-4" />
              <span>Plant Growth Planner</span>
            </button>
            <button
              onClick={() => onNavigate('communication')}
              className="px-4 py-2.5 rounded-xl bg-navy-800/80 hover:bg-navy-800 text-ocean-300 hover:text-white border border-ocean-500/30 text-xs font-semibold transition flex items-center justify-center space-x-2"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Ask an Expert</span>
            </button>
          </div>
        </div>
      </div>

      {/* 6 Key Performance Metric Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3.5">
        
        {/* Total Projects */}
        <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">My Projects</span>
            <div className="w-7 h-7 rounded-lg bg-forest-500/10 text-forest-600 dark:text-forest-400 flex items-center justify-center">
              <Trees className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {data.total_projects}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Registered planting sites
          </p>
        </div>

        {/* Total Plants Planted */}
        <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Total Planted</span>
            <div className="w-7 h-7 rounded-lg bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <Sprout className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {data.total_plants_planted.toLocaleString()}
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            Saplings planted
          </p>
        </div>

        {/* Surviving Plants */}
        <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Surviving</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <CheckCircle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
            {data.total_surviving_plants.toLocaleString()}
          </div>
          <div className="flex items-center space-x-1.5 mt-1">
            <div className="flex-1 h-1.5 bg-slate-100 dark:bg-navy-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-emerald-500 rounded-full transition-all"
                style={{ width: `${Math.min(data.overall_survival_percentage, 100)}%` }}
              />
            </div>
            <span className="text-[11px] font-semibold text-slate-600 dark:text-slate-300">
              {data.overall_survival_percentage}%
            </span>
          </div>
        </div>

        {/* Land Area */}
        <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Planting Area</span>
            <div className="w-7 h-7 rounded-lg bg-ocean-500/10 text-ocean-600 dark:text-ocean-400 flex items-center justify-center">
              <MapPin className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {data.total_land_area_ha} <span className="text-xs font-normal text-slate-500">ha</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {data.total_land_area_sq_m.toLocaleString()} m²
          </p>
        </div>

        {/* Carbon Equivalent */}
        <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">CO₂ Equivalent</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {data.estimated_co2e_tonnes} <span className="text-xs font-normal text-slate-500">t</span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
            {data.estimated_carbon_tonnes} t Carbon
          </p>
        </div>

        {/* Support & Messages */}
        <div className="p-4 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 dark:text-slate-400 mb-2">
            <span className="text-xs font-medium">Assistance</span>
            <div className="w-7 h-7 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center">
              <MessageSquare className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-bold text-slate-800 dark:text-white">
            {data.active_tickets_count} <span className="text-xs font-normal text-slate-500">active</span>
          </div>
          <p className="text-[11px] text-purple-600 dark:text-purple-400 font-medium mt-1">
            {data.unread_notifications_count} unread notifications
          </p>
        </div>
      </div>

      {/* Main Grid: Projects & Support Tickets */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: My Planting Projects (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Projects Card */}
          <div className="rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Trees className="w-4 h-4 text-forest-500" />
                  <span>My Planting Projects</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Your ongoing coastal tree restoration initiatives
                </p>
              </div>
              <button
                onClick={() => onNavigate('planner')}
                className="text-xs font-semibold text-ocean-600 dark:text-ocean-400 hover:underline flex items-center space-x-1"
              >
                <span>Manage all projects</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {data.my_projects.length === 0 ? (
              <div className="p-8 text-center rounded-2xl bg-slate-50 dark:bg-navy-800/40 border border-dashed border-slate-300 dark:border-slate-700">
                <Sprout className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">No Projects Created Yet</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
                  Use the Plant Growth Planner to select native mangrove species, calculate land requirements, and register your first project.
                </p>
                <button
                  onClick={() => onNavigate('planner')}
                  className="mt-4 px-4 py-2 rounded-xl bg-forest-600 hover:bg-forest-500 text-white text-xs font-semibold shadow transition"
                >
                  Create New Project
                </button>
              </div>
            ) : (
              <div className="space-y-3.5">
                {data.my_projects.map((proj) => (
                  <div
                    key={proj.id}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-800/60 border border-slate-200 dark:border-slate-750 hover:border-ocean-500/50 transition"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                          <span>{proj.project_name}</span>
                          <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusColor(proj.status)}`}>
                            {proj.status}
                          </span>
                        </h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 italic">
                          {proj.species_name} ({proj.scientific_name})
                        </p>
                      </div>

                      <div className="text-right">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                          {proj.number_of_plants.toLocaleString()} plants
                        </span>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {proj.land_area} {proj.area_unit.replace('_', ' ')}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between pt-2.5 border-t border-slate-200 dark:border-slate-700/60 text-xs text-slate-500 dark:text-slate-400 gap-2">
                      <div className="flex items-center space-x-3">
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3.5 h-3.5 text-forest-500" />
                          <span>{proj.location_name}, {proj.state}</span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <Calendar className="w-3.5 h-3.5 text-ocean-500" />
                          <span>Planted: {proj.planting_date}</span>
                        </span>
                      </div>

                      <div className="flex items-center space-x-3">
                        <span className="font-medium text-emerald-600 dark:text-emerald-400">
                          {proj.current_survival_pct}% Survival
                        </span>
                        <button
                          onClick={() => onNavigate('planner')}
                          className="text-ocean-600 dark:text-ocean-400 font-semibold hover:underline flex items-center space-x-1"
                        >
                          <span>Log Monitoring</span>
                          <ExternalLink className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Plant Growth Monitoring Milestones */}
          <div className="rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <Activity className="w-4 h-4 text-emerald-500" />
                  <span>Recent Growth Monitoring Milestones</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Field observations and survival measurements recorded across your plots
                </p>
              </div>
            </div>

            {data.growth_milestones_summary.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 p-4 text-center">
                No monitoring milestones logged yet. Head to Plant Planner to record your first height and survival check.
              </p>
            ) : (
              <div className="space-y-3">
                {data.growth_milestones_summary.map((m, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-xl bg-slate-50 dark:bg-navy-800/40 border border-slate-200 dark:border-slate-750 flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="font-semibold text-slate-800 dark:text-white">{m.project_name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        Stage: <span className="text-ocean-600 dark:text-ocean-400 font-medium">{m.stage}</span> • Date: {m.date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-slate-800 dark:text-white">{m.height_cm} cm height</div>
                      <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium">
                        {m.survival_pct}% survival ({m.health})
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Support Tickets & Notifications (1 Col) */}
        <div className="space-y-6">
          
          {/* Assistance Requests Card */}
          <div className="rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                  <MessageSquare className="w-4 h-4 text-purple-500" />
                  <span>My Assistance Requests</span>
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                  Conversations with scientific experts
                </p>
              </div>
              <button
                onClick={() => onNavigate('communication')}
                className="text-xs font-semibold text-purple-600 dark:text-purple-400 hover:underline flex items-center space-x-1"
              >
                <span>View all</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {data.my_tickets.length === 0 ? (
              <div className="p-6 text-center rounded-2xl bg-slate-50 dark:bg-navy-800/40 border border-dashed border-slate-300 dark:border-slate-700">
                <HeartHandshake className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  No assistance requests submitted. Have questions about soil salinity, mangrove planting, or diseases?
                </p>
                <button
                  onClick={() => onNavigate('communication')}
                  className="mt-3 px-3 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-500 text-white text-xs font-semibold transition"
                >
                  Ask an Expert
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {data.my_tickets.map((tkt) => (
                  <div
                    key={tkt.id}
                    onClick={() => onNavigate('communication')}
                    className="p-3.5 rounded-2xl bg-slate-50 dark:bg-navy-800/60 border border-slate-200 dark:border-slate-750 hover:border-purple-500/40 cursor-pointer transition"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-mono text-slate-500 dark:text-slate-400 font-semibold">
                        {tkt.ticket_number}
                      </span>
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getTicketStatusBadge(tkt.status)}`}>
                        {tkt.status}
                      </span>
                    </div>

                    <h5 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                      {tkt.subject}
                    </h5>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                      {tkt.description}
                    </p>

                    <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-[10px] text-slate-500 dark:text-slate-400">
                      <span>Category: <strong className="text-slate-700 dark:text-slate-300">{tkt.category}</strong></span>
                      {tkt.assigned_to_name ? (
                        <span className="text-purple-600 dark:text-purple-400 font-medium">
                          Assigned: {tkt.assigned_to_name}
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium">Awaiting assignment</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Notifications Card */}
          <div className="rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-base font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Bell className="w-4 h-4 text-ocean-500" />
                <span>Recent Notifications</span>
              </h3>
              {data.unread_notifications_count > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-ocean-500 text-white">
                  {data.unread_notifications_count} new
                </span>
              )}
            </div>

            {data.recent_notifications.length === 0 ? (
              <p className="text-xs text-slate-500 dark:text-slate-400 p-4 text-center">
                No notifications right now.
              </p>
            ) : (
              <div className="space-y-2.5">
                {data.recent_notifications.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onNavigate('communication')}
                    className={`p-3 rounded-xl border text-xs cursor-pointer transition ${
                      n.is_read
                        ? 'bg-slate-50/50 dark:bg-navy-800/30 border-slate-200/60 dark:border-slate-800 text-slate-600 dark:text-slate-400'
                        : 'bg-ocean-500/10 border-ocean-500/30 text-slate-900 dark:text-slate-100 font-medium'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-semibold text-slate-800 dark:text-white text-xs">{n.title}</span>
                      <span className="text-[10px] text-slate-400">{n.created_at.slice(0, 10)}</span>
                    </div>
                    <p className="text-[11px] leading-relaxed text-slate-600 dark:text-slate-300">
                      {n.message}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

    </div>
  );
};
