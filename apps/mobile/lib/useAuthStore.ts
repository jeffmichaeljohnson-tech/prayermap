import { create } from 'zustand';
import { Session, User } from '@supabase/supabase-js';
import { Platform } from 'react-native';
import * as AppleAuthentication from 'expo-apple-authentication';
import { supabase } from './supabase';

// Use web callback URL that will redirect to the app
const redirectUrl = 'https://prayermap.net/auth/callback';

interface AuthState {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  isInitialized: boolean;
  isAppleAuthAvailable: boolean;

  // Actions
  initialize: () => Promise<void>;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signUp: (email: string, password: string, name?: string) => Promise<{ error: Error | null }>;
  signInWithApple: () => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error: Error | null }>;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  session: null,
  user: null,
  isLoading: false,
  isInitialized: false,
  isAppleAuthAvailable: false,

  initialize: async () => {
    try {
      // Check if Apple Auth is available (iOS 13+)
      const appleAuthAvailable = Platform.OS === 'ios' && await AppleAuthentication.isAvailableAsync();

      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      set({
        session,
        user: session?.user ?? null,
        isInitialized: true,
        isAppleAuthAvailable: appleAuthAvailable,
      });

      // Listen for auth changes
      supabase.auth.onAuthStateChange((_event, session) => {
        set({
          session,
          user: session?.user ?? null
        });
      });
    } catch (error) {
      console.error('Auth initialization error:', error);
      set({ isInitialized: true });
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      set({ isLoading: false });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },

  signUp: async (email: string, password: string, name?: string) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
          data: {
            display_name: name,
          },
        },
      });
      set({ isLoading: false });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },

  signInWithApple: async () => {
    set({ isLoading: true });
    try {
      // Get Apple credential
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });

      // Extract identity token
      if (!credential.identityToken) {
        throw new Error('No identity token received from Apple');
      }

      // Sign in with Supabase using Apple ID token
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'apple',
        token: credential.identityToken,
      });

      if (error) {
        set({ isLoading: false });
        return { error: new Error(error.message) };
      }

      // If we got a full name from Apple (first sign-in only), update the profile
      if (credential.fullName?.givenName && data.user) {
        const displayName = credential.fullName.familyName
          ? `${credential.fullName.givenName} ${credential.fullName.familyName.charAt(0)}.`
          : credential.fullName.givenName;

        await supabase.auth.updateUser({
          data: { display_name: displayName },
        });
      }

      set({ isLoading: false });
      return { error: null };
    } catch (error) {
      set({ isLoading: false });
      // Handle user cancellation gracefully
      if ((error as any).code === 'ERR_REQUEST_CANCELED') {
        return { error: null }; // Not an error, user just cancelled
      }
      return { error: error as Error };
    }
  },

  signOut: async () => {
    set({ isLoading: true });
    try {
      await supabase.auth.signOut();
      set({ session: null, user: null, isLoading: false });
    } catch (error) {
      console.error('Sign out error:', error);
      set({ isLoading: false });
    }
  },

  resetPassword: async (email: string) => {
    set({ isLoading: true });
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: redirectUrl,
      });
      set({ isLoading: false });
      return { error: error ? new Error(error.message) : null };
    } catch (error) {
      set({ isLoading: false });
      return { error: error as Error };
    }
  },
}));
