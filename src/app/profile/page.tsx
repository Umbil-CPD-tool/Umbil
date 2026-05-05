// src/app/profile/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { getMyProfile, upsertMyProfile, Profile } from "@/lib/profile";
import { useUserEmail } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import ResetPassword from "@/components/ResetPassword"; 
import { useCpdStreaks } from "@/hooks/useCpdStreaks"; 
import Toast from "@/components/Toast"; 

function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "An unknown error occurred.";
}

const getLastYearDates = () => {
    const dates: { date: Date; dateStr: string; isFiller: boolean }[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    const cursorDate = new Date(today);
    
    for (let i = 0; i < 364; i++) {
        const dateStr = cursorDate.toISOString().split('T')[0];
        dates.unshift({ date: new Date(cursorDate), dateStr, isFiller: false });
        cursorDate.setDate(cursorDate.getDate() - 1);
    }
    return dates;
};

type StreakCalendarProps = {
    loggedDates: Map<string, number>; 
    currentStreak: number;
    longestStreak: number;
    loading: boolean;
    setToastMessage: (message: string) => void; 
}

const StreakCalendar = ({ loggedDates, currentStreak, longestStreak, loading, setToastMessage }: StreakCalendarProps) => { 
    const calendarDates = useMemo(getLastYearDates, []);
    const todayStr = new Date().toISOString().split('T')[0];
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    const handleShareStreak = async () => {
        const shareText = `🔥 ${currentStreak}-day streak! I'm using Umbil to capture clinical learning. You should check it out: https://umbil.co.uk`;

        if (navigator.share) {
            try {
                await navigator.share({ title: "My Umbil Streak!", text: shareText });
            } catch (err) {
                console.log("Share API error or cancelled:", err);
            }
        } else {
            navigator.clipboard.writeText(shareText)
                .then(() => setToastMessage("Streak details copied to clipboard!"))
                .catch(err => setToastMessage("❌ Failed to copy text."));
        }
    };

    if (loading) return <p>Loading learning history...</p>;
    
    const getShadeLevel = (count: number) => {
        if (count === 0) return 0;
        if (count >= 6) return 4;
        if (count >= 4) return 3;
        if (count >= 2) return 2;
        return 1; 
    }

    return (
        <div className="card" style={{ marginTop: 24, padding: 20 }}>
            <h3 style={{ marginBottom: 16 }}>Learning History</h3>
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: 16, fontSize: '1rem' }}>
                <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        Current Streak: <span style={{ color: 'var(--umbil-brand-teal)' }}>{currentStreak} {currentStreak === 1 ? 'day' : 'days'} 🔥</span>
                    </div>
                    <div style={{ color: 'var(--umbil-muted)', fontSize: '0.9rem' }}>
                        Longest Streak: {longestStreak} days
                    </div>
                </div>
                {currentStreak > 0 && (
                    <button className="btn btn--outline" onClick={handleShareStreak} style={{ padding: '8px 12px', fontSize: '0.9rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        Share Streak
                    </button>
                )}
            </div>
            
            <div className="calendar-grid-container">
                <div className="day-labels-column">
                    {dayLabels.map((label, index) => (
                        <div key={index} className="day-label-item">
                            {(label === 'M' || label === 'W' || label === 'F') ? label : ''}
                        </div>
                    ))}
                </div>
                <div className="calendar-grid">
                    {calendarDates.map(({ date: dateObj, dateStr }, index) => {
                        const count = loggedDates.get(dateStr) || 0;
                        const isToday = dateStr === todayStr;
                        const dayOfWeek = dateObj.getDay(); 
                        const level = getShadeLevel(count);

                        return (
                            <div
                                key={index}
                                className={`calendar-square level-${level} ${isToday ? 'is-today' : ''}`} 
                                title={`${dateStr}: ${count} ${count === 1 ? 'log' : 'logs'}`}
                                style={{ gridRow: dayOfWeek + 1 }} 
                                data-date={dateStr}
                            />
                        );
                    })}
                </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', fontSize: '0.8rem', marginTop: 12 }}>
                <span style={{ color: 'var(--umbil-muted)', marginRight: 4 }}>Less</span>
                <span className="color-legend level-0"></span>
                <span className="color-legend level-1"></span>
                <span className="color-legend level-2"></span>
                <span className="color-legend level-3"></span>
                <span className="color-legend level-4"></span>
                <span style={{ color: 'var(--umbil-muted)', marginLeft: 4 }}>More</span>
            </div>
        </div>
    );
}

export default function ProfilePage() {
  const { email, loading: userLoading } = useUserEmail();
  const router = useRouter();

  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isNewUser, setIsNewUser] = useState(true);
  
  const { dates: loggedDates, currentStreak, longestStreak, loading: streaksLoading } = useCpdStreaks();
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
        setIsNewUser(false); 
      }
      setLoading(false);
    };
    if (email) loadProfile();
  }, [email]);

  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await upsertMyProfile(profile);
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
        <h2>{isNewUser ? "Complete Your Profile" : "Edit Profile"}</h2>
        
        <StreakCalendar 
            loggedDates={loggedDates} 
            currentStreak={currentStreak} 
            longestStreak={longestStreak} 
            loading={streaksLoading}
            setToastMessage={setToastMessage}
        />

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
        
        <div className="card" style={{ marginTop: 24 }}> 
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
            <div className="form-group">
              <label className="form-label">Position / Grade</label>
              <input
                className="form-control"
                type="text"
                value={profile.grade || ""}
                onChange={(e) => setProfile({ ...profile, grade: e.target.value })}
                placeholder="e.g., FY1 Doctor, GP Trainee"
              />
            </div>
            
            <div className="form-group" style={{ marginTop: 20, paddingTop: 20, borderTop: '1px solid var(--umbil-border)' }}>
                <label className="form-label">Memory & Custom Instructions</label>
                <p className="section-description" style={{ marginBottom: 8, fontSize: '0.9rem' }}>
                    How would you like Umbil to respond? Add context about your role or preferences (e.g., &quot;I prefer tabular outputs&quot;, &quot;I work in a rural GP practice&quot;).
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