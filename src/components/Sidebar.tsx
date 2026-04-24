import { PhoneMissed, MessageSquare, LayoutDashboard, Settings, Phone, LogOut } from 'lucide-react';
import type { NavPage } from '../types';
import { useAuth } from '../lib/auth';

interface SidebarProps {
  activePage: NavPage;
  onNavigate: (page: NavPage) => void;
  unreadCount: number;
}

const navItems: { id: NavPage; label: string; icon: React.ElementType }[] = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'missed-calls', label: 'Missed Calls', icon: PhoneMissed },
  { id: 'conversations', label: 'Conversations', icon: MessageSquare },
  { id: 'settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ activePage, onNavigate, unreadCount }: SidebarProps) {
  const { user, signOut } = useAuth();

  return (
    <aside className="w-64 bg-slate-900 flex flex-col h-full shrink-0">
      <div className="px-6 py-5 border-b border-slate-800">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 flex items-center justify-center shrink-0">
            <Phone size={18} className="text-white" />
          </div>
          <div>
            <p className="text-white font-semibold text-sm leading-tight">CallTrack</p>
            <p className="text-slate-400 text-xs">Business SMS Suite</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ id, label, icon: Icon }) => {
          const isActive = activePage === id;
          const badge = id === 'conversations' && unreadCount > 0;
          return (
            <button
              key={id}
              onClick={() => onNavigate(id)}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150 group ${
                isActive
                  ? 'bg-blue-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Icon size={18} className={isActive ? 'text-white' : 'text-slate-400 group-hover:text-white'} />
              <span className="flex-1 text-left">{label}</span>
              {badge && (
                <span className="bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1">
                  {unreadCount > 99 ? '99+' : unreadCount}
                </span>
              )}
            </button>
          );
        })}
      </nav>

      <div className="px-4 py-4 border-t border-slate-800 space-y-3">
        {user && (
          <div className="px-1">
            <p className="text-slate-400 text-xs truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={() => signOut()}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-all duration-150 group"
        >
          <LogOut size={16} className="text-slate-500 group-hover:text-white" />
          Sign out
        </button>
      </div>
    </aside>
  );
}
