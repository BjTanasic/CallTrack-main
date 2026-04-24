import { useState } from 'react';
import { X, Mail, User, ArrowRight, CheckCircle2, Loader2 } from 'lucide-react';
import { supabase } from '../../lib/supabase';

interface WaitlistModalProps {
  onClose: () => void;
}

export default function WaitlistModal({ onClose }: WaitlistModalProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError(null);
    const { error: dbError } = await supabase.from('waitlist').insert({ email: email.trim(), name: name.trim() });
    setLoading(false);
    if (dbError) {
      if (dbError.code === '23505') {
        setError("You're already on the list! We'll be in touch soon.");
      } else {
        setError('Something went wrong. Please try again.');
      }
      return;
    }
    setDone(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-900 border border-slate-700/60 rounded-2xl w-full max-w-md shadow-2xl shadow-black/50 relative overflow-hidden">
        <div className="absolute top-0 left-0 right-0 h-0.5 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-500 hover:text-white transition-colors p-1 rounded-lg hover:bg-slate-800"
        >
          <X size={18} />
        </button>

        {done ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 bg-green-500/15 rounded-full flex items-center justify-center mx-auto mb-5">
              <CheckCircle2 size={32} className="text-green-400" />
            </div>
            <h2 className="text-2xl font-extrabold text-white mb-3">You're on the list!</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              Thanks for your interest in CallTrack. We'll send you an email at <span className="text-white font-medium">{email}</span> as soon as we launch.
            </p>
            <button
              onClick={onClose}
              className="w-full py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl transition-colors"
            >
              Done
            </button>
          </div>
        ) : (
          <div className="p-8">
            <div className="mb-6">
              <h2 className="text-2xl font-extrabold text-white mb-2">Join the waitlist</h2>
              <p className="text-slate-400 text-sm leading-relaxed">
                We're putting the finishing touches on CallTrack. Sign up and we'll let you know the moment it's ready.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                  Your name (optional)
                </label>
                <div className="relative">
                  <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Jane Smith"
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-400 text-xs font-medium uppercase tracking-wider mb-1.5">
                  Email address
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="you@business.com"
                    required
                    className="w-full bg-slate-800 border border-slate-700 text-white placeholder-slate-500 rounded-xl py-3 pl-10 pr-4 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500/30 transition-colors"
                  />
                </div>
              </div>

              {error && (
                <p className="text-amber-400 text-sm bg-amber-400/10 border border-amber-400/20 rounded-lg px-4 py-2.5">
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={loading || !email.trim()}
                className="w-full py-3.5 bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-xl flex items-center justify-center gap-2 transition-all active:scale-95 mt-2"
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    Join waitlist
                    <ArrowRight size={16} />
                  </>
                )}
              </button>

              <p className="text-center text-slate-500 text-xs">
                No spam. Just a one-time launch notification.
              </p>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
