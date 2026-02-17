// src/app/auth/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import type { AuthError, EmailOtpType } from "@supabase/supabase-js";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [grade, setGrade] = useState("");
  
  // --- NEW: OTP State ---
  const [otp, setOtp] = useState("");
  const [showVerify, setShowVerify] = useState(false);
  const [verifyType, setVerifyType] = useState<EmailOtpType | null>(null);

  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"signIn" | "signUp" | "forgotPassword">("signIn");
  
  const router = useRouter();

  // Redirect user if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.refresh();
        router.replace("/");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && session)) {
        sessionStorage.setItem("justLoggedIn", "true");
        router.refresh();
        router.replace("/");
      }
    });
    return () => sub?.subscription.unsubscribe();
  }, [router]);

  // --- Sign In / Sign Up Handler
  const handleAuth = async () => {
    if (!email.trim() || !password.trim()) {
      setMsg("Please enter both email and password.");
      return;
    }

    setSending(true);
    setMsg(null);

    let error: AuthError | null = null;

    if (mode === "signIn") {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      error = signInError;

      if (!signInError) {
        sessionStorage.setItem("justLoggedIn", "true");
        router.refresh();
        router.push("/");
        return;
      }

    } else if (mode === "signUp") {
      // --- UPDATED: No emailRedirectTo ---
      // This reduces the chance of NHS firewalls blocking the request due to URL params.
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            grade: grade || null,
          },
        },
      });
      error = signUpError;

      if (!signUpError) {
        // Success: Switch to Code Entry View
        setVerifyType("signup");
        setShowVerify(true);
        setMsg("✅ Account created! Please check your email for the 6-digit code.");
        setSending(false);
        return;
      }
    }

    setSending(false);

    if (error) {
      // Handle "User already registered" specifically
      if (error.message.includes("already registered")) {
        setMsg("⚠️ This email is already registered. Please Sign In.");
        setMode("signIn");
      } else {
        setMsg(`⚠️ ${error.message}`);
      }
    }
  };

  // --- FORGOT PASSWORD HANDLER
  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setMsg("Please enter your email address above.");
      return;
    }

    setSending(true);
    setMsg(null);

    // Send OTP Code instead of Magic Link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      // No options.emailRedirectTo -> cleaner request
    });

    setSending(false);

    if (error) {
      setMsg(`⚠️ ${error.message}`);
    } else {
      setVerifyType("recovery"); // 'recovery' or 'magiclink' depending on Supabase version, 'recovery' is safer for pass reset
      setShowVerify(true);
      setMsg("✅ Code sent! Check your email and enter the code below.");
    }
  };

  // --- VERIFY CODE HANDLER
  const handleVerifyOtp = async () => {
    if (!otp.trim()) {
      setMsg("Please enter the 6-digit code.");
      return;
    }
    setSending(true);
    setMsg(null);

    // Handle generic 'email' verification vs recovery
    // If it was signup, type is 'signup'. If it was forgot password, it's 'recovery' or 'magiclink'
    // 'email' often covers both in newer Supabase versions, but explicit is better.
    const typeToUse = verifyType === "signup" ? "signup" : "email"; 

    const { error } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: typeToUse,
    });

    if (error) {
      setSending(false);
      setMsg(`⚠️ ${error.message}`);
    } else {
      setMsg("✅ Verified! Signing you in...");
      // onAuthStateChange will handle the redirect
    }
  };

  const isForgot = mode === "forgotPassword";
  
  let title = "Sign in to Umbil";
  if (showVerify) title = "Verify Email";
  else if (mode === "signUp") title = "Create Account";
  else if (mode === "forgotPassword") title = "Reset Password";

  return (
    <section className="main-content">
      <div className="container">
        <h2>{title}</h2>

        <div className="card" style={{ marginTop: 16 }}>
          <div className="card__body">
            
            {/* --- NEW: VERIFICATION VIEW --- */}
            {showVerify ? (
              <>
                <div style={{ margin: "12px 0", textAlign: "center", opacity: 0.8 }}>
                  We sent a code to <strong>{email}</strong>.<br/>
                  <span style={{ fontSize: '0.85rem', color: 'var(--umbil-brand-teal)' }}>
                    (Please check your Junk folder if it doesn't appear)
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Verification Code</label>
                  <input
                    className="form-control"
                    type="text"
                    placeholder="123456"
                    value={otp}
                    onChange={(e) => setOtp(e.target.value.trim())}
                    disabled={sending}
                    style={{ letterSpacing: '2px', fontSize: '1.2rem', textAlign: 'center' }}
                  />
                </div>

                <div className="flex justify-end mt-4">
                  <button
                    className="btn btn--secondary"
                    onClick={() => { setShowVerify(false); setMsg(null); }}
                    style={{ marginRight: 8 }}
                    disabled={sending}
                  >
                    Back
                  </button>
                  <button
                    className="btn btn--primary"
                    onClick={handleVerifyOtp}
                    disabled={sending || otp.length < 6}
                  >
                    {sending ? "Verifying..." : "Verify Code"}
                  </button>
                </div>
              </>
            ) : (
              /* --- STANDARD FORM --- */
              <>
                {!isForgot && (
                  <div style={{ margin: "12px 0", opacity: 0.8, textAlign: "center" }}>
                    Continue with your email and password
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">Email Address</label>
                  <input
                    className="form-control"
                    type="email"
                    placeholder="e.g., your.email@nhs.net"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={sending}
                  />
                </div>

                {mode === "signUp" && (
                  <div className="form-group">
                    <label className="form-label">Position / Grade (Optional)</label>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="e.g., 5th Year Medical Student, GP, FY1"
                      value={grade}
                      onChange={(e) => setGrade(e.target.value)}
                      disabled={sending}
                    />
                  </div>
                )}

                {!isForgot && (
                  <div className="form-group">
                    <label className="form-label">Password</label>
                    <input
                      className="form-control"
                      type="password"
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAuth()}
                      disabled={sending}
                    />
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  {isForgot ? (
                    <button
                      className="btn btn--primary"
                      onClick={handleForgotPassword}
                      disabled={sending || !email.trim()}
                    >
                      {sending ? "Sending..." : "Send Reset Code"}
                    </button>
                  ) : (
                    <button
                      className="btn btn--primary"
                      onClick={handleAuth}
                      disabled={sending || !email.trim() || !password.trim()}
                    >
                      {sending
                        ? mode === "signIn" ? "Signing In..." : "Signing Up..."
                        : mode === "signIn" ? "Sign In" : "Sign Up"}
                    </button>
                  )}
                </div>

                {/* --- FOOTER LINKS --- */}
                <p style={{ marginTop: 16, textAlign: "center", fontSize: "0.9rem" }}>
                  {mode === "signIn" && (
                    <>
                      New to Umbil?
                      <a href="#" onClick={(e) => { e.preventDefault(); setMode("signUp"); setMsg(null); }} className="link" style={{ marginLeft: 8 }}>
                        Create an account
                      </a>
                      <span style={{ margin: "0 8px", color: "var(--umbil-muted)" }}>|</span>
                      <a href="#" onClick={(e) => { e.preventDefault(); setMode("forgotPassword"); setMsg(null); }} className="link">
                        Forgot Password?
                      </a>
                    </>
                  )}
                  {mode === "signUp" && (
                    <>
                      Already have an account?
                      <a href="#" onClick={(e) => { e.preventDefault(); setMode("signIn"); setMsg(null); }} className="link" style={{ marginLeft: 8 }}>
                        Sign in here
                      </a>
                    </>
                  )}
                  {mode === "forgotPassword" && (
                    <a href="#" onClick={(e) => { e.preventDefault(); setMode("signIn"); setMsg(null); }} className="link">
                      ← Back to Sign In
                    </a>
                  )}
                </p>
              </>
            )}

            {msg && (
              <p style={{ marginTop: 12, color: msg.startsWith("⚠️") ? "red" : "var(--umbil-brand-teal)", whiteSpace: "pre-wrap" }}>
                {msg}
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}