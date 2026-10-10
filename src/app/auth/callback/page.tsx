"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import type { EmailOtpType } from "@supabase/supabase-js";

const OTP_TYPES = new Set<EmailOtpType>([
  "signup",
  "invite",
  "magiclink",
  "recovery",
  "email",
  "email_change",
]);

const isOtpType = (value: string | null): value is EmailOtpType =>
  !!value && OTP_TYPES.has(value as EmailOtpType);

/**
 * Finishes email confirmation, magic links, and password recovery.
 * A failed link stays on this page. Sending people home left them signed out
 * on the search box, which then showed the free search limit.
 */
export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const finish = async () => {
      const qs = new URLSearchParams(window.location.search);
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
      const pick = (name: string) => qs.get(name) ?? hash.get(name);

      try {
        const code = pick("code");
        const tokenHash = pick("token_hash");
        const otpType = pick("type");
        const accessToken = pick("access_token") ?? pick("accessToken") ?? pick("token");
        const refreshToken = pick("refresh_token") ?? pick("refreshToken") ?? pick("refresh");

        if (code) {
          const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
        } else if (tokenHash && isOtpType(otpType)) {
          const { error: verifyError } = await supabase.auth.verifyOtp({
            token_hash: tokenHash,
            type: otpType,
          });
          if (verifyError) throw verifyError;
        } else if (accessToken) {
          const { error: sessionError } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken ?? "",
          });
          if (sessionError) throw sessionError;
        }

        const { data } = await supabase.auth.getSession();
        if (!data.session) {
          setError("This sign-up link has expired or was already used.");
          return;
        }

        sessionStorage.setItem("justLoggedIn", "true");
        if (pick("type") === "recovery") {
          router.replace("/auth/update-password");
          return;
        }
        if (pick("flow") === "profile_redirect") {
          router.replace("/profile");
          return;
        }
        router.replace("/dashboard");
      } catch (err) {
        console.error("Auth callback failed:", err);
        setError("This sign-up link has expired or was already used.");
      }
    };

    void finish();
  }, [router]);

  return (
    <div className="main-content">
      <div className="container" style={{ textAlign: "center" }}>
        {error ? (
          <>
            <p>{error}</p>
            <p style={{ marginTop: 12 }}>
              <Link href="/auth?mode=signup" className="link">Create an account with your .ac.uk email</Link>
            </p>
          </>
        ) : (
          <p>Finalizing sign-in...</p>
        )}
      </div>
    </div>
  );
}
