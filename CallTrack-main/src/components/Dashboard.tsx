import { useEffect, useState } from 'react';
import { PhoneMissed, MessageSquare, CheckCircle, TrendingUp, Phone, Zap, CreditCard, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Call, Conversation } from '../types';
import { formatDistanceToNow } from '../lib/dateUtils';
import { formatPhone } from '../lib/phoneUtils';

interface Stats {
  missedToday: number;
  missedThisWeek: number;
  smsSent: number;
  unreadMessages: number;
  totalCalls: number;
  answeredToday: number;
}

interface DashboardProps {
  onNavigate: (page: 'missed-calls' | 'conversations' | 'settings') => void;
  onUpgrade: () => void;
}

export default function Dashboard({ onNavigate, onUpgrade }: DashboardProps) {
  const { isSubscribed } = useAuth();
  const [stats, setStats] = useState<Stats>({
    missedToday: 0,
    missedThisWeek: 0,
    smsSent: 0,
    unreadMessages: 0,
    totalCalls: 0,
    answeredToday: 0,
  });
  const [recentCalls, setRecentCalls] = useState<Call[]>([]);
  const [recentConversations, setRecentConversations] = useState<Conversation[]>([]);
  const [loading, setLoading] = useState(true);
  const [hasPhoneNumber, setHasPhoneNumber] = useState(false);

  useEffect(() => {
    loadDashboard();
  }, []);

  async function loadDashboard() {
    setLoading(true);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const weekStart = new Date();
    weekStart.setDate(weekStart.getDate() - 7);

    const [
      { count: missedToday },
      { count: missedThisWeek },
      { count: smsSent },
      { data: convData },
      { count: totalCalls },
      { count: answeredToday },
      { data: callsData },
    ] = await Promise.all([
      supabase.from('calls').select('*', { count: 'exact', head: true }).eq('status', 'missed').gte('created_at', todayStart.toISOString()),
      supabase.from('calls').select('*', { count: 'exact', head: true }).eq('status', 'missed').gte('created_at', weekStart.toISOString()),
      supabase.from('calls').select('*', { count: 'exact', head: true }).eq('sms_sent', true),
      supabase.from('conversations').select('unread_count'),
      supabase.from('calls').select('*', { count: 'exact', head: true }),
      supabase.from('calls').select('*', { count: 'exact', head: true }).eq('status', 'answered').gte('created_at', todayStart.toISOString()),
      supabase.from('calls').select('*, contacts(name, phone_number)').order('created_at', { ascending: false }).limit(5),
    ]);

    const unreadMessages = (convData ?? []).reduce((sum, c) => sum + (c.unread_count || 0), 0);

    setStats({
      missedToday: missedToday ?? 0,
      missedThisWeek: missedThisWeek ?? 0,
      smsSent: smsSent ?? 0,
      unreadMessages,
      totalCalls: totalCalls ?? 0,
      answeredToday: answeredToday ?? 0,
    });

    setRecentCalls((callsData as Call[]) ?? []);

    const { data: recentConvData } = await supabase
      .from('conversations')
      .select('*, contacts(name, phone_number)')
      .order('last_message_at', { ascending: false })
      .limit(5);

    setRecentConversations((recentConvData as Conversation[]) ?? []);

    const { data: phoneSetting } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'twilio_phone_number')
      .maybeSingle();
    setHasPhoneNumber(!!(phoneSetting?.value));

    setLoading(false);
  }

  const statCards = [
    {
      label: 'Missed Today',
      value: stats.missedToday,
      icon: PhoneMissed,
      color: 'text-red-500',
      bg: 'bg-red-50',
      border: 'border-red-100',
    },
    {
      label: 'Unread Messages',
      value: stats.unreadMessages,
      icon: MessageSquare,
      color: 'text-blue-500',
      bg: 'bg-blue-50',
      border: 'border-blue-100',
    },
    {
      label: 'SMS Sent (Total)',
      value: stats.smsSent,
      icon: CheckCircle,
      color: 'text-emerald-500',
      bg: 'bg-emerald-50',
      border: 'border-emerald-100',
    },
    {
      label: 'Missed This Week',
      value: stats.missedThisWeek,
      icon: TrendingUp,
      color: 'text-amber-500',
      bg: 'bg-amber-50',
      border: 'border-amber-100',
    },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-slate-500 text-sm mt-1">Overview of your call and messaging activity</p>
      </div>

      {(!hasPhoneNumber || !isSubscribed) && (
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="font-semibold text-slate-800 mb-1">Getting Started</h2>
          <p className="text-sm text-slate-500 mb-4">Complete these steps to start tracking missed calls</p>
          <div className="space-y-3">
            <div className={`flex items-start gap-3 p-3 rounded-lg border ${hasPhoneNumber ? 'border-emerald-100 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${hasPhoneNumber ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                {hasPhoneNumber ? <CheckCircle size={14} className="text-white" /> : <span className="text-xs font-bold text-slate-500">1</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${hasPhoneNumber ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>Connect your Twilio number</p>
                <p className="text-xs text-slate-500 mt-0.5">Add your Twilio phone number and configure the webhooks in Settings</p>
              </div>
              {!hasPhoneNumber && (
                <button
                  onClick={() => onNavigate('settings')}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Settings size={12} /> Go to Settings
                </button>
              )}
            </div>

            <div className={`flex items-start gap-3 p-3 rounded-lg border ${isSubscribed ? 'border-emerald-100 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isSubscribed ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                {isSubscribed ? <CheckCircle size={14} className="text-white" /> : <span className="text-xs font-bold text-slate-500">2</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${isSubscribed ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>Upgrade to a paid plan</p>
                <p className="text-xs text-slate-500 mt-0.5">Unlock unlimited call tracking, custom SMS templates, and full conversation history</p>
              </div>
              {!isSubscribed && (
                <button
                  onClick={onUpgrade}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Zap size={12} /> Upgrade
                </button>
              )}
            </div>

            <div className={`flex items-start gap-3 p-3 rounded-lg border ${stats.totalCalls > 0 ? 'border-emerald-100 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
              <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${stats.totalCalls > 0 ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                {stats.totalCalls > 0 ? <CheckCircle size={14} className="text-white" /> : <span className="text-xs font-bold text-slate-500">3</span>}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${stats.totalCalls > 0 ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>Receive your first call</p>
                <p className="text-xs text-slate-500 mt-0.5">Once Twilio is configured, incoming calls will be tracked automatically</p>
              </div>
              {stats.totalCalls === 0 && (
                <button
                  onClick={() => onNavigate('missed-calls')}
                  className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                >
                  <Phone size={12} /> Log a Call
                </button>
              )}
            </div>

            {hasPhoneNumber && (
              <div className={`flex items-start gap-3 p-3 rounded-lg border ${isSubscribed ? 'border-emerald-100 bg-emerald-50' : 'border-slate-100 bg-slate-50'}`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${isSubscribed ? 'bg-emerald-500' : 'bg-slate-200'}`}>
                  {isSubscribed ? <CheckCircle size={14} className="text-white" /> : <span className="text-xs font-bold text-slate-500">4</span>}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${isSubscribed ? 'text-emerald-700 line-through' : 'text-slate-800'}`}>Configure Stripe payments</p>
                  <p className="text-xs text-slate-500 mt-0.5">Set up Stripe to accept subscription payments from your customers</p>
                </div>
                {!isSubscribed && (
                  <button
                    onClick={() => onNavigate('settings')}
                    className="shrink-0 flex items-center gap-1.5 text-xs font-semibold text-blue-600 border border-blue-200 bg-blue-50 hover:bg-blue-100 px-2.5 py-1.5 rounded-lg transition-colors"
                  >
                    <CreditCard size={12} /> Setup
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map(({ label, value, icon: Icon, color, bg, border }) => (
          <div key={label} className={`bg-white rounded-xl border ${border} p-5 flex items-start gap-4`}>
            <div className={`${bg} ${color} p-2.5 rounded-lg`}>
              <Icon size={20} />
            </div>
            <div>
              <p className="text-2xl font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500 mt-0.5 leading-tight">{label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <Phone size={16} className="text-slate-400" /> Recent Calls
            </h2>
            <button
              onClick={() => onNavigate('missed-calls')}
              className="text-blue-600 text-sm hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentCalls.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">No calls yet</p>
            ) : (
              recentCalls.map((call) => (
                <div key={call.id} className="flex items-center gap-3 px-5 py-3">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${call.status === 'missed' ? 'bg-red-400' : 'bg-emerald-400'}`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {call.contacts?.name || formatPhone(call.caller_number)}
                    </p>
                    {call.contacts?.name && (
                      <p className="text-xs text-slate-400">{formatPhone(call.caller_number)}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      call.status === 'missed'
                        ? 'bg-red-50 text-red-600'
                        : 'bg-emerald-50 text-emerald-600'
                    }`}>
                      {call.status}
                    </span>
                    <p className="text-xs text-slate-400 mt-1">{formatDistanceToNow(call.created_at)}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
            <h2 className="font-semibold text-slate-800 flex items-center gap-2">
              <MessageSquare size={16} className="text-slate-400" /> Recent Conversations
            </h2>
            <button
              onClick={() => onNavigate('conversations')}
              className="text-blue-600 text-sm hover:underline"
            >
              View all
            </button>
          </div>
          <div className="divide-y divide-slate-50">
            {recentConversations.length === 0 ? (
              <p className="text-slate-400 text-sm text-center py-10">No conversations yet</p>
            ) : (
              recentConversations.map((conv) => (
                <div key={conv.id} className="flex items-center gap-3 px-5 py-3">
                  <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                    <MessageSquare size={14} className="text-slate-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {conv.contacts?.name || formatPhone(conv.customer_number)}
                    </p>
                    <p className="text-xs text-slate-400">{formatDistanceToNow(conv.last_message_at)}</p>
                  </div>
                  {conv.unread_count > 0 && (
                    <span className="bg-blue-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 flex items-center justify-center px-1 shrink-0">
                      {conv.unread_count}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
