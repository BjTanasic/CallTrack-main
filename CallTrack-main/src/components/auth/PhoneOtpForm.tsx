import { useState } from 'react';
import { Mail, ArrowRight, Loader2, Eye, EyeOff, Phone } from 'lucide-react';
import { useAuth } from '../../lib/auth';

type AuthMode = 'signin' | 'signup';

export default function AuthForm() {
  const { signIn, signUp } = useAuth();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please enter your email and password');
      return;
    }

    if (mode === 'signup' && password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    const { error: err } = mode === 'signin'
      ? await signIn(email.trim(), password)
      : await signUp(email.trim(), password);
    setLoading(false);

    if (err) {
      setError(err);
    }
  }

  function toggleMode() {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setError('');
    setPassword('');
  }

  return (
    <div>
      <div className="mb-8">
        <div className="w-14 h-14 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center mb-5">
          {mode === 'signin' ? (
            <Phone size={28} className="text-blue-400" />
          ) : (
            <Mail size={28} className="text-blue-400" />
          )}
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">
          {mode === 'signin' ? 'Sign in to CallTrack' : 'Create your account'}
        </h1>
        <p className="text-slate-400">
          {mode === 'signin'
            ? 'Enter your credentials to access your dashboard'
            : 'Get started with CallTrack today'}
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Email address</label>
          <div className="relative">
            <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-10 pr-4 py-3.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder={mode === 'signup' ? 'Min. 6 characters' : '••••••••'}
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              className="w-full bg-slate-900 border border-slate-700 text-white rounded-xl pl-4 pr-11 py-3.5 text-sm placeholder:text-slate-600 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-colors"
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-500/10 border border-red-500/20 rounded-lg px-4 py-3">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3.5 flex items-center justify-center gap-2 transition-colors mt-2"
        >
          {loading ? (
            <Loader2 size={18} className="animate-spin" />
          ) : (
            <>
              {mode === 'signin' ? 'Sign in' : 'Create account'}
              <ArrowRight size={16} />
            </>
          )}
        </button>
      </form>

      <p className="text-center text-slate-500 text-sm mt-6">
        {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}{' '}
        <button
          onClick={toggleMode}
          className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
        >
          {mode === 'signin' ? 'Sign up' : 'Sign in'}
        </button>
      </p>
    </div>
  );
}
