import { useEffect, useState, Component } from 'react';
import type { ReactNode } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import MissedCalls from './components/MissedCalls';
import Conversations from './components/Conversations';
import Settings from './components/Settings';
import LandingPage from './components/landing/LandingPage';
import AuthPage from './components/auth/AuthPage';
import { AuthProvider, useAuth } from './lib/auth';
import type { NavPage } from './types';
import { supabase } from './lib/supabase';
import { AlertTriangle, X, Zap, Loader2, CheckCircle2 } from 'lucide-react';

class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="h-screen bg-slate-950 flex items-center justify-center p-6">
          <div className="text-center max-w-sm">
            <AlertTriangle size={40} className="text-amber-400 mx-auto mb-4" />
            <h2 className="text-xl font-bold text-white mb-2">Something went wrong</h2>
            <p className="text-slate-400 text-sm mb-6">An unexpected error occurred. Please refresh the page.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors"
            >
              Refresh page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function UpgradeModal({ onClose, onCheckout, loading }: {
  onClose: () => void;
  onCheckout: (interval: 'month' | 'year') => void;
  loading: boolean;
}) {
  const [interval, setInterval] = useState<'month' | 'year'>('month');

  const monthlyPrice = 89.95;
  const yearlyPrice = 995;
  const yearlyMonthly = (yearlyPrice / 12).toFixed(2);
  const yearlySaving = Math.round(100 - (yearlyPrice / (monthlyPrice * 12)) * 100);

  const features = [
    'Unlimited call tracking',
    'Automatic SMS on missed calls',
    'Full conversation history',
    'Custom SMS templates',
    'Priority support',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="bg-gradient-to-br from-blue-600 to-blue-700 px-6 pt-6 pb-8">
          <div className="flex items-start justify-between mb-4">
            <div>
              <h2 className="text-xl font-bold text-white">Upgrade to Business</h2>
              <p className="text-blue-200 text-sm mt-1">Unlock all features</p>
            </div>
            <button onClick={onClose} className="text-blue-200 hover:text-white transition-colors p-1">
              <X size={18} />
            </button>
          </div>

          <div className="inline-flex items-center bg-blue-800/50 rounded-lg p-1 gap-1 mb-5">
            <button
              onClick={() => setInterval('month')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all ${
                interval === 'month' ? 'bg-white text-slate-900' : 'text-blue-200 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setInterval('year')}
              className={`px-4 py-1.5 rounded-md text-sm font-semibold transition-all flex items-center gap-1.5 ${
                interval === 'year' ? 'bg-white text-slate-900' : 'text-blue-200 hover:text-white'
              }`}
            >
              Yearly
              <span className="bg-emerald-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full">
                -{yearlySaving}%
              </span>
            </button>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-4xl font-extrabold text-white">
              ${interval === 'month' ? monthlyPrice : yearlyMonthly}
            </span>
            <span className="text-blue-200 text-base">AUD/month</span>
          </div>
          {interval === 'year' && (
            <p className="text-blue-200 text-xs mt-1">Billed annually — ${yearlyPrice} AUD/year</p>
          )}
        </div>

        <div className="px-6 py-5">
          <ul className="space-y-2.5 mb-6">
            {features.map(f => (
              <li key={f} className="flex items-center gap-2.5 text-sm text-slate-700">
                <CheckCircle2 size={15} className="text-blue-500 shrink-0" />
                {f}
              </li>
            ))}
          </ul>

          <button
            onClick={() => onCheckout(interval)}
            disabled={loading}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-70"
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Redirecting...</>
            ) : (
              `Subscribe ${interval === 'year' ? 'yearly' : 'monthly'}`
            )}
          </button>
          <p className="text-center text-slate-400 text-xs mt-3">Cancel anytime. No contracts.</p>
        </div>
      </div>
    </div>
  );
}

