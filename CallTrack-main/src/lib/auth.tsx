import { createContext, useContext, useEffect, useState } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from './supabase';

export interface Subscription {
  status: string;
  current_period_end: string | null;
  cancel_at_period_end: boolean;
}

interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  subscription: Subscription | null;
  subscriptionLoading: boolean;
  isSubscribed: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  refreshSubscription: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [subscriptionLoading, setSubscriptionLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });

    const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });

    return () => authSub.unsubscribe();
  }, []);

  useEffect(() => {
    if (session?.user) {
      loadSubscription(session.user.id);
    } else {
      setSubscription(null);
    }
  }, [session]);

  async function loadSubscription(userId: string) {
    setSubscriptionLoading(true);
    const { data } = await supabase
      .from('subscriptions')
      .select('status, current_period_end, cancel_at_period_end')
      .eq('user_id', userId)
      .in('status', ['active', 'trialing'])
      .order('current_period_end', { ascending: false })
      .limit(1)
      .maybeSingle();
    setSubscription(data ?? null);
    setSubscriptionLoading(false);
  }

  async function refreshSubscription() {
    if (session?.user) await loadSubscription(session.user.id);
  }

  const isSubscribed = subscription?.status === 'active' || subscription?.status === 'trialing';

  async function provisionNumber(accessToken: string) {
    try {
      await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/provision-number`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
      });
    } catch (_) {
    }
  }

  async function signIn(email: string, password: string) {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function signUp(email: string, password: string) {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (!error && data.session?.access_token) {
      provisionNumber(data.session.access_token);
    }
    if (error) return { error: error.message };
    if (!data.session) {
      return { error: 'Check your email to confirm your account, then sign in.' };
    }
    return { error: null };
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return (
    <AuthContext.Provider value={{
      session,
      user: session?.user ?? null,
      loading,
      subscription,
      subscriptionLoading,
      isSubscribed,
      signIn,
      signUp,
      signOut,
      refreshSubscription,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
