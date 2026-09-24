import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import * as Linking from "expo-linking";

import {
  acquisitionAuthMetadata,
  captureAcquisitionFromUrl,
  persistAcquisitionToProfile,
  readAcquisition,
} from "@/lib/acquisition";
import { getSupabase } from "@/lib/supabase";
import { signupMetadataFromClinicalProfile } from "@umbil/shared";

export type SignUpClinicalProfile = {
  grade: string;
  nation?: string;
  workplace_setting?: string;
};

type AuthContextValue = {
  session: Session | null;
  user: User | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signUp: (
    email: string,
    password: string,
    fullName: string,
    clinical: SignUpClinicalProfile
  ) => Promise<{ error: string | null; needsVerification: boolean }>;
  verifyOtp: (
    email: string,
    token: string,
    type: "signup" | "recovery" | "email"
  ) => Promise<{ error: string | null }>;
  resendSignupCode: (email: string) => Promise<{ error: string | null }>;
  requestPasswordOtp: (email: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const captureFromUrl = (url: string | null) => {
      void captureAcquisitionFromUrl(url);
    };

    void Linking.getInitialURL().then((url) => captureFromUrl(url));
    const sub = Linking.addEventListener("url", ({ url }) => captureFromUrl(url));
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const supabase = getSupabase();

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setIsLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setIsLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (!session?.user) return;
    void persistAcquisitionToProfile();
  }, [session?.user?.id]);

  const signIn = useCallback(async (email: string, password: string) => {
    const { error } = await getSupabase().auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    return { error: error?.message ?? null };
  }, []);

  const signUp = useCallback(
    async (
      email: string,
      password: string,
      fullName: string,
      clinical: SignUpClinicalProfile
    ) => {
      const acquisition = await readAcquisition();
      const { data, error } = await getSupabase().auth.signUp({
        email: email.trim(),
        password,
        options: {
          data: {
            full_name: fullName.trim(),
            ...signupMetadataFromClinicalProfile({
              grade: clinical.grade,
              nation: clinical.nation ?? "",
              workplace_setting: clinical.workplace_setting ?? "",
            }),
            ...(acquisition ? acquisitionAuthMetadata(acquisition) : {}),
          },
        },
      });

      if (error) {
        return { error: error.message, needsVerification: false };
      }

      if (data.session) {
        void persistAcquisitionToProfile();
      }

      const needsVerification = !data.session;
      return { error: null, needsVerification };
    },
    []
  );

  const verifyOtp = useCallback(
    async (email: string, token: string, type: "signup" | "recovery" | "email") => {
      const { error } = await getSupabase().auth.verifyOtp({
        email: email.trim(),
        token: token.trim(),
        type,
      });
      if (!error) {
        void persistAcquisitionToProfile();
      }
      return { error: error?.message ?? null };
    },
    []
  );

  const resendSignupCode = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.resend({
      type: "signup",
      email: email.trim(),
    });
    return { error: error?.message ?? null };
  }, []);

  const requestPasswordOtp = useCallback(async (email: string) => {
    const { error } = await getSupabase().auth.signInWithOtp({
      email: email.trim(),
    });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    await getSupabase().auth.signOut();
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      user: session?.user ?? null,
      isLoading,
      signIn,
      signUp,
      verifyOtp,
      resendSignupCode,
      requestPasswordOtp,
      signOut,
    }),
    [
      session,
      isLoading,
      signIn,
      signUp,
      verifyOtp,
      resendSignupCode,
      requestPasswordOtp,
      signOut,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
};
