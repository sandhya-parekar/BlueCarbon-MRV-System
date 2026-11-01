import React, { useEffect, useState } from 'react';
import {
  MessageSquare, Send, PlusCircle, Filter, Search, User, Shield,
  CheckCircle, Clock, AlertCircle, RefreshCw, Paperclip, ChevronRight,
  UserCheck, Bell, Check, ArrowLeft, Image, Tag, MapPin, Sparkles,
  HelpCircle, Eye, CornerDownRight, XCircle, RotateCcw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import {
  SupportTicket, TicketCategory, TicketStatus, StaffMember,
  NotificationItem, CommunicationStats, isCommunityUserRole
} from '../types';

interface CommunicationCentrePageProps {
  initialTicketId?: string | null;
  onNavigate?: (page: string) => void;
}

export const CommunicationCentrePage: React.FC<CommunicationCentrePageProps> = ({
  initialTicketId,
  onNavigate
}) => {
  const { user } = useAuth();
  const isStaff = !isCommunityUserRole(user?.role);
  const isAdmin = user?.role === 'Admin';

  const [activeTab, setActiveTab] = useState<'tickets' | 'ask' | 'notifications' | 'staff_queue'>(
    'tickets'
  );

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [loadingTickets, setLoadingTickets] = useState<boolean>(true);
  const [loadingDetail, setLoadingDetail] = useState<boolean>(false);
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Reply state
  const [replyText, setReplyText] = useState<string>('');
  const [replyAttachment, setReplyAttachment] = useState<string>('');
  const [sendingReply, setSendingReply] = useState<boolean>(false);

  // New ticket state (Ask an Expert)
  const [newSubject, setNewSubject] = useState<string>('');
  const [newCategory, setNewCategory] = useState<TicketCategory>('Plant Selection');
  const [newDescription, setNewDescription] = useState<string>('');
  const [newLocation, setNewLocation] = useState<string>(
    user ? `${user.district || ''}, ${user.state || ''}`.trim().replace(/^,|,$/g, '') : ''
  );
  const [newAttachment, setNewAttachment] = useState<string>('');
  const [creatingTicket, setCreatingTicket] = useState<boolean>(false);
  const [createSuccess, setCreateSuccess] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);

  // Staff and Assignment state
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([]);
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [assigning, setAssigning] = useState<boolean>(false);
  const [stats, setStats] = useState<CommunicationStats | null>(null);

  // Notifications state
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadNotifsCount, setUnreadNotifsCount] = useState<number>(0);
  const [loadingNotifs, setLoadingNotifs] = useState<boolean>(false);

  // Load tickets list
  const loadTickets = async (selectId?: string) => {
    setLoadingTickets(true);
    try {
      const res = await api.getSupportTickets({
        category: categoryFilter || undefined,
        status: statusFilter || undefined,
        search: searchQuery || undefined,
      });
      setTickets(res.tickets);

      const targetId = selectId || initialTicketId;
      if (targetId) {
        const found = res.tickets.find((t) => t.id === targetId);
        if (found) {
          await loadTicketDetail(found.id);
        } else if (res.tickets.length > 0) {
          await loadTicketDetail(res.tickets[0].id);
        }
      } else if (res.tickets.length > 0 && !selectedTicket) {
        await loadTicketDetail(res.tickets[0].id);
      }
    } catch (err: any) {
      console.error('Error fetching tickets', err);
    } finally {
      setLoadingTickets(false);
    }
  };

  const loadTicketDetail = async (ticketId: string) => {
    setLoadingDetail(true);
    try {
      const detail = await api.getSupportTicketDetails(ticketId);
      setSelectedTicket(detail);
    } catch (err: any) {
      console.error('Failed to load ticket detail', err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const loadNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await api.getNotifications();
      setNotifications(res.notifications);
      setUnreadNotifsCount(res.unread_count);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  const loadStaffAndStats = async () => {
    if (isStaff) {
      try {
        const [staffRes, statsRes] = await Promise.all([
          api.getStaffMembers(),
          api.getCommunicationStats(),
        ]);
        setStaffMembers(staffRes);
        setStats(statsRes);
      } catch (err) {
        console.error('Failed to load staff/stats', err);
      }
    }
  };

  useEffect(() => {
    loadTickets();
    loadNotifications();
    if (isStaff) {
      loadStaffAndStats();
    }
  }, [categoryFilter, statusFilter]);

  // Handle Ask an Expert submission
  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubject.trim() || !newDescription.trim()) {
      setCreateError('Please provide both a subject and a description for your request.');
      return;
    }
    setCreatingTicket(true);
    setCreateError(null);
    try {
      const created = await api.createSupportTicket({
        subject: newSubject.trim(),
        category: newCategory,
        description: newDescription.trim(),
        location: newLocation.trim() || undefined,
        attachment_url: newAttachment.trim() || undefined,
      });

      setCreateSuccess(`Request created successfully (${created.ticket_number})!`);
      setNewSubject('');
      setNewDescription('');
      setNewAttachment('');
      await loadTickets(created.id);
      setActiveTab('tickets');
    } catch (err: any) {
      setCreateError(err.message || 'Failed to submit request. Please try again.');
    } finally {
      setCreatingTicket(false);
    }
  };

  // Handle Reply
  const handleSendReply = async () => {
    if (!selectedTicket || !replyText.trim()) return;
    setSendingReply(true);
    try {
      await api.replySupportTicket(
        selectedTicket.id,
        replyText.trim(),
        replyAttachment.trim() || undefined
      );
      setReplyText('');
      setReplyAttachment('');
      // Reload ticket detail & list
      await loadTicketDetail(selectedTicket.id);
      await loadTickets(selectedTicket.id);
      loadNotifications();
    } catch (err: any) {
      alert(err.message || 'Failed to send reply');
    } finally {
      setSendingReply(false);
    }
  };

  // Handle Status Update
  const handleUpdateStatus = async (newStatus: TicketStatus) => {
    if (!selectedTicket) return;
    try {
      const updated = await api.updateTicketStatus(selectedTicket.id, newStatus);
      setSelectedTicket(updated);
      await loadTickets(updated.id);
    } catch (err: any) {
      alert(err.message || 'Failed to update ticket status');
    }
  };

  // Handle Staff Assignment
  const handleAssignTicket = async () => {
    if (!selectedTicket || !selectedStaffId) return;
    setAssigning(true);
    try {
      const updated = await api.assignSupportTicket(selectedTicket.id, selectedStaffId);
      setSelectedTicket(updated);
      setSelectedStaffId('');
      await loadTickets(updated.id);
      if (isStaff) loadStaffAndStats();
    } catch (err: any) {
      alert(err.message || 'Failed to assign staff member');
    } finally {
      setAssigning(false);
    }
  };

  // Handle Mark Notification Read
  const handleMarkNotifRead = async (id: string, link?: string) => {
    try {
      await api.markNotificationRead(id);
      await loadNotifications();
      if (link && link.includes('ticket=')) {
        const ticketId = link.split('ticket=')[1];
        await loadTicketDetail(ticketId);
        setActiveTab('tickets');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await api.markAllNotificationsRead();
      await loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const getStatusBadge = (status: string) => {
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
      case 'Reopened':
        return 'bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 border-indigo-500/30';
      default:
        return 'bg-slate-500/15 text-slate-600 dark:text-slate-400 border-slate-500/30';
    }
  };

  const categoriesList: TicketCategory[] = [
    'Plant Selection',
    'Mangrove Planting',
    'Soil Conditions',
    'Land Requirements',
    'Water Requirements',
    'Plant Growth',
    'Plant Diseases',
    'Carbon Benefits',
    'Technical Assistance',
    'Planting Assistance',
    'Verification Inquiry',
    'Other',
  ];

  return (
    <div className="max-w-7xl mx-auto p-4 md:p-6 space-y-6">
      
      {/* Header and Mode Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold text-ocean-600 dark:text-ocean-400 uppercase tracking-wider mb-1">
            <MessageSquare className="w-4 h-4" />
            <span>Community Communication Centre</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Ask an Expert & Support Tickets
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Direct scientific guidance on mangrove species, soil salinity, planting density, and MRV verification
          </p>
        </div>

        {/* Tab Switcher */}
        <div className="flex items-center space-x-1.5 p-1 rounded-2xl bg-slate-100 dark:bg-navy-900 border border-slate-200 dark:border-slate-800 shrink-0">
          <button
            onClick={() => setActiveTab('tickets')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeTab === 'tickets'
                ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>{isStaff ? 'All Tickets' : 'My Requests'}</span>
            {tickets.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-200 dark:bg-navy-700 text-slate-700 dark:text-slate-300">
                {tickets.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('ask')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
              activeTab === 'ask'
                ? 'bg-forest-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Ask an Expert</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 relative ${
              activeTab === 'notifications'
                ? 'bg-white dark:bg-navy-800 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Bell className="w-3.5 h-3.5" />
            <span>Notifications</span>
            {unreadNotifsCount > 0 && (
              <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5" />
            )}
          </button>

          {isStaff && (
            <button
              onClick={() => setActiveTab('staff_queue')}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition flex items-center space-x-1.5 ${
                activeTab === 'staff_queue'
                  ? 'bg-purple-600 text-white shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Staff Queue</span>
            </button>
          )}
        </div>
      </div>

      {/* TAB 1: ASK AN EXPERT (New Ticket Form) */}
      {activeTab === 'ask' && (
        <div className="max-w-3xl mx-auto rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
          <div className="mb-6">
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-forest-500/10 text-forest-600 dark:text-forest-400 text-xs font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Scientific & Technical Inquiries</span>
            </div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-white">
              Submit a Question to Mangrove & MRV Scientists
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Our team of Blue Carbon researchers and certified verification officers will review your question and respond with tailored ecological advice.
            </p>
          </div>

          {createSuccess && (
            <div className="mb-5 p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{createSuccess}</span>
            </div>
          )}

          {createError && (
            <div className="mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{createError}</span>
            </div>
          )}

          <form onSubmit={handleCreateTicket} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Question Category *
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {categoriesList.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setNewCategory(cat)}
                    className={`p-2 rounded-xl text-left text-xs transition border flex items-center space-x-1.5 ${
                      newCategory === cat
                        ? 'bg-forest-500/15 border-forest-500 text-forest-700 dark:text-forest-300 font-semibold shadow-sm'
                        : 'bg-slate-50 dark:bg-navy-800/60 border-slate-200 dark:border-slate-700/60 text-slate-600 dark:text-slate-400 hover:border-slate-300'
                    }`}
                  >
                    <Tag className="w-3 h-3 shrink-0" />
                    <span className="truncate">{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Subject / Topic *
              </label>
              <input
                type="text"
                required
                value={newSubject}
                onChange={(e) => setNewSubject(e.target.value)}
                placeholder="e.g. Which Rhizophora species is suitable for muddy tidal creek in Kutch?"
                className="w-full px-3.5 py-2.5 text-xs rounded-xl bg-slate-50 dark:bg-navy-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-forest-500 transition"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Planting Site / Location (Optional)
                </label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={newLocation}
                    onChange={(e) => setNewLocation(e.target.value)}
                    placeholder="e.g. Mundra Creek, Kachchh, Gujarat"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-navy-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-forest-500 transition"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                  Photo / Attachment URL (Optional)
                </label>
                <div className="relative">
                  <Image className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={newAttachment}
                    onChange={(e) => setNewAttachment(e.target.value)}
                    placeholder="https://images.unsplash.com/... or uploaded photo link"
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-slate-50 dark:bg-navy-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-forest-500 transition"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Detailed Description / Symptoms / Soil Observations *
              </label>
              <textarea
                required
                rows={5}
                value={newDescription}
                onChange={(e) => setNewDescription(e.target.value)}
                placeholder="Describe your site conditions, soil salinity, tidal inundation frequency, symptoms of yellowing leaves, or any specific planting questions..."
                className="w-full p-3 text-xs rounded-xl bg-slate-50 dark:bg-navy-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-forest-500 transition"
              />
            </div>

            <div className="pt-2 flex items-center justify-end space-x-3">
              <button
                type="button"
                onClick={() => setActiveTab('tickets')}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creatingTicket}
                className="px-5 py-2.5 rounded-xl bg-forest-600 hover:bg-forest-500 text-white text-xs font-semibold shadow-lg shadow-forest-900/30 transition flex items-center space-x-2 disabled:opacity-50"
              >
                {creatingTicket ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Submitting Question...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Scientific Team</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 2: TICKETS & CHAT-STYLE CONVERSATION */}
      {activeTab === 'tickets' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 min-h-[650px]">
          
          {/* Left Column: Tickets List (5 cols) */}
          <div className="lg:col-span-5 rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-4 shadow-sm flex flex-col h-[750px]">
            
            {/* Search and Filters */}
            <div className="space-y-2.5 mb-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tickets, subject, category..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-xl bg-slate-50 dark:bg-navy-800/80 border border-slate-300 dark:border-slate-750 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-ocean-500 transition"
                />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-navy-800/80 border border-slate-300 dark:border-slate-750 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-ocean-500 transition text-[11px]"
                >
                  <option value="">All Categories</option>
                  {categoriesList.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>

                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-2.5 py-1.5 rounded-xl bg-slate-50 dark:bg-navy-800/80 border border-slate-300 dark:border-slate-750 text-slate-700 dark:text-slate-300 focus:outline-none focus:border-ocean-500 transition text-[11px]"
                >
                  <option value="">All Statuses</option>
                  <option value="Open">Open</option>
                  <option value="Assigned">Assigned</option>
                  <option value="In Progress">In Progress</option>
                  <option value="Waiting for User">Waiting for User</option>
                  <option value="Resolved">Resolved</option>
                  <option value="Closed">Closed</option>
                </select>
              </div>
            </div>

            {/* List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1">
              {loadingTickets ? (
                <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center">
                  <RefreshCw className="w-6 h-6 animate-spin text-ocean-500 mb-2" />
                  <span>Loading support tickets...</span>
                </div>
              ) : tickets.length === 0 ? (
                <div className="py-12 text-center text-xs text-slate-400">
                  <HelpCircle className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>No support tickets match the selected filters.</p>
                </div>
              ) : (
                tickets.map((t) => {
                  const isSelected = selectedTicket?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => loadTicketDetail(t.id)}
                      className={`p-3.5 rounded-2xl border transition cursor-pointer text-left ${
                        isSelected
                          ? 'bg-ocean-500/10 border-ocean-500/60 dark:bg-ocean-950/40 shadow-sm'
                          : 'bg-slate-50 dark:bg-navy-800/40 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono font-bold text-slate-500 dark:text-slate-400">
                          {t.ticket_number}
                        </span>
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${getStatusBadge(t.status)}`}>
                          {t.status}
                        </span>
                      </div>

                      <h4 className="text-xs font-bold text-slate-900 dark:text-white line-clamp-1">
                        {t.subject}
                      </h4>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1 line-clamp-2 leading-relaxed">
                        {t.last_message || t.description}
                      </p>

                      <div className="mt-2.5 pt-2 border-t border-slate-200 dark:border-slate-750 flex items-center justify-between text-[10px] text-slate-400">
                        <span className="font-medium text-slate-600 dark:text-slate-300">{t.category}</span>
                        <div className="flex items-center space-x-1.5">
                          {t.assigned_to_name && (
                            <span className="text-purple-600 dark:text-purple-400 font-semibold truncate max-w-[90px]">
                              {t.assigned_to_name}
                            </span>
                          )}
                          <span>•</span>
                          <span>{t.created_at?.slice(5, 10)}</span>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

          </div>

          {/* Right Column: Ticket Conversation & Actions (7 cols) */}
          <div className="lg:col-span-7 rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm flex flex-col h-[750px]">
            {!selectedTicket ? (
              <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-slate-400">
                <MessageSquare className="w-12 h-12 mb-3 opacity-40 text-ocean-400" />
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                  Select a ticket to view conversation
                </h3>
                <p className="text-xs mt-1 max-w-sm text-slate-500">
                  Choose a ticket from the left column to read replies from research staff or post an update.
                </p>
              </div>
            ) : loadingDetail ? (
              <div className="flex-1 flex flex-col items-center justify-center">
                <RefreshCw className="w-8 h-8 text-ocean-500 animate-spin mb-2" />
                <span className="text-xs text-slate-500">Loading conversation thread...</span>
              </div>
            ) : (
              <>
                {/* Ticket Header & Status Toolbar */}
                <div className="pb-4 border-b border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-mono font-bold text-ocean-600 dark:text-ocean-400">
                          {selectedTicket.ticket_number}
                        </span>
                        <span className={`text-[10px] font-semibold px-2.5 py-0.5 rounded-full border ${getStatusBadge(selectedTicket.status)}`}>
                          {selectedTicket.status}
                        </span>
                        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-300">
                          {selectedTicket.category}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-slate-900 dark:text-white mt-1">
                        {selectedTicket.subject}
                      </h3>
                    </div>

                    {/* Status Actions */}
                    <div className="flex items-center space-x-2">
                      {/* Community user actions */}
                      {isCommunityUserRole(user?.role) && selectedTicket.status === 'Resolved' && (
                        <button
                          onClick={() => handleUpdateStatus('Reopened')}
                          className="px-2.5 py-1 rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-500/25 text-xs font-semibold flex items-center space-x-1"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reopen Request</span>
                        </button>
                      )}
                      {isCommunityUserRole(user?.role) && selectedTicket.status !== 'Closed' && selectedTicket.status !== 'Resolved' && (
                        <button
                          onClick={() => handleUpdateStatus('Closed')}
                          className="px-2.5 py-1 rounded-xl bg-slate-100 dark:bg-navy-800 text-slate-600 dark:text-slate-400 hover:text-rose-500 text-xs font-semibold flex items-center space-x-1"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Close Ticket</span>
                        </button>
                      )}

                      {/* Staff actions */}
                      {isStaff && (
                        <select
                          value={selectedTicket.status}
                          onChange={(e) => handleUpdateStatus(e.target.value as TicketStatus)}
                          className="px-2.5 py-1 text-xs rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-semibold focus:outline-none"
                        >
                          <option value="Open">Open</option>
                          <option value="In Progress">In Progress</option>
                          <option value="Waiting for User">Waiting for User</option>
                          <option value="Resolved">Resolved</option>
                          <option value="Closed">Closed</option>
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Creator / Location / Assignment Sub-bar */}
                  <div className="flex flex-wrap items-center justify-between text-xs text-slate-500 dark:text-slate-400 gap-2 pt-1">
                    <div className="flex items-center space-x-3">
                      <span>Submitted by: <strong className="text-slate-700 dark:text-slate-200">{selectedTicket.user_name}</strong> ({selectedTicket.user_type || 'User'})</span>
                      {selectedTicket.location && (
                        <span className="flex items-center space-x-1">
                          <MapPin className="w-3 h-3 text-forest-500" />
                          <span>{selectedTicket.location}</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      {selectedTicket.assigned_to_name ? (
                        <span className="text-purple-600 dark:text-purple-400 font-semibold flex items-center space-x-1">
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Assigned: {selectedTicket.assigned_to_name}</span>
                        </span>
                      ) : (
                        <span className="text-amber-500 font-medium">Unassigned</span>
                      )}

                      {isAdmin && (
                        <div className="flex items-center space-x-1.5 ml-2">
                          <select
                            value={selectedStaffId}
                            onChange={(e) => setSelectedStaffId(e.target.value)}
                            className="px-2 py-0.5 text-[11px] rounded-lg bg-slate-100 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200"
                          >
                            <option value="">Assign staff...</option>
                            {staffMembers.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name} ({s.role})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={handleAssignTicket}
                            disabled={!selectedStaffId || assigning}
                            className="px-2 py-0.5 rounded-lg bg-purple-600 text-white text-[10px] font-semibold hover:bg-purple-500 disabled:opacity-40"
                          >
                            {assigning ? 'Assigning...' : 'Assign'}
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Site Parameters Widget if attached */}
                  {selectedTicket.site_parameters && (
                    <div className="p-3 rounded-2xl bg-forest-50/70 dark:bg-forest-950/30 border border-forest-200/60 dark:border-forest-900/40 text-xs">
                      <div className="font-semibold text-forest-700 dark:text-forest-300 mb-1 flex items-center space-x-1.5">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>Pre-Filled Site & Planting Parameters</span>
                      </div>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px] text-slate-600 dark:text-slate-300">
                        <div>Species: <strong>{selectedTicket.site_parameters.selected_species_name || 'N/A'}</strong></div>
                        <div>Plants: <strong>{selectedTicket.site_parameters.number_of_plants || 'N/A'}</strong></div>
                        <div>Area: <strong>{selectedTicket.site_parameters.available_land_area} {selectedTicket.site_parameters.area_unit}</strong></div>
                        <div>Soil/Water: <strong>{selectedTicket.site_parameters.soil_type || 'N/A'} / {selectedTicket.site_parameters.water_availability || 'N/A'}</strong></div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Messages Chat Scroll Area */}
                <div className="flex-1 overflow-y-auto py-4 space-y-4 pr-1">
                  {selectedTicket.messages && selectedTicket.messages.map((m) => {
                    const isCurrentUser = m.sender_id === user?.id;
                    const isStaffSender = m.sender_role in { Admin: 1, Researcher: 1, 'Verification Officer': 1 };
                    
                    return (
                      <div
                        key={m.id}
                        className={`flex flex-col ${isCurrentUser ? 'items-end' : 'items-start'}`}
                      >
                        <div className="flex items-center space-x-2 text-[10px] text-slate-400 mb-1 px-1">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {m.sender_name}
                          </span>
                          <span className={`px-1.5 py-0.2 rounded-full font-semibold ${
                            isStaffSender
                              ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                              : 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                          }`}>
                            {m.sender_role}
                          </span>
                          <span>•</span>
                          <span>{m.created_at?.slice(11, 16) || ''}</span>
                        </div>

                        <div
                          className={`p-3.5 rounded-2xl max-w-[85%] text-xs leading-relaxed ${
                            isCurrentUser
                              ? 'bg-ocean-600 text-white rounded-tr-sm shadow-md'
                              : isStaffSender
                              ? 'bg-slate-100 dark:bg-navy-800 text-slate-900 dark:text-white rounded-tl-sm border border-purple-500/20'
                              : 'bg-slate-100 dark:bg-navy-800 text-slate-900 dark:text-white rounded-tl-sm border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          <p className="whitespace-pre-wrap">{m.message}</p>

                          {m.attachment_url && (
                            <div className="mt-2.5 pt-2 border-t border-white/20 dark:border-slate-700">
                              <a
                                href={m.attachment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1.5 text-[11px] underline font-semibold"
                              >
                                <Paperclip className="w-3.5 h-3.5" />
                                <span>View Attachment / Evidence</span>
                              </a>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Reply Box */}
                <div className="pt-3 border-t border-slate-200 dark:border-slate-800">
                  <div className="space-y-2">
                    <textarea
                      rows={3}
                      value={replyText}
                      onChange={(e) => setReplyText(e.target.value)}
                      placeholder="Type your response, advice, or clarification here..."
                      className="w-full p-3 text-xs rounded-2xl bg-slate-50 dark:bg-navy-800/80 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:border-ocean-500 transition resize-none"
                    />

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
                      <div className="w-full sm:w-auto relative flex-1 max-w-sm">
                        <Paperclip className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="url"
                          value={replyAttachment}
                          onChange={(e) => setReplyAttachment(e.target.value)}
                          placeholder="Optional image/doc attachment URL"
                          className="w-full pl-8 pr-3 py-1.5 text-[11px] rounded-xl bg-slate-50 dark:bg-navy-800 border border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none"
                        />
                      </div>

                      <button
                        onClick={handleSendReply}
                        disabled={!replyText.trim() || sendingReply}
                        className="w-full sm:w-auto px-5 py-2 rounded-xl bg-ocean-600 hover:bg-ocean-500 text-white text-xs font-semibold shadow transition flex items-center justify-center space-x-1.5 disabled:opacity-40"
                      >
                        {sendingReply ? (
                          <>
                            <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                            <span>Sending...</span>
                          </>
                        ) : (
                          <>
                            <Send className="w-3.5 h-3.5" />
                            <span>Send Reply</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

        </div>
      )}

      {/* TAB 3: NOTIFICATIONS */}
      {activeTab === 'notifications' && (
        <div className="max-w-4xl mx-auto rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-6 md:p-8 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-slate-800 mb-6">
            <div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center space-x-2">
                <Bell className="w-5 h-5 text-ocean-500" />
                <span>Communication Notifications</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Real-time alerts when experts reply, tickets are assigned, or status updates occur
              </p>
            </div>

            {unreadNotifsCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-navy-800 text-slate-700 dark:text-slate-300 hover:text-ocean-500 text-xs font-semibold transition"
              >
                Mark all as read
              </button>
            )}
          </div>

          {loadingNotifs ? (
            <div className="py-12 text-center text-xs text-slate-500 flex flex-col items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-ocean-500 mb-2" />
              <span>Loading notifications...</span>
            </div>
          ) : notifications.length === 0 ? (
            <div className="py-16 text-center text-slate-400 text-xs">
              <Bell className="w-10 h-10 mx-auto mb-2 opacity-40 text-slate-400" />
              <p>You have no notifications yet.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {notifications.map((n) => (
                <div
                  key={n.id}
                  onClick={() => handleMarkNotifRead(n.id, n.link)}
                  className={`p-4 rounded-2xl border transition cursor-pointer flex items-start justify-between gap-4 ${
                    n.is_read
                      ? 'bg-slate-50/50 dark:bg-navy-800/20 border-slate-200/80 dark:border-slate-800/80 text-slate-600 dark:text-slate-400'
                      : 'bg-ocean-500/10 dark:bg-ocean-950/40 border-ocean-500/40 text-slate-900 dark:text-slate-100 font-medium shadow-sm'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                      n.is_read
                        ? 'bg-slate-200 dark:bg-navy-700 text-slate-500'
                        : 'bg-ocean-500 text-white'
                    }`}>
                      <MessageSquare className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                        {n.title}
                      </h4>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-relaxed">
                        {n.message}
                      </p>
                      <span className="text-[10px] text-slate-400 mt-1 inline-block">
                        {n.created_at?.slice(0, 16).replace('T', ' ')}
                      </span>
                    </div>
                  </div>

                  {!n.is_read && (
                    <span className="w-2.5 h-2.5 rounded-full bg-ocean-500 shrink-0 mt-2" />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: STAFF QUEUE & MANAGEMENT DASHBOARD */}
      {activeTab === 'staff_queue' && isStaff && (
        <div className="space-y-6">
          
          {/* Staff Stats Cards */}
          {stats && (
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-3">
              <div className="p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-slate-400 uppercase">Total</span>
                <div className="text-xl font-bold text-slate-900 dark:text-white">{stats.total_tickets}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-sky-500 uppercase">Open</span>
                <div className="text-xl font-bold text-sky-600 dark:text-sky-400">{stats.open_tickets}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-purple-500 uppercase">Assigned</span>
                <div className="text-xl font-bold text-purple-600 dark:text-purple-400">{stats.assigned_tickets}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-amber-500 uppercase">In Progress</span>
                <div className="text-xl font-bold text-amber-600 dark:text-amber-400">{stats.in_progress_tickets}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-rose-500 uppercase">Waiting User</span>
                <div className="text-xl font-bold text-rose-600 dark:text-rose-400">{stats.waiting_user_tickets}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-emerald-500 uppercase">Resolved</span>
                <div className="text-xl font-bold text-emerald-600 dark:text-emerald-400">{stats.resolved_tickets}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 text-center">
                <span className="text-[10px] font-semibold text-amber-600 uppercase">Unassigned</span>
                <div className="text-xl font-bold text-amber-500">{stats.unassigned_tickets}</div>
              </div>
            </div>
          )}

          {/* Active Staff Members Table */}
          <div className="rounded-3xl bg-white dark:bg-navy-900 border border-slate-200 dark:border-slate-800 p-6 shadow-sm">
            <h3 className="text-base font-bold text-slate-900 dark:text-white mb-4 flex items-center space-x-2">
              <Shield className="w-4 h-4 text-purple-500" />
              <span>Scientific Staff & Verification Officers</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {staffMembers.map((s) => (
                <div
                  key={s.id}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-navy-800/60 border border-slate-200 dark:border-slate-750"
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">{s.name}</span>
                    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                      s.role === 'Admin'
                        ? 'bg-purple-500/15 text-purple-600 dark:text-purple-400'
                        : s.role === 'Researcher'
                        ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                        : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    }`}>
                      {s.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{s.email}</p>
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700/60 flex items-center justify-between text-xs">
                    <span className="text-slate-500">Active assigned tickets:</span>
                    <strong className="text-purple-600 dark:text-purple-400 font-bold">{s.active_tickets_count}</strong>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

    </div>
  );
};
