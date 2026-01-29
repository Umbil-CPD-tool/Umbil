// src/components/MobileNav.tsx
"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase"; 
import { useUserEmail } from "@/hooks/useUser";
import { getMyProfile, Profile } from "@/lib/profile";
import { useEffect, useState } from "react";
import { useCpdStreaks } from "@/hooks/useCpdStreaks"; 
import { getChatHistory, ChatConversation } from "@/lib/store";
import Toast from "@/components/Toast";

type MobileNavProps = {
  isOpen: boolean;
  onClose: () => void;
  userEmail: string | null;
};

export default function MobileNav({ isOpen, onClose, userEmail }: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  
  const { email } = useUserEmail();
  const [profile, setProfile] = useState<Partial<Profile> | null>(null);
  const [history, setHistory] = useState<ChatConversation[]>([]); 
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);
  const [windowWidth, setWindowWidth] = useState(0); 
  
  const { currentStreak, loading: streaksLoading, hasLoggedToday } = useCpdStreaks();

  useEffect(() => {
    setWindowWidth(window.innerWidth);
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    const loadData = async () => {
      if (email) {
        const [userProfile, historyData] = await Promise.all([getMyProfile(), getChatHistory()]);
        setProfile(userProfile);
        setHistory(historyData);
      } else {
        setProfile(null);
        setHistory([]);
      }
    };
    if (isOpen) loadData();
  }, [email, isOpen]);

  const handleNewChat = () => { 
    onClose(); 
    router.push(`/dashboard?new-chat=${Date.now()}`); 
  };

  const handleStartTour = () => { 
    onClose(); 
    router.push(`/dashboard?tour=true&forceTour=true&new-chat=${Date.now()}`); 
  };

  const handleHistoryClick = (id: string) => {
      onClose();
      router.push(`/dashboard?c=${id}`);
  };

  const handleSignOut = async () => { 
    await supabase.auth.signOut(); 
    onClose(); 
    router.push("/"); 
  };

  const handleInvite = async () => {
    const shareData = { title: "Join me on Umbil", text: "I'm using Umbil to simplify my clinical learning and CPD. Check it out:", url: "https://umbil.co.uk" };
    if (navigator.share) { try { await navigator.share(shareData); } catch (err) { console.log(err); } }
    else { navigator.clipboard.writeText(`${shareData.text} ${shareData.url}`).then(() => setToastMessage("Invite link copied!")); }
  };

  const coreLinks = [
    { href: "/cpd", label: "Learning Log" },
    { href: "/pdp", label: "My PDP" },
    { href: "/psq", label: "My PSQ" },
    { href: "/profile", label: "My Profile" },
  ];

  const historyLimit = windowWidth < 768 ? 5 : 10;
  const visibleHistory = isHistoryExpanded ? history : history.slice(0, historyLimit);
  const hiddenCount = Math.max(0, history.length - historyLimit);

  return (
    <>
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}
      
      <div id="tour-highlight-sidebar" className={`sidebar ${isOpen ? "is-open" : ""}`} onClick={(e) => e.stopPropagation()}>
        
        <div className="sidebar-header">
          <h3 className="text-lg font-semibold">Menu</h3>
          <button onClick={onClose} className="menu-button">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>

        <div className="sidebar-scroll-area">
            <button className="new-chat-button" onClick={handleNewChat}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 5v14M5 12h14"></path></svg> New Chat
            </button>

            {userEmail && !streaksLoading && currentStreak > 0 && (
                <Link href="/profile" className={`streak-display-sidebar ${!hasLoggedToday ? 'faded-streak' : ''}`} onClick={onClose}>
                    <span style={{fontWeight: 700}}>🔥 Learning streak: {currentStreak} {currentStreak === 1 ? 'day' : 'days'}</span>
                </Link>
            )}

            <nav className="nav-group">
                {coreLinks.map((item) => (
                    <Link key={item.href} href={item.href} className={`nav-item ${pathname === item.href ? "active" : ""}`} onClick={onClose}>
                        {item.label}
                    </Link>
                ))}
            </nav>

            {userEmail && history.length > 0 && (
                <div className="history-section">
                    <div className="section-label">Recent Chats</div>
                    <div className="history-list">
                        {visibleHistory.map((item) => (
                            <button key={item.conversation_id} onClick={() => handleHistoryClick(item.conversation_id)} className="history-item">
                                <span className="history-text">{item.first_question}</span>
                            </button>
                        ))}
                        {history.length > historyLimit && (
                             <button onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} className="history-toggle-btn">
                                {isHistoryExpanded ? (
                                    <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="18 15 12 9 6 15"></polyline></svg> Show less</>
                                ) : (
                                    <><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg> Show {hiddenCount} more</>
                                )}
                             </button>
                        )}
                    </div>
                </div>
            )}
        </div>

        <div className="sidebar-footer">
            <Link href="/pro" className="pro-link" onClick={onClose}>
               <span>Umbil Pro ✨</span>
            </Link>

            <div className="social-links-row">
                <span className="social-label">Follow us</span>
                <div className="social-icons">
                    <a href="https://www.instagram.com/umbil_ai/" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Follow on Instagram">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
                    </a>
                    <a href="https://www.facebook.com/profile.php?id=61565964025530&locale=be_BY" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Follow on Facebook">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M9.101 23.691v-7.98H6.627v-3.667h2.474v-1.58c0-4.085 1.848-5.978 5.858-5.978.401 0 .955.042 1.468.103a8.68 8.68 0 0 1 1.141.195v3.325a8.623 8.623 0 0 0-.653-.036c-2.148 0-2.797 1.651-2.797 4.16v1.812h3.309l-1.337 3.667h-1.972v7.98H9.101Z"/></svg>
                    </a>
                    <a href="https://uk.linkedin.com/company/umbil" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Follow on LinkedIn">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M20.5 2h-17A1.5 1.5 0 002 3.5v17A1.5 1.5 0 003.5 22h17a1.5 1.5 0 001.5-1.5v-17A1.5 1.5 0 0020.5 2zM8 19H5v-9h3zM6.5 8.25A1.75 1.75 0 118.3 6.5a1.78 1.78 0 01-1.8 1.75zM19 19h-3v-4.74c0-1.42-.6-1.93-1.38-1.93A1.74 1.74 0 0013 14.19V19h-3v-9h2.9v1.3a3.11 3.11 0 012.7-1.4c1.55 0 3.36.86 3.36 3.66z"/></svg>
                    </a>
                    <a href="https://www.tiktok.com/@umbil_ai" target="_blank" rel="noopener noreferrer" className="social-icon-link" aria-label="Follow on TikTok">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" xmlns="http://www.w3.org/2000/svg"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-5.2 1.74 2.89 2.89 0 0 1 2.31-4.64 2.93 2.93 0 0 1 .88.13V9.4a6.84 6.84 0 0 0-1-.05A6.33 6.33 0 0 0 5 20.1a6.34 6.34 0 0 0 10.86-4.43v-7a8.16 8.16 0 0 0 4.77 1.52v-3.4a4.85 4.85 0 0 1-1-.1z"/></svg>
                    </a>
                </div>
            </div>

            <div className="footer-grid">
                <button onClick={() => { handleInvite(); onClose(); }} className="footer-btn">Invite</button>
                <button onClick={(e) => { e.preventDefault(); handleStartTour(); }} className="footer-btn">Quick Tour</button>
                <Link href="/settings" className="footer-btn" onClick={onClose}>Settings</Link>
                <Link href="/settings/feedback" className="footer-btn" onClick={onClose}>Feedback</Link>
            </div>

            {userEmail && (
                <div className="profile-section">
                    <div className="profile-info">
                        <div className="user-name">{profile?.full_name || email}</div>
                        {profile?.grade && <div className="user-role">{profile.grade}</div>}
                    </div>
                    <button className="sign-out-btn" onClick={handleSignOut}>Sign Out</button>
                </div>
            )}
        </div>

      </div>
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      
      <style jsx global>{`
        /* ... existing styles ... */
        .sidebar { display: flex; flex-direction: column; overflow: hidden; }
        .sidebar-header { flex-shrink: 0; padding-bottom: 0; margin-bottom: 16px; }
        .sidebar-scroll-area { flex-grow: 1; overflow-y: auto; padding-bottom: 12px; -ms-overflow-style: none; scrollbar-width: none; }
        .sidebar-scroll-area::-webkit-scrollbar { display: none; }
        .new-chat-button { margin-bottom: 12px !important; }
        .nav-group { display: flex; flex-direction: column; gap: 2px; margin-bottom: 16px; }
        .nav-item { display: block; padding: 8px 16px; font-size: 1rem; font-weight: 500; color: var(--umbil-text); border-radius: var(--umbil-radius-sm); transition: background-color 0.2s; }
        .nav-item:hover, .nav-item.active { background-color: var(--umbil-hover-bg); color: var(--umbil-brand-teal); }
        .streak-display-sidebar { padding: 10px 16px; font-size: 1rem; color: var(--umbil-brand-teal); background-color: var(--umbil-hover-bg); border-radius: var(--umbil-radius-sm); margin: 0 0 12px 0; text-align: center; transition: opacity 0.3s, background-color 0.2s; display: block; text-decoration: none; cursor: pointer; border: 1px solid var(--umbil-card-border); }
        .streak-display-sidebar:hover { background-color: var(--umbil-divider); }
        .streak-display-sidebar.faded-streak { opacity: 0.6; }
        .history-section { margin-top: 0px; padding-top: 12px; border-top: 1px solid var(--umbil-divider); }
        .section-label { font-size: 0.75rem; fontWeight: 700; color: var(--umbil-muted); text-transform: uppercase; letter-spacing: 0.05em; margin-bottom: 6px; padding-left: 12px; }
        .history-list { display: flex; flex-direction: column; gap: 2px; }
        .history-item { text-align: left; background: none; border: none; padding: 8px 12px; font-size: 0.9rem; color: var(--umbil-text); cursor: pointer; width: 100%; transition: background-color 0.2s; border-radius: 6px; overflow: hidden; }
        .history-item:hover { background-color: var(--umbil-hover-bg); }
        .history-text { display: block; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .history-toggle-btn { display: flex; align-items: center; gap: 6px; padding: 8px 12px; font-size: 0.85rem; color: var(--umbil-muted); background: none; border: none; cursor: pointer; width: 100%; text-align: left; transition: color 0.2s, background-color 0.2s; border-radius: 6px; }
        .history-toggle-btn:hover { color: var(--umbil-text); background-color: var(--umbil-hover-bg); }
        .sidebar-footer { flex-shrink: 0; border-top: 1px solid var(--umbil-divider); padding-top: 16px; background-color: var(--umbil-surface); display: flex; flex-direction: column; gap: 12px; }
        .pro-link { display: block; color: var(--umbil-brand-teal) !important; font-weight: 600; background-color: rgba(31, 184, 205, 0.1); padding: 10px; border-radius: var(--umbil-radius-sm); text-align: center; text-decoration: none; transition: background-color 0.2s; }
        .pro-link:hover { background-color: rgba(31, 184, 205, 0.2); }
        .social-links-row { display: flex; justify-content: space-between; align-items: center; padding: 0 4px; margin-bottom: 4px; }
        .social-label { font-size: 0.8rem; color: var(--umbil-muted); font-weight: 500; }
        .social-icons { display: flex; gap: 8px; }
        .social-icon-link { display: flex; align-items: center; justify-content: center; width: 32px; height: 32px; border-radius: 50%; background-color: var(--umbil-hover-bg); color: var(--umbil-muted); transition: all 0.2s; }
        .social-icon-link:hover { background-color: var(--umbil-divider); color: var(--umbil-text); }
        .footer-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
        .footer-btn { display: flex; align-items: center; justify-content: center; padding: 10px; border: 1px solid var(--umbil-brand-teal); border-radius: var(--umbil-radius-sm); color: var(--umbil-brand-teal); background-color: transparent; font-weight: 600; font-size: 0.9rem; text-align: center; cursor: pointer; transition: all 0.2s ease-in-out; text-decoration: none; }
        .footer-btn:hover { background-color: var(--umbil-brand-teal); color: var(--umbil-surface); }
        .profile-section { display: flex; justify-content: space-between; align-items: center; padding: 8px 4px; border-top: 1px solid var(--umbil-divider); margin-top: 4px; min-width: 0; }
        .profile-info { display: flex; flex-direction: column; flex: 1; min-width: 0; margin-right: 8px; }
        .user-name { font-weight: 600; font-size: 0.95rem; color: var(--umbil-text); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .user-role { font-size: 0.75rem; color: var(--umbil-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sign-out-btn { flex-shrink: 0; background: none; border: 1px solid var(--umbil-divider); color: #ef4444; padding: 6px 12px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; cursor: pointer; transition: background-color 0.2s; }
        .sign-out-btn:hover { background-color: #fef2f2; color: #dc2626; border-color: #fca5a5; }
      `}</style>
    </>
  );
}