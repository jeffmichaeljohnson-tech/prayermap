import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import type { User, AuthError } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  loading: boolean;
}

interface SignInResult {
  data: { user: User | null };
  error: AuthError | null;
}

interface UseAuthReturn {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<SignInResult>;
  signUp: (email: string, password: string, name?: string) => Promise<SignInResult>;
  signOut: () => Promise<{ error: AuthError | null }>;
}

/**
 * Hook to manage authentication state with Supabase Auth
 */
export function useAuth(): UseAuthReturn {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
  });

  useEffect(() => {
    if (!supabase) {
      setState({ user: null, loading: false });
      return;
    }

    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setState({
        user: session?.user ?? null,
        loading: false,
      });
    });

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setState({
        user: session?.user ?? null,
        loading: false,
      });
    });

    return () => {
      subscription?.unsubscribe();
    };
  }, []);

  /**
   * Sign in with email and password
   */
  const signIn = async (email: string, password: string): Promise<SignInResult> => {
    if (!supabase) {
      return {
        data: { user: null },
        error: new Error('Supabase not initialized') as AuthError,
      };
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  };

  /**
   * Sign up with email and password
   */
  const signUp = async (email: string, password: string, name?: string): Promise<SignInResult> => {
    if (!supabase) {
      return {
        data: { user: null },
        error: new Error('Supabase not initialized') as AuthError,
      };
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name: name || '',
        },
      },
    });

    return { data, error };
  };

  /**
   * Sign out current user
   */
  const signOut = async (): Promise<{ error: AuthError | null }> => {
    if (!supabase) {
      return { error: new Error('Supabase not initialized') as AuthError };
    }

    const { error } = await supabase.auth.signOut();
    return { error };
  };

  return {
    user: state.user,
    loading: state.loading,
    signIn,
    signUp,
    signOut,
  };
}