function AppShell() {
  const { session, loading, isSubscribed, subscriptionLoading } = useAuth();
  const [view, setView] = useState<'landing' | 'auth'>('landing');
  const waitlistMode = new URLSearchParams(window.location.search).get('waitlist') === 'true';
  const [page, setPage] = useState<NavPage>('dashboard');
  const [checkoutStatus, setCheckoutStatus] = useState<'success' | 'cancelled' | null>(() => {
    const params = new URLSearchParams(window.location.search);
    const status = params.get('checkout');
    if (status === 'success' || status === 'cancelled') {
      window.history.replaceState({}, '', window.location.pathname);
      return status;
    }
    return null;
  });
  const [totalUnread, setTotalUnread] = useState(0);
  const [dismissedUpgrade, setDismissedUpgrade] = useState(false);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  async function handleUpgradeCheckout(interval: 'month' | 'year' = 'month') {
    setCheckoutLoading(true);
    setCheckoutError(null);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      const response = await fetch(`${supabaseUrl}/functions/v1/stripe-checkout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${supabaseAnonKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          origin: window.location.origin + '/calltrack',
          userId: session?.user?.id ?? null,
          userEmail: session?.user?.email ?? null,
          interval,
        }),
      });
      const { url, error } = await response.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      const msg = err instanceof Error ? err.message : 'Failed to start checkout.';
      setCheckoutError(msg);
      setCheckoutLoading(false);
      setShowUpgradeModal(false);
    }
  }

  function openUpgradeModal() {
    setShowUpgradeModal(true);
  }

  useEffect(() => {
    if (!session) return;
    loadUnreadCount();
    const channel = supabase
      .channel('app-unread')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'conversations' }, () => {
        loadUnreadCount();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session]);

  async function loadUnreadCount() {
    const { data } = await supabase.from('conversations').select('unread_count');
    const total = (data ?? []).reduce((sum, c) => sum + (c.unread_count || 0), 0);
    setTotalUnread(total);
  }

  if (loading) {
    return (
      <div className="h-screen bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!session) {
    if (view === 'auth') {
      return <AuthPage onShowLanding={() => setView('landing')} />;
    }
    return (
      <>
        {checkoutStatus === 'success' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-2xl p-10 max-w-md w-full text-center shadow-2xl">
              <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-5">
                <svg className="w-8 h-8 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-2xl font-extrabold text-white mb-2">Payment successful!</h2>
              <p className="text-slate-400 text-sm mb-8">
                Welcome to CallTrack Business. Create your account or sign in to get started.
              </p>
              <button
                onClick={() => { setCheckoutStatus(null); setView('auth'); }}
                className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
              >
                Create your account
              </button>
              <button
                onClick={() => setCheckoutStatus(null)}
                className="mt-3 w-full py-3 text-slate-400 hover:text-white text-sm transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}
        {checkoutStatus === 'cancelled' && (
          <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50">
            <div className="bg-slate-800 border border-slate-700 text-slate-300 text-sm px-5 py-3 rounded-xl shadow-lg flex items-center gap-3">
              <span>Checkout was cancelled. You can try again anytime.</span>
              <button onClick={() => setCheckoutStatus(null)} className="text-slate-500 hover:text-white transition-colors">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>
        )}
        <LandingPage onGetStarted={() => setView('auth')} waitlistMode={waitlistMode} />
      </>
    );
  }

  const showUpgradeBanner = !subscriptionLoading && !isSubscribed && !dismissedUpgrade;

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden flex-col">
      {showUpgradeModal && (
        <UpgradeModal
          onClose={() => setShowUpgradeModal(false)}
          onCheckout={handleUpgradeCheckout}
          loading={checkoutLoading}
        />
      )}
      {checkoutError && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 max-w-md w-full px-4">
          <div className="bg-red-600 text-white text-sm px-5 py-3 rounded-xl shadow-lg flex items-center justify-between gap-3">
            <span>{checkoutError}</span>
            <button onClick={() => setCheckoutError(null)} className="shrink-0 hover:opacity-70 transition-opacity">
              <X size={14} />
            </button>
          </div>
        </div>
      )}
      {showUpgradeBanner && (
        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white px-4 py-2.5 flex items-center justify-between gap-4 shrink-0 z-40">
          <div className="flex items-center gap-2.5 text-sm">
            <Zap size={15} className="shrink-0" />
            <span>You're on the free plan. Upgrade to unlock all features and remove limits.</span>
            <button
              onClick={openUpgradeModal}
              disabled={checkoutLoading}
              className="font-semibold underline underline-offset-2 hover:no-underline transition-all flex items-center gap-1.5 disabled:opacity-70"
            >
              {checkoutLoading ? <><Loader2 size={13} className="animate-spin" />Redirecting...</> : 'Upgrade now'}
            </button>
          </div>
          <button
            onClick={() => setDismissedUpgrade(true)}
            className="p-1 rounded hover:bg-white/20 transition-colors shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}
      <div className="flex flex-1 overflow-hidden">
        <Sidebar activePage={page} onNavigate={setPage} unreadCount={totalUnread} />
        <main className="flex-1 overflow-hidden flex flex-col min-h-0">
          <div className="flex-1 overflow-y-auto min-h-0 h-full">
            {page === 'dashboard' && <Dashboard onNavigate={(p) => setPage(p)} onUpgrade={openUpgradeModal} />}
            {page === 'missed-calls' && <MissedCalls onUpgrade={openUpgradeModal} />}
            {page === 'conversations' && (
              <div className="h-full">
                <Conversations />
              </div>
            )}
            {page === 'settings' && <Settings />}
          </div>
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <AppShell />
      </AuthProvider>
    </ErrorBoundary>
  );
}
