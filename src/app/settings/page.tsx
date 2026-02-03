// src/app/settings/page.tsx
"use client";

import { clearAll } from "@/lib/store";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { useTheme } from "@/hooks/useTheme";
import Link from "next/link";
import { Shield, ArrowUpRight } from "lucide-react";
// NEW: Import profile functions
import { getMyProfile, upsertMyProfile } from "@/lib/profile";

export default function SettingsPage() {
  // State
  const [accepted, setAccepted] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [savingComms, setSavingComms] = useState(false);
  
  // Communication Preferences State
  const [optInUpdates, setOptInUpdates] = useState(false);
  const [optInNewsletter, setOptInNewsletter] = useState(false);

  const router = useRouter();
  const { isDarkMode, toggleDarkMode } = useTheme();

  // --- Load Data from Database ---
  useEffect(() => {
    // 1. Load LocalStorage items (GDPR is fine here as it's a UI acknowledgment)
    if (typeof window !== "undefined") {
      const v = localStorage.getItem("no_phi_ack");
      setAccepted(v === "yes");
    }

    // 2. Load Profile Data from Supabase
    const loadProfileSettings = async () => {
      const profile = await getMyProfile();
      if (profile) {
        // Default to false if value is missing/null
        setOptInUpdates(!!profile.opt_in_updates);
        setOptInNewsletter(!!profile.opt_in_newsletter);
      }
    };
    
    loadProfileSettings();
  }, []);

  // --- Handlers ---

  const saveAck = () => {
    localStorage.setItem("no_phi_ack", accepted ? "yes" : "no");
    alert("Safety setting saved.");
  };

  // NEW: Save to Supabase
  const saveCommsPref = async () => {
    setSavingComms(true);
    try {
      await upsertMyProfile({
        opt_in_updates: optInUpdates,
        opt_in_newsletter: optInNewsletter
      });
      alert("Communication preferences saved to your profile.");
    } catch (error) {
      console.error(error);
      alert("Failed to save preferences. Please try again.");
    } finally {
      setSavingComms(false);
    }
  };

  const deleteAccount = async () => {
      if (!confirm("Are you sure you want to permanently delete your Umbil account? This action cannot be undone and all your CPD data will be lost.")) return;
      
      const confirmText = prompt("To confirm, please type 'DELETE' below:");
      if (confirmText !== "DELETE") {
          alert("Deletion cancelled.");
          return;
      }

      setIsDeleting(true);

      try {
        const { data: { session } } = await supabase.auth.getSession();
        const token = session?.access_token;

        if (!token) {
            alert("You are not logged in.");
            setIsDeleting(false);
            return;
        }

        const res = await fetch("/api/auth/delete-account", {
            method: "DELETE",
            headers: {
                "Authorization": `Bearer ${token}`
            }
        });

        let errData;
        const text = await res.text(); 
        try {
            errData = text ? JSON.parse(text) : {}; 
        } catch {
            errData = { error: "Invalid server response" };
        }

        if (!res.ok) {
            throw new Error(errData.error || "Failed to delete account");
        }

        clearAll();
        await supabase.auth.signOut();
        
        alert("Your account has been permanently deleted. Redirecting to home.");
        router.push("/");

      } catch (err: unknown) {
          console.error(err);
          const msg = err instanceof Error ? err.message : "An unknown error occurred";
          alert(`Error: ${msg}`);
      } finally {
          setIsDeleting(false);
      }
  }

  const handleInformationalChange = () => { };

  return (
    <section className="main-content">
      <div className="container">
        <h2>Settings</h2>

        {/* --- Dark Mode Section --- */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card__body">
            <h3 style={{marginBottom: 12}}>Appearance</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ fontWeight: 500 }}>
                    {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                </div>
                <label className="switch" style={{ position: 'relative', display: 'inline-block', width: '36px', height: '20px' }}>
                    <input 
                        type="checkbox" 
                        checked={isDarkMode} 
                        onChange={toggleDarkMode} 
                        style={{ opacity: 0, width: 0, height: 0 }}
                    />
                    <span 
                        className="slider round" 
                        style={{
                            position: 'absolute', cursor: 'pointer',
                            top: 0, left: 0, right: 0, bottom: 0,
                            backgroundColor: isDarkMode ? 'var(--umbil-brand-teal)' : 'var(--umbil-card-border)',
                            transition: '0.4s', borderRadius: '24px'
                        }}
                    >
                        <span style={{
                            position: 'absolute', content: '""',
                            height: '14px', width: '14px',
                            left: isDarkMode ? 'calc(100% - 17px)' : '3px', 
                            bottom: '3px',
                            backgroundColor: 'var(--umbil-surface)',
                            transition: '0.4s', borderRadius: '50%'
                        }}></span>
                    </span>
                </label>
            </div>
          </div>
        </div>

        {/* --- Communication Preferences Section --- */}
        <div className="card" style={{ marginTop: 24, marginBottom: 24}}>
          <div className="card__body">
            <h3 style={{ marginBottom: 12 }}>Communication Preferences</h3>
            <p className="section-description" style={{ marginBottom: 16 }}>
              Please select if you would like to opt-in to our updates and weekly newsletters:
            </p>

            <div style={{marginBottom: 16, paddingTop: 8}}>
              <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                    id="opt-updates"
                    type="checkbox" 
                    checked={optInUpdates} 
                    onChange={(e) => setOptInUpdates(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                />
                <label htmlFor="opt-updates" style={{ cursor: 'pointer' }}>
                    General updates about Umbil and new upcoming features.
                </label>
              </div>
              <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <input 
                    id="opt-newsletter"
                    type="checkbox" 
                    checked={optInNewsletter} 
                    onChange={(e) => setOptInNewsletter(e.target.checked)} 
                    style={{ cursor: 'pointer' }}
                />
                <label htmlFor="opt-newsletter" style={{ cursor: 'pointer' }}>
                    Subscribe to our weekly newsletter on tips & best practices.
                </label>
              </div>
            </div>

            <button 
                className="btn btn--primary" 
                onClick={saveCommsPref}
                disabled={savingComms}
            >
                {savingComms ? "Saving..." : "Save Preferences"}
            </button>
          </div>
        </div>

        {/* --- GDPR / Data Safety Checklist --- */}
        <div className="card" style={{ marginTop: 24, marginBottom: 24 }}>
          <div className="card__body">
            <h3 style={{marginBottom: 12}}>GDPR / Data Safety Checklist</h3>
            <p className="section-description" style={{marginBottom: 16}}>
                Your safety and data privacy is our priority. Please review and confirm your understanding of our data practices:
            </p>
            
            <div style={{ marginBottom: 16, paddingTop: 8 }}>
                <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={accepted} onChange={(e)=>setAccepted(e.target.checked)} />
                    <label>I understand I must not enter patient-identifiable information (PHI) into Umbil.</label>
                </div>
                <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={true} onChange={handleInformationalChange} />
                    <label>I know that my conversations are logged as CPD and can be exported as a CSV from the &apos;My CPD&apos; page (Right to Data Portability).</label>
                </div>
                <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input type="checkbox" checked={true} onChange={handleInformationalChange} />
                    <label>I understand that deleting my account below performs a full remote erasure of my data (Right to Erasure).</label>
                </div>
            </div>

            <button className="btn btn--primary" onClick={saveAck}>Save PHI Acknowledgment</button>
          </div>
        </div>

        {/* --- Legal --- */}
        <div className="card" style={{ marginBottom: 24 }}>
          <div className="card__body">
            <h3 style={{marginBottom: 12, display: 'flex', alignItems: 'center', gap: '8px'}}>
                <Shield size={20} className="text-teal-600" />
                Legal
            </h3>
            <div className="flex flex-col gap-2">
                <Link href="/privacy" className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400 hover:text-teal-600 dark:hover:text-teal-400 transition-colors p-2 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-md">
                    <span>Privacy Policy</span>
                    <ArrowUpRight size={14} className="opacity-50" />
                </Link>
            </div>
          </div>
        </div>
        
        {/* --- Danger Zone --- */}
        <div className="card" style={{ borderColor: '#fee2e2', backgroundColor: 'var(--umbil-surface)' }}>
          <div className="card__body">
            <h3 style={{marginBottom: 8, color: '#dc2626'}}>Danger Zone: Account Deletion</h3>
            <p className="section-description" style={{marginBottom: 12}}>
                Permanently delete your Umbil user profile and all associated remote CPD/PDP data.
            </p>
            <button 
                className="btn btn--outline" 
                style={{
                    backgroundColor: '#fef2f2', 
                    color: '#dc2626', 
                    borderColor: '#dc2626'
                }} 
                onClick={deleteAccount}
                disabled={isDeleting}
            >
                {isDeleting ? "Deleting..." : "⚠️ Permanently Delete Account"}
            </button>
            <p style={{marginTop: '8px', fontSize: '0.8rem', color: 'var(--umbil-muted)'}}>
                Note: This action is irreversible.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}