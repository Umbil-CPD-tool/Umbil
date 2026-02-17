// src/app/auth/page.tsx
"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import Link from "next/link";
import type { AuthError, EmailOtpType } from "@supabase/supabase-js";

export default function AuthPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  
  // --- NEW: Name & Terms State ---
  const [fullName, setFullName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  
  const [grade, setGrade] = useState("");
  
  // --- OTP & Verification State ---
  const [otp, setOtp] = useState("");
  const [showVerify, setShowVerify] = useState(false);
  const [verifyType, setVerifyType] = useState<EmailOtpType | null>(null);

  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [mode, setMode] = useState<"signIn" | "signUp" | "forgotPassword">("signIn");
  
  // --- NEW: Cooldown State ---
  const [cooldown, setCooldown] = useState(0);

  const router = useRouter();

  // Redirect user if already signed in
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.refresh();
        router.replace("/");
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" || (event === "INITIAL_SESSION" && session)) {
        sessionStorage.setItem("justLoggedIn", "true");
        
        // Fix for Edge/race conditions: 
        // Wait briefly for the auth cookie to fully persist before refreshing the server state.
        await new Promise((resolve) => setTimeout(resolve, 500));

        router.refresh();
        router.replace("/");
      }
    });
    return () => sub?.subscription.unsubscribe();
  }, [router]);

  // --- NEW: Cooldown Timer Effect ---
  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  // --- Sign In / Sign Up Handler
  const handleAuth = async () => {
    setMsg(null);

    // 1. Basic Validation
    if (!email.trim() || !password.trim()) {
      setMsg("Please enter both email and password.");
      return;
    }

    // 2. Sign Up Specific Validation
    if (mode === "signUp") {
      if (!fullName.trim()) {
        setMsg("Please enter your full name.");
        return;
      }
      if (!agreeTerms) {
        setMsg("You must agree to the Terms & Conditions to create an account.");
        return;
      }
      
      // Prevent spamming if cooldown is active
      if (cooldown > 0) {
        setMsg(`Please wait ${cooldown}s before trying again.`);
        return;
      }
    }

    setSending(true);

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
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName.trim(), // Save the name
            grade: grade || null,
          },
        },
      });
      error = signUpError;

      if (!signUpError) {
        // Success: Switch to Code Entry View & Start Cooldown
        setVerifyType("signup");
        setShowVerify(true);
        setMsg("✅ Account created! Please check your email for the 6-digit code.");
        setSending(false);
        setCooldown(60); // Start 60s cooldown
        return;
      }
    }

    setSending(false);

    if (error) {
      // Handle Rate Limit specifically
      if (error.status === 429) {
        setMsg("⚠️ Too many requests. Please wait a minute before trying again.");
        setCooldown(60);
      } else if (error.message.includes("already registered")) {
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

    if (cooldown > 0) {
      setMsg(`Please wait ${cooldown}s before sending another code.`);
      return;
    }

    setSending(true);
    setMsg(null);

    const { error } = await supabase.auth.signInWithOtp({
      email,
    });

    setSending(false);

    if (error) {
      if (error.status === 429) {
        setMsg("⚠️ Rate limit reached. Please wait 60s.");
        setCooldown(60);
      } else {
        setMsg(`⚠️ ${error.message}`);
      }
    } else {
      setVerifyType("recovery");
      setShowVerify(true);
      setMsg("✅ Code sent! Check your email and enter the code below.");
      setCooldown(60); // Start 60s cooldown
    }
  };

  // --- NEW: RESEND CODE HANDLER ---
  const handleResend = async () => {
    if (cooldown > 0) return;

    setSending(true);
    setMsg(null);
    let error: AuthError | null = null;

    if (verifyType === "signup") {
      // Resend specific to signup verification
      const { error: resendError } = await supabase.auth.resend({
        type: "signup",
        email,
      });
      error = resendError;
    } else {
      // Resend for recovery (just calls signInWithOtp again)
      const { error: resendError } = await supabase.auth.signInWithOtp({
        email,
      });
      error = resendError;
    }

    setSending(false);

    if (error) {
      if (error.status === 429) {
        setMsg("⚠️ Please wait a moment before resending.");
        setCooldown(60);
      } else {
        setMsg(`⚠️ ${error.message}`);
      }
    } else {
      setMsg("✅ Code resent! Please check your email.");
      setCooldown(60);
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
            
            {/* --- VERIFICATION VIEW --- */}
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

                <div className="flex justify-end mt-4" style={{ alignItems: 'center' }}>
                  {/* Resend Button */}
                  <button
                    className="btn btn--secondary"
                    onClick={handleResend}
                    disabled={sending || cooldown > 0}
                    style={{ marginRight: 'auto', fontSize: '0.9rem', padding: '8px 12px' }}
                  >
                    {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend Code"}
                  </button>

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

                {/* --- NEW: Full Name Input (Sign Up Only) --- */}
                {mode === "signUp" && (
                  <div className="form-group">
                    <label className="form-label">Full Name</label>
                    <input
                      className="form-control"
                      type="text"
                      placeholder="e.g. Dr. Sarah Smith"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      disabled={sending}
                    />
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

                {/* --- NEW: Terms & Conditions Checkbox (Sign Up Only) --- */}
                {mode === "signUp" && (
                  <div className="form-group" style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginTop: 12 }}>
                    <input 
                      type="checkbox" 
                      id="terms" 
                      checked={agreeTerms}
                      onChange={(e) => setAgreeTerms(e.target.checked)}
                      style={{ marginTop: '4px', cursor: 'pointer' }}
                    />
                    <label htmlFor="terms" style={{ fontSize: '0.9rem', color: 'var(--umbil-text)', cursor: 'pointer', lineHeight: '1.4' }}>
                      I agree to the <Link href="/terms" className="link" target="_blank">Terms & Conditions</Link> and <Link href="/privacy" className="link" target="_blank">Privacy Policy</Link>.
                    </label>
                  </div>
                )}

                <div className="flex justify-end mt-4">
                  {isForgot ? (
                    <button
                      className="btn btn--primary"
                      onClick={handleForgotPassword}
                      disabled={sending || !email.trim() || cooldown > 0}
                    >
                      {cooldown > 0 
                        ? `Wait ${cooldown}s` 
                        : sending ? "Sending..." : "Send Reset Code"}
                    </button>
                  ) : (
                    <button
                      className="btn btn--primary"
                      onClick={handleAuth}
                      // Disable logic: Needs Name & Terms for Signup
                      disabled={
                        sending || 
                        !email.trim() || 
                        !password.trim() || 
                        (mode === "signUp" && (cooldown > 0 || !fullName.trim() || !agreeTerms))
                      }
                    >
                      {mode === "signUp" && cooldown > 0
                         ? `Wait ${cooldown}s`
                         : sending
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