import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';
import { AppState } from 'react-native';
import type { Session } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import type { UmbilProfile } from '@/types/app';

type AuthContextValue = {
  session: Session | null;
  profile: UmbilProfile | null;
  initializing: boolean;
  profileLoading: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: PropsWithChildren) {
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UmbilProfile | null>(null);
  const [initializing, setInitializing] = useState(true);
  const [profileLoading, setProfileLoading] = useState(false);

  const loadProfile = useCallback(async (userId?: string) => {
    if (!userId) {
      setProfile(null);
      return;
    }

    setProfileLoading(true);
    const { data, error } = await supabase
      .from('profiles')
      .select(
        'id,email,academic_email,full_name,grade,custom_instructions,is_pro,subscription_status,plan_type',
      )
      .eq('id', userId)
      .single();

    if (error) {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData.user;

      if (error.code === 'PGRST116' && user) {
        const fallbackProfile: UmbilProfile = {
          id: user.id,
          email: user.email ?? null,
          academic_email: null,
          full_name:
            typeof user.user_metadata?.full_name === 'string'
              ? user.user_metadata.full_name
              : null,
          grade:
            typeof user.user_metadata?.grade === 'string'
              ? user.user_metadata.grade
              : null,
          custom_instructions: null,
          is_pro: false,
          subscription_status: null,
          plan_type: null,
        };

        const { error: createError } = await supabase.from('profiles').upsert(
          {
            id: fallbackProfile.id,
            email: fallbackProfile.email,
            full_name: fallbackProfile.full_name,
            grade: fallbackProfile.grade,
          },
          { onConflict: 'id' },
        );

        if (createError) {
          console.warn('Unable to create Umbil profile:', createError.message);
        }
        setProfile(fallbackProfile);
      } else {
        console.warn('Unable to load Umbil profile:', error.message);
        setProfile(null);
      }
    } else {
      setProfile({
        id: data.id,
        email: data.email ?? null,
        academic_email: data.academic_email ?? null,
        full_name: data.full_name ?? null,
        grade: data.grade ?? null,
        custom_instructions: data.custom_instructions ?? null,
        is_pro: Boolean(data.is_pro),
        subscription_status: data.subscription_status ?? null,
        plan_type: data.plan_type ?? null,
      });
    }

    setProfileLoading(false);
  }, []);

  const refreshProfile = useCallback(async () => {
    await loadProfile(session?.user.id);
  }, [loadProfile, session?.user.id]);

  useEffect(() => {
    let mounted = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      void loadProfile(data.session?.user.id).finally(() => {
        if (mounted) setInitializing(false);
      });
    });

    const { data: authListener } = supabase.auth.onAuthStateChange(
      (_event, nextSession) => {
        setSession(nextSession);
        void loadProfile(nextSession?.user.id);
        setInitializing(false);
      },
    );

    const appStateListener = AppState.addEventListener('change', (state) => {
      if (state === 'active') supabase.auth.startAutoRefresh();
      else supabase.auth.stopAutoRefresh();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
      appStateListener.remove();
    };
  }, [loadProfile]);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setProfile(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      profile,
      initializing,
      profileLoading,
      refreshProfile,
      signOut,
    }),
    [
      initializing,
      profile,
      profileLoading,
      refreshProfile,
      session,
      signOut,
    ],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const value = useContext(AuthContext);
  if (!value) throw new Error('useAuth must be used inside AuthProvider.');
  return value;
}
