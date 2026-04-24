import { useState } from 'react';
import { CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useAuth } from '../../lib/auth';

const features = [
  '1 dedicated business phone number',
  'Unlimited call tracking',
  'Automatic SMS on missed calls',
  'Full conversation history',
  'Call analytics & trends',
  'Custom SMS templates',
  'Priority support',
];

interface PricingProps {
  onGetStarted: () => void;
  waitlistMode?: boolean;
}

export default function Pricing({ onGetStarted, waitlistMode = false }: PricingProps) {
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  const [interval, setInterval] = useState<'month' | 'year'>('month');
  const { user } = useAuth();

  const monthlyPrice = 89.95;
  const yearlyPrice = 995;
  const yearlyMonthly = (yearlyPrice / 12).toFixed(2);
  const yearlySaving = Math.round(100 - (yearlyPrice / (monthlyPrice * 12)) * 100);

  async function handleCheckout() {
    setCheckoutLoading(true);
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
          origin: window.location.origin,
          userId: user?.id ?? null,
          userEmail: user?.email ?? null,
          interval,
        }),
      });
      const { url, error } = await response.json();
      if (error) throw new Error(error);
      window.location.href = url;
    } catch (err) {
      console.error('Checkout error:', err);
      setCheckoutLoading(false);
    }
  }

  return (
    <section id="pricing" className="max-w-7xl mx-auto px-6 md:px-12 py-24">
      <div className="text-center mb-16">
        <p className="text-blue-400 text-sm font-semibold uppercase tracking-widest mb-3">Pricing</p>
        <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-4">
          One plan. Everything included.
        </h2>
        <p className="text-slate-400 text-lg max-w-xl mx-auto">
          No tiers. No hidden fees. Just everything you need to never miss a business call.
        </p>

        <div className="inline-flex items-center mt-8 bg-slate-800 rounded-xl p-1 gap-1">
          <button
            onClick={() => setInterval('month')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all ${
              interval === 'month'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setInterval('year')}
            className={`px-5 py-2 rounded-lg text-sm font-semibold transition-all flex items-center gap-2 ${
              interval === 'year'
                ? 'bg-white text-slate-900 shadow'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Yearly
            <span className="bg-emerald-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
              Save {yearlySaving}%
            </span>
          </button>
        </div>
      </div>

      <div className="flex justify-center">
        <div className="relative w-full max-w-md rounded-2xl bg-blue-600 border border-blue-500 shadow-2xl shadow-blue-600/25 p-10">
          <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
            <span className="bg-white text-blue-600 text-xs font-bold px-4 py-1 rounded-full">
              All features included
            </span>
          </div>

          <div className="text-center mb-8">
            {interval === 'month' ? (
              <>
                <div className="flex items-baseline justify-center gap-1.5 mb-2">
                  <span className="text-6xl font-extrabold text-white">${monthlyPrice}</span>
                  <span className="text-blue-200 text-lg">AUD/month</span>
                </div>
                <p className="text-blue-100 text-sm">Cancel anytime. No contracts.</p>
              </>
            ) : (
              <>
                <div className="flex items-baseline justify-center gap-1.5 mb-1">
                  <span className="text-6xl font-extrabold text-white">${yearlyMonthly}</span>
                  <span className="text-blue-200 text-lg">AUD/month</span>
                </div>
                <p className="text-blue-200 text-sm mb-1">Billed annually — ${yearlyPrice} AUD/year</p>
                <p className="text-blue-100 text-sm">Cancel anytime. No contracts.</p>
              </>
            )}
          </div>

          <ul className="space-y-3.5 mb-10">
            {features.map(f => (
              <li key={f} className="flex items-center gap-3">
                <CheckCircle2 size={17} className="text-blue-200 shrink-0" />
                <span className="text-blue-50 text-sm">{f}</span>
              </li>
            ))}
          </ul>

          <button
            onClick={waitlistMode ? onGetStarted : (user ? handleCheckout : onGetStarted)}
            disabled={checkoutLoading}
            className="w-full py-4 rounded-xl font-bold text-base bg-white text-blue-600 hover:bg-blue-50 flex items-center justify-center gap-2 transition-all active:scale-95 disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
          >
            {checkoutLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                Redirecting...
              </>
            ) : (
              <>
                {waitlistMode
                  ? `Join waitlist — $${monthlyPrice}/mo at launch`
                  : `Subscribe ${interval === 'year' ? 'yearly' : 'monthly'}`}
                <ArrowRight size={17} />
              </>
            )}
          </button>

          <p className="text-center text-blue-200 text-xs mt-4">
            {waitlistMode ? 'Be first to know when we launch.' : 'No credit card required to get started'}
          </p>
        </div>
      </div>
    </section>
  );
}
