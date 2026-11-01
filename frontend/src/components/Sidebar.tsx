import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Database, Scale, HelpCircle,
  Award, GitCompare, ShieldCheck, ClipboardCheck,
  BarChart3, UserCheck, Settings, LogOut, Waves,
  ChevronRight, Moon, Sun, Sprout, MessageSquare,
  HeartHandshake, Bell, Trees
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { api } from '../services/api';
import { isCommunityUserRole } from '../types';

interface SidebarProps {
  activePage: string;
  setActivePage: (page: string) => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activePage,
  setActivePage,
  isOpen,
  setIsOpen
}) => {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [unreadCount, setUnreadCount] = useState<number>(0);

  useEffect(() => {
    if (!user) return;
    const fetchUnread = async () => {
      try {
        const res = await api.getNotifications(true);
        setUnreadCount(res.unread_count);
      } catch (e) {
        // silently ignore error in background
      }
    };
    fetchUnread();
    const interval = setInterval(fetchUnread, 30000);
    return () => clearInterval(interval);
  }, [user]);

  const isCommunityUser = isCommunityUserRole(user?.role);

  const communitySections = [
    {
      title: 'COMMUNITY PLANTER',
      items: [
        { id: 'community-dashboard', label: 'Planter Dashboard', icon: LayoutDashboard },
        { id: 'planner', label: 'Plant Growth Planner', icon: Sprout, badge: 'Planner' },
      ]
    },
    {
      title: 'COMMUNICATION & SUPPORT',
      items: [
        {
          id: 'communication',
          label: 'Communication Centre',
          icon: MessageSquare,
          badge: unreadCount > 0 ? `${unreadCount}` : 'Expert'
        },
      ]
    },
    {
      title: 'SYSTEM & PROFILE',
      items: [
        { id: 'profile', label: 'My Profile', icon: UserCheck },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const staffSections = [
    {
      title: 'CORE MRV PIPELINE',
      items: [
        { id: 'dashboard', label: 'Main Dashboard', icon: LayoutDashboard },
        { id: 'data', label: 'Environmental Data', icon: Database },
        { id: 'biomass', label: 'Biomass Estimation', icon: Scale },
        { id: 'uncertainty', label: 'Uncertainty Assessment', icon: HelpCircle },
      ]
    },
    {
      title: 'RESEARCH ENGINE',
      items: [
        { id: 'prioritization', label: 'Verification Prioritization', icon: Award, badge: 'Core' },
        { id: 'comparative', label: 'Comparative Analysis', icon: GitCompare },
      ]
    },
    {
      title: 'BLOCKCHAIN & AUDIT',
      items: [
        { id: 'blockchain', label: 'Blockchain Registry', icon: ShieldCheck },
        { id: 'verification', label: 'Verification Tasks', icon: ClipboardCheck },
        { id: 'reports', label: 'Reports & Analytics', icon: BarChart3 },
      ]
    },
    {
      title: 'COMMUNITY & COMMUNICATION',
      items: [
        { id: 'planner', label: 'Plant Growth Planner', icon: Sprout },
        {
          id: 'communication',
          label: 'Communication Centre',
          icon: MessageSquare,
          badge: unreadCount > 0 ? `${unreadCount}` : 'Staff'
        },
      ]
    },
    {
      title: 'SYSTEM',
      items: [
        { id: 'profile', label: 'User Profile', icon: UserCheck },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const navSections = isCommunityUser ? communitySections : staffSections;

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        />
      )}

      <aside className={`
        fixed top-0 left-0 z-50 h-screen w-72 bg-navy-900 text-slate-200 border-r border-slate-800
        flex flex-col transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Brand Header */}
        <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
          <div
            className="flex items-center space-x-3 cursor-pointer"
            onClick={() => setActivePage(isCommunityUser ? 'community-dashboard' : 'dashboard')}
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-forest-700 via-ocean-600 to-teal-400 flex items-center justify-center shadow-lg shadow-ocean-900/40">
              <Waves className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-white tracking-tight flex items-center space-x-1">
                <span>BlueCarbon</span>
                <span className="text-ocean-400 font-extrabold text-xs px-1.5 py-0.5 rounded bg-ocean-950/70 border border-ocean-700/50">MRV</span>
              </h1>
              <p className="text-[11px] text-slate-400">
                {isCommunityUser ? 'Community Planter Portal' : 'Uncertainty Prioritization'}
              </p>
            </div>
          </div>
        </div>

        {/* User Card */}
        {user && (
          <div className="mx-4 my-3 p-3 rounded-xl bg-navy-800/60 border border-slate-700/40 flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-forest-800 border border-forest-500/50 text-forest-200 flex items-center justify-center font-bold text-sm shadow-inner">
              {user.name.charAt(0)}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-slate-200 truncate">{user.name}</p>
              <div className="flex items-center space-x-1.5 mt-0.5">
                <span className={`inline-block w-1.5 h-1.5 rounded-full ${
                  user.role === 'Admin'
                    ? 'bg-purple-400'
                    : user.role === 'Verification Officer'
                    ? 'bg-amber-400'
                    : isCommunityUserRole(user.role)
                    ? 'bg-teal-400'
                    : 'bg-emerald-400'
                }`} />
                <p className="text-[10px] text-slate-400 font-medium truncate">
                  {user.role} {user.user_type ? `(${user.user_type})` : ''}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5">
          {navSections.map((section, idx) => (
            <div key={idx}>
              <div className="px-3 mb-1.5 text-[10px] font-bold text-slate-400 tracking-wider">
                {section.title}
              </div>
              <div className="space-y-1">
                {section.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activePage === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        setActivePage(item.id);
                        if (window.innerWidth < 1024) setIsOpen(false);
                      }}
                      className={`
                        w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all
                        ${isActive
                          ? 'bg-gradient-to-r from-forest-800/90 to-ocean-800/90 text-white font-semibold shadow-md border border-ocean-500/30'
                          : 'text-slate-300 hover:bg-navy-800/80 hover:text-white'
                        }
                      `}
                    >
                      <div className="flex items-center space-x-3">
                        <Icon className={`w-4 h-4 ${isActive ? 'text-ocean-300' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        {item.badge && (
                          <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-bold border ${
                            item.id === 'communication' && unreadCount > 0
                              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                              : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                        {isActive && <ChevronRight className="w-3.5 h-3.5 text-ocean-300" />}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-3 border-t border-slate-800/80 flex items-center justify-between">
          <button
            onClick={toggleTheme}
            className="flex items-center space-x-2 text-xs text-slate-300 hover:text-white px-2.5 py-1.5 rounded-lg hover:bg-navy-800 transition-colors"
            title="Toggle Theme"
          >
            {theme === 'dark' ? (
              <>
                <Sun className="w-4 h-4 text-amber-400" />
                <span className="text-[11px]">Light Mode</span>
              </>
            ) : (
              <>
                <Moon className="w-4 h-4 text-ocean-300" />
                <span className="text-[11px]">Dark Mode</span>
              </>
            )}
          </button>

          <button
            onClick={logout}
            className="flex items-center space-x-1.5 text-xs text-rose-400 hover:text-rose-300 px-2.5 py-1.5 rounded-lg hover:bg-rose-950/30 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-4 h-4" />
            <span className="text-[11px]">Logout</span>
          </button>
        </div>
      </aside>
    </>
  );
};

