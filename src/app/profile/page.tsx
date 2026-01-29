// src/app/profile/page.tsx
"use client";

import { useEffect, useState, useMemo } from "react";
import { getMyProfile, upsertMyProfile, Profile } from "@/lib/profile";
import { useUserEmail } from "@/hooks/useUser";
import { useRouter } from "next/navigation";
import ResetPassword from "@/components/ResetPassword"; 
import { useCpdStreaks } from "@/hooks/useCpdStreaks"; 
import Toast from "@/components/Toast"; 

/**
 * Utility function to get a user-friendly error message from an unknown error object.
 * @param e - The error object/value.
 * @returns A string containing the error message.
 */
function getErrorMessage(e: unknown): string {
  return e instanceof Error ? e.message : "An unknown error occurred.";
}

// --- NEW COMPONENT: Streak Calendar ---

// Helper to generate exactly 364 calendar squares for the last 52 weeks (always ends with today)
const getLastYearDates = () => {
    const dates: { date: Date; dateStr: string; isFiller: boolean }[] = [];
    
    // Start with today's date, normalized to midnight
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    
    const cursorDate = new Date(today);
    
    // We want 52 weeks of squares, so 7 * 52 = 364 days.
    // The loop iterates 364 times, creating 364 dates, with the newest date added last.
    for (let i = 0; i < 364; i++) {
        const dateStr = cursorDate.toISOString().split('T')[0];
        
        // Add to the front so the array goes [Oldest...Today]
        dates.unshift({ date: new Date(cursorDate), dateStr, isFiller: false });
        
        // Move to the previous day
        cursorDate.setDate(cursorDate.getDate() - 1);
    }
    
    return dates;
};

type StreakCalendarProps = {
    // Correctly defined as a Map for count/shading feature
    loggedDates: Map<string, number>; 
    currentStreak: number;
    longestStreak: number;
    loading: boolean;
    setToastMessage: (message: string) => void; 
}

