// src/app/profile/page.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { getMyProfile, upsertMyProfile, Profile } from "@/lib/profile";
import { MEMORY_FIELD_HINT } from "@/lib/clinicalProfile";
import ClinicalProfileFields from "@/components/ClinicalProfileFields";
import { useUserEmail } from "@/hooks/useUserEmail";
import { useRouter } from "next/navigation";
import ResetPassword from "@/components/ResetPassword"; 
import Toast from "@/components/Toast"; 

function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "An unknown error occurred.";
}

export default function ProfilePage() {
  const { email, loading: userLoading } = useUserEmail();
  const router = useRouter();

  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(true);
  // Memory keeps being rewritten by the chat consolidator. Saving an untouched textarea
  // would push a stale value back over it, so track what was loaded.
  const loadedMemoryRef = useRef<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!userLoading && !email) router.push("/auth");
  }, [userLoading, email, router]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const userProfile = await getMyProfile();
      if (userProfile) {
        setProfile(userProfile);
        loadedMemoryRef.current = userProfile.custom_instructions ?? null;
        setIsNewUser(false); 
      }
      setLoading(false);
    };
    if (email) loadProfile();
  }, [email]);

  useEffect(() => {
    if (loading || userLoading) return;
    if (typeof window === "undefined") return;
    if (window.location.hash !== "#clinical-details") return;
    document.getElementById("clinical-details")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [loading, userLoading]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      const memoryUntouched = (profile.custom_instructions ?? null) === loadedMemoryRef.current;
      const { custom_instructions, ...rest } = profile;

      await upsertMyProfile(memoryUntouched ? rest : { ...rest, custom_instructions });

      // Re-read so the textarea reflects anything the chat consolidator wrote meanwhile.
      const saved = await getMyProfile();
      if (saved) {
        setProfile(saved);
        loadedMemoryRef.current = saved.custom_instructions ?? null;
      }

      setLoading(false);
      setToastMessage("Profile saved successfully!");
      // We don't strictly need to redirect immediately, showing a success message is better UX here!
    } catch (e: unknown) {
      setError(getErrorMessage(e));
      setLoading(false);
    }
  };

  if (userLoading || loading) return <p>Loading...</p>;

  return (
    <section className="main-content">
      <div className="container">
        <h1 className="profile-page-title">{isNewUser ? "Complete Your Profile" : "Edit Profile"}</h1>
        <p className="profile-page-subtitle">Password, AI memory, and account details.</p>

        {/* --- NEW SECTION: ACCOUNT INFO --- */}
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card__body">
            <h3>Account Information</h3>
            
            <div className="form-group" style={{marginTop: 16}}>
              <label className="form-label">Primary Account Email</label>
              <input
                className="form-control"
                type="text"
                value={email || ""}
                disabled
                style={{ backgroundColor: 'var(--umbil-hover-bg)', opacity: 0.8, cursor: 'not-allowed' }}
              />
              <p style={{ fontSize: '0.85rem', color: 'var(--umbil-muted)', marginTop: 4 }}>
                This is your login email, managed securely.
              </p>
            </div>

            <div className="form-group" style={{marginTop: 16}}>
              <label className="form-label">University Email (.ac.uk)</label>
              <input
                className="form-control"
                type="email"
                value={profile.academic_email || ""}
                onChange={(e) => setProfile({ ...profile, academic_email: e.target.value })}
                placeholder="e.g. j.doe@ucl.ac.uk"
              />
              <p style={{ fontSize: '0.85rem', color: 'var(--umbil-brand-teal)', marginTop: 4, fontWeight: 500 }}>
                Are you a medical student? Add a valid .ac.uk email here to automatically unlock Umbil Pro.
              </p>
            </div>
          </div>
        </div>
        
        <div id="clinical-details" className="card" style={{ marginTop: 24 }}> 
          <div className="card__body">
            <h3>Your Clinical Details</h3>
            <div className="form-group" style={{marginTop: 16}}>
              <label className="form-label">Full Name</label>
              <input
                className="form-control"
                type="text"
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Dr. Mickey Mouse" 
              />
            </div>
            <ClinicalProfileFields
              idPrefix="profile"
              values={{
                grade: profile.grade || "",
                nation: profile.nation || "",
                workplace_setting: profile.workplace_setting || "",
              }}
              onChange={(field, value) => setProfile({ ...profile, [field]: value })}
            />
            
            <div className="form-group" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--umbil-border)' }}>
                <label className="form-label">Memory & Custom Instructions</label>
                <p className="section-description" style={{ marginBottom: 8, fontSize: '0.9rem' }}>
                    {MEMORY_FIELD_HINT}
                </p>
                <textarea
                    className="form-control"
                    rows={4}
                    value={profile.custom_instructions || ""}
                    onChange={(e) => setProfile({ ...profile, custom_instructions: e.target.value })}
                    placeholder="e.g. Always include a safety-netting section. I prefer simple language."
                    style={{ resize: "vertical" }}
                />
            </div>

            {error && <p style={{ color: 'red', marginTop: 12 }}>{error}</p>}
            <button className="btn btn--primary" onClick={handleSave} disabled={loading} style={{ marginTop: 16 }}>
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
        
        <ResetPassword /> 
      </div>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </section>
  );
}