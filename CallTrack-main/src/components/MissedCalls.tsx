import { useEffect, useState } from 'react';
import { PhoneMissed, MessageSquare, RefreshCw, Search, Filter, Plus, X, Lock, Zap } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/auth';
import type { Call } from '../types';
import { formatDateTime } from '../lib/dateUtils';
import { formatPhone } from '../lib/phoneUtils';

type FilterPeriod = 'today' | 'week' | 'all';
type FilterStatus = 'all' | 'missed' | 'answered';

interface LogCallForm {
  callerNumber: string;
  callerName: string;
  status: 'missed' | 'answered';
}

const FREE_PLAN_LIMIT = 10;

interface MissedCallsProps {
  onUpgrade: () => void;
}

export default function MissedCalls({ onUpgrade }: MissedCallsProps) {
  const { user, isSubscribed } = useAuth();
  const [calls, setCalls] = useState<Call[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [period, setPeriod] = useState<FilterPeriod>('today');
  const [statusFilter, setStatusFilter] = useState<FilterStatus>('missed');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState<LogCallForm>({ callerNumber: '', callerName: '', status: 'missed' });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadCalls();
  }, [period, statusFilter]);

  async function loadCalls() {
    setLoading(true);
    let query = supabase
      .from('calls')
      .select('*, contacts(name, phone_number)')
      .order('created_at', { ascending: false });

    if (statusFilter !== 'all') query = query.eq('status', statusFilter);

    if (period === 'today') {
      const start = new Date(); start.setHours(0, 0, 0, 0);
      query = query.gte('created_at', start.toISOString());
    } else if (period === 'week') {
      const start = new Date(); start.setDate(start.getDate() - 7);
      query = query.gte('created_at', start.toISOString());
    }

    const { data } = await query.limit(200);
    setCalls((data as Call[]) ?? []);
    setLoading(false);
  }

  async function handleLogCall() {
    if (!isSubscribed) {
      const { count } = await supabase
        .from('calls')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user!.id);
      if ((count ?? 0) >= FREE_PLAN_LIMIT) {
        setFormError('Free plan is limited to 10 calls. Upgrade to log unlimited calls.');
        return;
      }
    }

    const phone = form.callerNumber.trim();
    if (!phone) { setFormError('Please enter a phone number.'); return; }

    setSubmitting(true);
    setFormError('');

    const { data: settings } = await supabase
      .from('settings')
      .select('key, value')
      .eq('user_id', user!.id)
      .in('key', ['twilio_phone_number', 'business_name']);

    const settingsMap: Record<string, string> = {};
    for (const s of settings ?? []) settingsMap[s.key] = s.value;
    const businessNumber = settingsMap['twilio_phone_number'] || 'N/A';

    let contactId: string | null = null;
    const { data: existing } = await supabase
      .from('contacts')
      .select('id')
      .eq('phone_number', phone)
      .eq('user_id', user!.id)
      .maybeSingle();

    if (existing) {
      contactId = existing.id;
      if (form.callerName) {
        await supabase.from('contacts').update({ name: form.callerName }).eq('id', contactId);
      }
    } else {
      const { data: created } = await supabase
        .from('contacts')
        .insert({ phone_number: phone, name: form.callerName || '', user_id: user!.id })
        .select('id')
        .single();
      contactId = created?.id ?? null;
    }

    await supabase.from('calls').insert({
      contact_id: contactId,
      caller_number: phone,
      called_number: businessNumber,
      status: form.status,
      sms_sent: false,
      user_id: user!.id,
    });

    setShowModal(false);
    setForm({ callerNumber: '', callerName: '', status: 'missed' });
    setSubmitting(false);
    setStatusFilter('all');
    setPeriod('today');
    loadCalls();
  }

  const filtered = calls.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.caller_number.includes(q) || (c.contacts?.name || '').toLowerCase().includes(q);
  });

  const visibleCalls = isSubscribed ? filtered : filtered.slice(0, FREE_PLAN_LIMIT);
  const lockedCount = isSubscribed ? 0 : Math.max(0, filtered.length - FREE_PLAN_LIMIT);
  const atFreeLimit = !isSubscribed && calls.length >= FREE_PLAN_LIMIT;

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Missed Calls</h1>
          <p className="text-slate-500 text-sm mt-1">Track and manage all incoming call activity</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={loadCalls}
            className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-3 py-2 rounded-lg hover:bg-slate-50 transition-colors"
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
          {atFreeLimit ? (
            <button
              onClick={onUpgrade}
              className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
            >
              <Zap size={15} />
              Upgrade to Log More
            </button>
          ) : (
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 px-3 py-2 rounded-lg transition-colors"
            >
              <Plus size={15} />
              Log Call
            </button>
          )}
        </div>
      </div>

      {!isSubscribed && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 text-sm text-amber-800">
            <Lock size={14} className="shrink-0 text-amber-500" />
            <span>Free plan shows up to <strong>10 calls</strong>. Upgrade to track unlimited calls and customize auto-SMS.</span>
          </div>
          <button
            onClick={onUpgrade}
            className="shrink-0 text-xs font-semibold text-amber-700 border border-amber-300 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors"
          >
            Upgrade
          </button>
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex flex-col sm:flex-row gap-3 p-4 border-b border-slate-100">
          <div className="relative flex-1">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or number..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter size={15} className="text-slate-400 shrink-0" />
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              {(['today', 'week', 'all'] as FilterPeriod[]).map((p) => (
                <button key={p} onClick={() => setPeriod(p)}
                  className={`px-3 py-2 transition-colors ${period === p ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {p === 'week' ? 'This Week' : p === 'all' ? 'All Time' : 'Today'}
                </button>
              ))}
            </div>
            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
              {(['missed', 'answered', 'all'] as FilterStatus[]).map((s) => (
                <button key={s} onClick={() => setStatusFilter(s)}
                  className={`px-3 py-2 capitalize transition-colors ${statusFilter === s ? 'bg-blue-600 text-white' : 'bg-white text-slate-600 hover:bg-slate-50'}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin w-7 h-7 border-2 border-blue-500 border-t-transparent rounded-full" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-slate-400">
            <PhoneMissed size={40} className="mb-3 opacity-30" />
            <p className="font-medium">No calls found</p>
            <p className="text-sm mt-1">Use "Log Call" to manually record a call</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs font-semibold text-slate-500 uppercase tracking-wide">
                  <th className="px-5 py-3">Caller</th>
                  <th className="px-5 py-3">Number</th>
                  <th className="px-5 py-3">Status</th>
                  <th className="px-5 py-3">SMS Sent</th>
                  <th className="px-5 py-3">Date & Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {visibleCalls.map((call) => (
                  <tr key={call.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-5 py-3.5">
                      <p className="font-medium text-slate-800">{call.contacts?.name || 'Unknown Caller'}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600 font-mono text-xs">{formatPhone(call.caller_number)}</td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                        call.status === 'missed' ? 'bg-red-50 text-red-600' : call.status === 'answered' ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${call.status === 'missed' ? 'bg-red-400' : call.status === 'answered' ? 'bg-emerald-400' : 'bg-slate-400'}`} />
                        {call.status}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      {call.sms_sent ? (
                        <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
                          <MessageSquare size={11} /> Sent
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-500 text-xs">{formatDateTime(call.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            {lockedCount > 0 && (
              <div className="relative">
                <div className="px-5 py-4 border-t border-slate-100 bg-gradient-to-b from-white to-slate-50 blur-[2px] select-none pointer-events-none">
                  {Array.from({ length: Math.min(lockedCount, 3) }).map((_, i) => (
                    <div key={i} className="flex items-center gap-5 py-3 border-b border-slate-50 last:border-0">
                      <div className="h-3.5 bg-slate-200 rounded w-28" />
                      <div className="h-3.5 bg-slate-200 rounded w-24 font-mono" />
                      <div className="h-5 bg-slate-200 rounded-full w-16" />
                      <div className="h-5 bg-slate-200 rounded-full w-12" />
                      <div className="h-3.5 bg-slate-200 rounded w-24" />
                    </div>
                  ))}
                </div>
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 backdrop-blur-[1px]">
                  <div className="text-center px-6 py-4 rounded-2xl">
                    <div className="w-10 h-10 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                      <Lock size={18} className="text-slate-500" />
                    </div>
                    <p className="text-sm font-semibold text-slate-800 mb-0.5">
                      {lockedCount} more call{lockedCount !== 1 ? 's' : ''} hidden
                    </p>
                    <p className="text-xs text-slate-500 mb-3">Upgrade to see your full call history</p>
                    <button
                      onClick={onUpgrade}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 px-4 py-2 rounded-lg transition-colors"
                    >
                      <Zap size={12} />
                      Upgrade Now
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {!loading && filtered.length > 0 && (
          <div className="px-5 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
            <p className="text-xs text-slate-500">
              {isSubscribed
                ? `${filtered.length} record${filtered.length !== 1 ? 's' : ''}`
                : `Showing 1 of ${filtered.length} record${filtered.length !== 1 ? 's' : ''} — free plan`}
            </p>
          </div>
        )}
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h2 className="font-semibold text-slate-900">Log a Missed Call</h2>
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
                <X size={18} />
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Phone Number <span className="text-red-500">*</span></label>
                <input
                  type="tel"
                  value={form.callerNumber}
                  onChange={(e) => setForm((f) => ({ ...f, callerNumber: e.target.value }))}
                  placeholder="e.g. 0412 345 678"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Customer Name <span className="text-slate-400 font-normal">(optional)</span></label>
                <input
                  type="text"
                  value={form.callerName}
                  onChange={(e) => setForm((f) => ({ ...f, callerName: e.target.value }))}
                  placeholder="e.g. John Smith"
                  className="w-full px-3.5 py-2.5 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Call Status</label>
                <div className="flex rounded-lg border border-slate-200 overflow-hidden text-sm">
                  {(['missed', 'answered'] as const).map((s) => (
                    <button
                      key={s}
                      onClick={() => setForm((f) => ({ ...f, status: s }))}
                      className={`flex-1 py-2.5 capitalize font-medium transition-colors ${form.status === s ? (s === 'missed' ? 'bg-red-500 text-white' : 'bg-emerald-500 text-white') : 'bg-white text-slate-600 hover:bg-slate-50'}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              {formError && (
                <div className="flex items-start gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <p className="text-sm text-red-600 flex-1">{formError}</p>
                  {formError.includes('Upgrade') && (
                    <button
                      onClick={() => { setShowModal(false); setFormError(''); onUpgrade(); }}
                      className="shrink-0 text-xs font-semibold text-red-700 underline hover:no-underline"
                    >
                      Upgrade
                    </button>
                  )}
                </div>
              )}
            </div>
            <div className="px-6 pb-5 flex gap-3">
              <button onClick={() => { setShowModal(false); setFormError(''); }} className="flex-1 py-2.5 text-sm font-medium text-slate-600 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                Cancel
              </button>
              <button
                onClick={handleLogCall}
                disabled={submitting}
                className="flex-1 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 rounded-lg transition-colors"
              >
                {submitting ? 'Saving...' : 'Log Call'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