const StreakCalendar = ({ loggedDates, currentStreak, longestStreak, loading, setToastMessage }: StreakCalendarProps) => { 
    // Memoize the dates array to prevent recalculation on every render
    const calendarDates = useMemo(getLastYearDates, []);
    const todayStr = new Date().toISOString().split('T')[0];
    
    // Display only 5 labels for better visibility: S, M, T, W, T, F, S
    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

    // --- SHARE STREAK HANDLER ---
    const handleShareStreak = async () => {
        // Updated language: 'turn clinical questions into CPD' -> 'capture clinical learning'
        const shareText = `🔥 ${currentStreak}-day streak! I'm using Umbil to capture clinical learning. You should check it out: https://umbil.co.uk`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: "My Umbil Streak!",
                    text: shareText,
                });
            } catch (err) {
                console.log("Share API error or cancelled:", err);
            }
        } else {
            // Fallback for desktop: Copy to clipboard
            navigator.clipboard.writeText(shareText)
                .then(() => {
                    setToastMessage("Streak details copied to clipboard!");
                })
                .catch(err => {
                    console.error("Failed to copy text: ", err);
                    setToastMessage("❌ Failed to copy text.");
                });
        }
    };
    // --- END OF NEW HANDLER ---

    if (loading) {
        return <p>Loading learning history...</p>;
    }
    
    // Helper to determine the shading level (1-4)
    const getShadeLevel = (count: number) => {
        if (count === 0) return 0;
        // Simple fixed tiers for visual density: 1, 2-3, 4-5, 6+
        if (count >= 6) return 4;
        if (count >= 4) return 3;
        if (count >= 2) return 2;
        return 1; // 1 log = level 1
    }

    return (
        <div className="card" style={{ marginTop: 24, padding: 20 }}>
            <h3 style={{ marginBottom: 16 }}>Learning History</h3>

            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: '12px', marginBottom: 16, fontSize: '1rem' }}>
                {/* Left side: Streak info */}
                <div>
                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                        Current Streak: <span style={{ color: 'var(--umbil-brand-teal)' }}>{currentStreak} {currentStreak === 1 ? 'day' : 'days'} 🔥</span>
                    </div>
                    <div style={{ color: 'var(--umbil-muted)', fontSize: '0.9rem' }}>
                        Longest Streak: {longestStreak} days
                    </div>
                </div>
                
                {/* Right side: Share button (only if streak > 0) */}
                {currentStreak > 0 && (
                    <button className="btn btn--outline" onClick={handleShareStreak} style={{ padding: '8px 12px', fontSize: '0.9rem' }}>
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginRight: '6px'}}><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"></path><polyline points="16 6 12 2 8 6"></polyline><line x1="12" y1="2" x2="12" y2="15"></line></svg>
                        Share Streak
                    </button>
                )}
            </div>
            
            <div className="calendar-grid-container">
                {/* Day Labels Column - Positioned alongside the grid */}
                <div className="day-labels-column">
                    {dayLabels.map((label, index) => (
                        <div key={index} className="day-label-item">
                            {/* Only display M, W, F for less clutter */}
                            {(label === 'M' || label === 'W' || label === 'F') ? label : ''}
                        </div>
                    ))}
                </div>

                {/* Main Grid - Starts from Oldest (left) to Today (right) */}
                <div className="calendar-grid">
                    {calendarDates.map(({ date: dateObj, dateStr }, index) => {
                        // Use the Map to get the count for shading/tooltip
                        const count = loggedDates.get(dateStr) || 0;
                        const isToday = dateStr === todayStr;
                        const dayOfWeek = dateObj.getDay(); 
                        const level = getShadeLevel(count);

                        return (
                            <div
                                key={index}
                                // NEW CLASS: Use level for shading
                                className={`calendar-square level-${level} ${isToday ? 'is-today' : ''}`} 
                                // RESTORED TOOLTIP: Show log count
                                title={`${dateStr}: ${count} ${count === 1 ? 'log' : 'logs'}`}
                                // Set grid-row explicitly for perfect alignment (0=Sunday is row 1)
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

// --- END NEW COMPONENT: Streak Calendar ---


export default function ProfilePage() {
  const { email, loading: userLoading } = useUserEmail();
  const router = useRouter();

  const [profile, setProfile] = useState<Partial<Profile>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Assume a new user if no profile data is loaded initially
  const [isNewUser, setIsNewUser] = useState(true);
  
  // Fetch streak data 
  const { dates: loggedDates, currentStreak, longestStreak, loading: streaksLoading } = useCpdStreaks();
  
  // --- ADD TOAST STATE ---
  const [toastMessage, setToastMessage] = useState<string | null>(null);


  // Redirect unauthenticated users to the sign-in page
  useEffect(() => {
    if (!userLoading && !email) {
      router.push("/auth");
    }
  }, [userLoading, email, router]);

  // Load the user's existing profile data from the database
  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      const userProfile = await getMyProfile();
      if (userProfile) {
        setProfile(userProfile);
        setIsNewUser(false); // User exists if a profile was returned
      }
      setLoading(false);
    };
    if (email) loadProfile();
  }, [email]);

  /**
   * Handles saving the updated profile data to the database (upsert operation).
   */
  const handleSave = async () => {
    setLoading(true);
    setError(null);
    try {
      await upsertMyProfile(profile);
      setLoading(false);
      // Navigate back to the home screen on successful save
      router.push("/");
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
        
        <div className="card" style={{ marginTop: 24 }}> {/* Adjusted margin-top */}
          <div className="card__body">
            {/* --- RENAMED: Section Title --- */}
            <h3>Your Clinical Details</h3>
            <div className="form-group" style={{marginTop: 16}}>
              <label className="form-label">Full Name</label>
              <input
                className="form-control"
                type="text"
                value={profile.full_name || ""}
                onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                placeholder="Dr. Mickey Mouse" // The updated placeholder text
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
            
            {/* --- REMOVED: Professional Body Number Field --- */}
            
            {error && <p style={{ color: 'red' }}>{error}</p>}
            <button className="btn btn--primary" onClick={handleSave} disabled={loading}>
              {loading ? "Saving..." : "Save Profile"}
            </button>
          </div>
        </div>
        
        {/* Added the new password reset component */}
        <ResetPassword /> 

      </div>
      
      {/* --- ADD TOAST COMPONENT TO RENDER --- */}
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </section>
  );
}