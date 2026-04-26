// src/components/HomeContent.tsx
"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import dynamic from 'next/dynamic'; 
import Toast from "@/components/Toast";
import { addCPD, CPDEntry, getConversationMessages, getDeviceId, saveDraft, getDraft, clearDraft } from "@/lib/store"; 
import { useUserEmail } from "@/hooks/useUser";
import { useSearchParams, useRouter } from "next/navigation";
import { getMyProfile, Profile } from "@/lib/profile";
import { supabase } from "@/lib/supabase";
import { useCpdStreaks } from "@/hooks/useCpdStreaks";
import { v4 as uuidv4 } from 'uuid'; 
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { ToolId } from "@/components/ToolsModal"; 

// --- Extracted Component Imports ---
import { TourWelcomeModal, GuestLimitModal } from "@/components/home/HomeModals";
import { SearchInputArea, AnswerStyle } from "@/components/home/SearchInputArea";
import { HomeHero } from "@/components/home/HomeHero";
import { MessageBubble, ConversationEntry } from "@/components/home/MessageBubble";
import { performSmartCopy, performShare } from "@/components/home/chatUtils";

// --- Dynamic Imports ---
const ReflectionModal = dynamic(() => import('@/components/ReflectionModal'));
const QuickTour = dynamic(() => import('@/components/QuickTour'));
const ToolsModal = dynamic(() => import('@/components/ToolsModal'));
const StreakPopup = dynamic(() => import('@/components/StreakPopup'));
const ReportModal = dynamic(() => import('@/components/ReportModal')); 
const ProUpgradeModal = dynamic(() => import('@/components/ProUpgradeModal')); 

// --- Types & Constants ---
type AskResponse = { answer?: string; error?: string; };
type ClientMessage = { role: "user" | "assistant"; content: string; };

const loadingMessages = ["Umbil is thinking...", "Consulting the guidelines...", "Synthesizing clinical data...", "Checking local formularies...", "Almost there...", "Crafting your response..."];

const DUMMY_TOUR_CONVERSATION: ConversationEntry[] = [
  { type: "user", content: "What are the red flags for a headache?", question: "What are the red flags for a headache?" },
  { type: "umbil", content: "Key red flags for headache include:\n\n* **S**ystemic symptoms (fever, weight loss)\n* **N**eurological deficits\n* **O**nset (sudden, thunderclap)\n* **O**nset age (new onset >50 years)\n* **P**attern change or positional", question: "What are the red flags for a headache?" }
];
const DUMMY_CPD_ENTRY = { question: "What are the red flags for a headache?", answer: "Key red flags for headache include:\n\n* **S**ystemic symptoms (fever, weight loss)\n* **N**eurological deficits\n* **O**nset (sudden, thunderclap)\n* **O**nset age (new onset >50 years)\n* **P**attern change or positional" };

const GUEST_LIMIT = 7;
const DASHBOARD_DRAFT_ID = 'dashboard_chat'; 

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  return "An unexpected error occurred.";
};

type HomeContentProps = { forceStartTour?: boolean; };

export default function HomeContent({ forceStartTour }: HomeContentProps) {
  const [q, setQ] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [loadingMsg, setLoadingMsg] = useState(loadingMessages[0]);
  const [conversation, setConversation] = useState<ConversationEntry[]>([]);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isToolsOpen, setIsToolsOpen] = useState(false); 
  const [selectedTool, setSelectedTool] = useState<ToolId>('referral');
  
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportEntry, setReportEntry] = useState<{ question: string; answer: string } | null>(null);

  const [isProModalOpen, setIsProModalOpen] = useState(false);
  const [proModalFeature, setProModalFeature] = useState<string | undefined>(undefined);
  
  const [currentCpdEntry, setCurrentCpdEntry] = useState<{ question: string; answer: string; } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const { email, loading: userLoading } = useUserEmail();
  const searchParams = useSearchParams();
  const router = useRouter(); 
  const [profile, setProfile] = useState<Profile | null>(null);
  
  const { currentStreak, loading: streakLoading, hasLoggedToday, refetch: refetchStreaks } = useCpdStreaks();
  
  const [answerStyle, setAnswerStyle] = useState<AnswerStyle>("standard");
  const [conversationId, setConversationId] = useState<string | null>(null);

  const [showWelcomeModal, setShowWelcomeModal] = useState(false);
  const [showGuestLimitModal, setShowGuestLimitModal] = useState(false); 
  const [isTourOpen, setIsTourOpen] = useState(false);
  const [tourStep, setTourStep] = useState(0); 

  const [isStreakPopupOpen, setIsStreakPopupOpen] = useState(false);
  const [streakToDisplay, setStreakToDisplay] = useState(0);
  const [lastLoggedCount, setLastLoggedCount] = useState(0);

  const { isRecording, toggleRecording } = useSpeechRecognition({
    onTranscript: (text) => setQ((prev) => (prev ? prev + " " + text : text)),
    onError: (msg) => setToastMessage(msg),
  });

  // --- Effects ---
  useEffect(() => {
    const loadDraft = async () => {
      if (searchParams.get("new-chat") || searchParams.get("tour")) return;
      const savedDraft = await getDraft(DASHBOARD_DRAFT_ID);
      if (savedDraft) setQ(savedDraft);
    };
    loadDraft();
  }, [searchParams]);

  useEffect(() => {
    if (isTourOpen || loading) return;
    const timer = setTimeout(() => saveDraft(DASHBOARD_DRAFT_ID, q), 1000);
    return () => clearTimeout(timer);
  }, [q, isTourOpen, loading]);

  useEffect(() => { if (email) getMyProfile().then(setProfile); }, [email]);

  useEffect(() => {
    const isCpdSaved = searchParams.get("cpdSaved") === "true";
    if (isCpdSaved) {
       refetchStreaks();
       setToastMessage("✅ Learning entry saved!");
       const currentUrl = new URL(window.location.href);
       currentUrl.searchParams.delete("cpdSaved");
       router.replace(currentUrl.pathname + currentUrl.search, { scroll: false });
       
       const currentTotalUserQuestions = conversation.filter(c => c.type === 'user').length;
       setLastLoggedCount(currentTotalUserQuestions);
    }
  }, [searchParams, router, conversation, refetchStreaks]);

  useEffect(() => {
    if (userLoading) return;
    if (forceStartTour) { setIsTourOpen(true); setTourStep(0); setConversation([]); return; }

    const isNewChat = searchParams.get("new-chat");
    const isTour = searchParams.get("tour") === "true";
    const isForceTour = searchParams.get("forceTour") === "true";

    if (isNewChat) {
      setConversation([]); setQ(""); clearDraft(DASHBOARD_DRAFT_ID);
      setConversationId(null); setLastLoggedCount(0);
      if (isTour && isForceTour) { setIsTourOpen(true); setTourStep(0); }
      router.replace("/dashboard", { scroll: false });
      return;
    }

    const cid = searchParams.get("c"); 
    if (cid && cid !== conversationId) {
        setConversationId(cid); setLoading(true);
        getConversationMessages(cid).then(items => {
            if (items && items.length > 0) {
                const reconstructed: ConversationEntry[] = [];
                items.forEach(item => {
                    reconstructed.push({ type: "user", content: item.question, question: item.question });
                    if(item.answer) reconstructed.push({ type: "umbil", content: item.answer, question: item.question });
                });
                setConversation(reconstructed);
            } else setConversation([]);
            setLoading(false);
        });
    } else if (!cid && !conversationId && !isTour) { setConversation([]); }

    const checkTour = () => {
      const justLoggedIn = sessionStorage.getItem("justLoggedIn") === "true";
      const hasCompletedTour = localStorage.getItem("hasCompletedQuickTour") === "true";
      if (isTour && isForceTour) { setIsTourOpen(true); setTourStep(0); } 
      else if (justLoggedIn && !hasCompletedTour) { setShowWelcomeModal(true); }
      if (justLoggedIn) sessionStorage.removeItem("justLoggedIn");
    };
    checkTour();
  }, [searchParams, email, router, userLoading, conversationId, forceStartTour]);

  const scrollToBottom = (instant = false) => {
    const container = scrollContainerRef.current;
    if (container) {
      const isNearBottom = container.scrollHeight - container.scrollTop < container.clientHeight + 300;
      if (isNearBottom || instant) messagesEndRef.current?.scrollIntoView({ behavior: instant ? "auto" : "smooth" });
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined' && window.visualViewport) {
      const handleResize = () => scrollToBottom(true);
      window.visualViewport.addEventListener('resize', handleResize);
      return () => window.visualViewport?.removeEventListener('resize', handleResize);
    }
  }, [conversation.length]);

  useEffect(() => {
    const timeoutId = setTimeout(() => scrollToBottom(), 50);
    return () => clearTimeout(timeoutId);
  }, [conversation.length]);

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        setLoadingMsg((prevMsg) => loadingMessages[(loadingMessages.indexOf(prevMsg) + 1) % loadingMessages.length]);
      }, 2000);
      return () => clearInterval(interval);
    } else setLoadingMsg(loadingMessages[0]);
  }, [loading]);

  // --- Handlers ---
  const handleTourStepChange = useCallback((stepIndex: number) => {
    setTourStep(stepIndex); 
    if (stepIndex === 5) { setCurrentCpdEntry(DUMMY_CPD_ENTRY); setIsModalOpen(true); } 
    else if (isModalOpen) setIsModalOpen(false);
    if (stepIndex === 7) document.getElementById("tour-highlight-sidebar-button")?.click();
  }, [isModalOpen]); 

  const handleTourClose = useCallback(() => {
    setIsTourOpen(false); setTourStep(0); setIsModalOpen(false); setCurrentCpdEntry(null);
    localStorage.setItem("hasCompletedQuickTour", "true");
    const sidebar = document.querySelector('.sidebar.is-open');
    if (sidebar) (sidebar.querySelector('.sidebar-header button') as HTMLElement)?.click();
    if (email && profile && !profile.full_name) setTimeout(() => router.push('/profile'), 300);
  }, [email, profile, router]);

  const fetchUmbilResponse = async (currentConversation: ConversationEntry[], styleOverride: AnswerStyle | null = null, activeConversationId: string | null) => {
    setLoading(true);
    const lastUserQuestion = [...currentConversation].reverse().find((e) => e.type === "user")?.question;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;
      const messagesToSend: ClientMessage[] = currentConversation.map((entry) => ({ role: entry.type === "user" ? "user" : "assistant", content: entry.content }));
      
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }), "x-device-id": getDeviceId() },
        body: JSON.stringify({ messages: messagesToSend, profile, answerStyle: styleOverride || answerStyle, conversationId: activeConversationId, saveToHistory: true }),
      });

      if (!res.ok) { 
        const data: AskResponse = await res.json(); 
        if (res.status === 403 || data.error === "LIMIT_REACHED") {
            setProModalFeature("Deep Dive Mode"); setIsProModalOpen(true);
            setQ(lastUserQuestion || ""); setConversation((prev) => prev.slice(0, -1)); setLoading(false); return;
        }
        throw new Error(data.error || "Request failed"); 
      }

      const contentType = res.headers.get("Content-Type");
      if (contentType?.includes("application/json")) {
        const data: AskResponse = await res.json();
        setConversation((prev) => [...prev, { type: "umbil", content: data.answer ?? "", question: lastUserQuestion }]);
      } else if (contentType?.includes("text/plain")) {
        if (!res.body) throw new Error("Response body is empty.");
        setConversation((prev) => [...prev, { type: "umbil", content: "", question: lastUserQuestion }]);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        while (true) {
          const { done, value } = await reader.read();
          if (done) break; 
          const chunk = decoder.decode(value, { stream: true });
          setConversation((prev) => {
            const newConversation = [...prev];
            const lastMessage = newConversation[newConversation.length - 1];
            if (lastMessage && lastMessage.type === "umbil") lastMessage.content += chunk;
            return newConversation;
          });
        }
      }
    } catch (err: unknown) {
      setConversation((prev) => {
          const lastMsg = prev[prev.length - 1];
          if (lastMsg && lastMsg.type === "umbil" && lastMsg.question === lastUserQuestion) {
              return [...prev.slice(0, -1), { ...lastMsg, content: lastMsg.content + "\n\n> *⚠️ Network connection interrupted.*" }];
          }
          return [...prev, { type: "umbil", content: `⚠️ ${getErrorMessage(err)}` }];
      });
    } finally { setLoading(false); }
  };

  const ask = async () => {
    if (!q.trim() || loading || isTourOpen) return;
    if (!email) {
        const nextUsage = parseInt(localStorage.getItem('umbil_guest_usage') || '0') + 1;
        localStorage.setItem('umbil_guest_usage', nextUsage.toString());
        if (nextUsage > 0 && nextUsage % GUEST_LIMIT === 0) setShowGuestLimitModal(true);
    }
    let currentCid = conversationId;
    if (!currentCid) { 
        currentCid = uuidv4(); setConversationId(currentCid); 
        router.replace(`/dashboard?c=${currentCid}`, { scroll: false }); 
    }
    const newQuestion = q; setQ(""); clearDraft(DASHBOARD_DRAFT_ID);
    const updatedConversation: ConversationEntry[] = [...conversation, { type: "user", content: newQuestion, question: newQuestion }];
    setConversation(updatedConversation); scrollToBottom(true);
    await fetchUmbilResponse(updatedConversation, null, currentCid); 
  };

  const convoToShow = isTourOpen && tourStep >= 3 ? DUMMY_TOUR_CONVERSATION : conversation;

  const handleOpenAddCpdModal = (entry: ConversationEntry) => {
    if (isTourOpen) { setCurrentCpdEntry(DUMMY_CPD_ENTRY); setIsModalOpen(true); return; }
    if (!email) { setToastMessage("Please sign in to add learning entries."); return; }
    if (typeof window !== 'undefined') {
        sessionStorage.setItem('umbil_cpd_context', JSON.stringify({ question: entry.question || "", answer: entry.content, conversationId }));
    }
    router.push('/capture-learning');
  };

  const handleSaveCpd = async (reflection: string, tags: string[], duration: number) => {
    if (isTourOpen) { handleTourStepChange(6); return; }
    if (!currentCpdEntry) return;
    const isFirstLogToday = !hasLoggedToday;
    const cpdEntry: Omit<CPDEntry, 'id' | 'user_id'> = { timestamp: new Date().toISOString(), question: currentCpdEntry.question, answer: currentCpdEntry.answer, reflection, tags, duration };
    const { error } = await addCPD(cpdEntry);
    
    if (error) { 
        if (error.message === "LIMIT_REACHED" || (error as any)?.details === "LIMIT_REACHED") { setProModalFeature("Capture Learning"); setIsProModalOpen(true); } 
        else { setToastMessage("❌ Failed to save learning entry."); }
    } else { 
        if (isFirstLogToday) { setStreakToDisplay(currentStreak + 1); setIsStreakPopupOpen(true); } 
        else { setToastMessage("✅ Learning entry saved!"); } 
        refetchStreaks(); 
        setLastLoggedCount(conversation.filter(c => c.type === 'user').length);
    }
    setIsModalOpen(false); setCurrentCpdEntry(null);
  };

  const submitReport = async (reason: string) => {
    if (!reportEntry) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(session?.access_token && { Authorization: `Bearer ${session.access_token}` }) },
        body: JSON.stringify({ ...reportEntry, reason }),
      });
      setToastMessage("✅ Report submitted.");
      setIsReportModalOpen(false);
    } catch { setToastMessage("❌ Failed to submit report."); }
  };

  const searchInputProps = {
    q, setQ, ask, loading, isTourOpen, isRecording, 
    handleMicClick: toggleRecording, answerStyle, setAnswerStyle, 
    onToolSelect: (id: ToolId) => { setSelectedTool(id); setIsToolsOpen(true); }, 
    handleTourStepChange
  };

  return (
    <>
      {isTourOpen && ( <QuickTour isOpen={isTourOpen} currentStep={tourStep} onClose={handleTourClose} onStepChange={handleTourStepChange} /> )}
      
      <div className="main-content" style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', height: '100%' }}>
        {(convoToShow.length > 0) ? (
          <>
            <div ref={scrollContainerRef} className="conversation-container" style={{ flexGrow: 1, overflowY: 'auto', padding: '20px', paddingBottom: '40px' }}>
              <div className="message-thread">
                {convoToShow.map((entry, index) => {
                   const userMsgCount = convoToShow.slice(0, index + 1).filter(m => m.type === 'user').length;
                   const showNudge = entry.type === "umbil" && (userMsgCount - lastLoggedCount) > 0 && (userMsgCount - lastLoggedCount) % 10 === 0 && !loading;
                   return (
                     <MessageBubble 
                       key={index} entry={entry} index={index} isTourOpen={isTourOpen} loading={loading}
                       isLastMessage={index === convoToShow.length - 1} showNudge={showNudge}
                       onShare={() => performShare(convoToShow, setToastMessage)}
                       onSmartCopy={(idx) => performSmartCopy(idx, setToastMessage)}
                       onDeepDive={(e, idx) => fetchUmbilResponse(conversation.slice(0, idx), 'deepDive', conversationId)}
                       onRegenerate={() => { setConversation(conversation.slice(0, -1)); fetchUmbilResponse(conversation.slice(0, -1), null, conversationId); }}
                       onLogCpd={handleOpenAddCpdModal}
                       onReport={(e) => { setReportEntry({ question: e.question!, answer: e.content }); setIsReportModalOpen(true); }}
                       onTourStepChange={handleTourStepChange}
                     />
                   );
                })}
                {loading && <div className="loading-indicator">{loadingMsg}<span>•</span><span>•</span><span>•</span></div>}
                <div ref={messagesEndRef} />
              </div>
            </div>
            <div className="sticky-input-wrapper" style={{ position: 'relative', flexShrink: 0, background: 'var(--umbil-bg)', borderTop: '1px solid var(--umbil-divider)', zIndex: 50, padding: '20px' }}>
              <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%' }}>
                <SearchInputArea {...searchInputProps} />
              </div>
            </div>
          </>
        ) : ( <HomeHero {...searchInputProps} /> )}
      </div>

      {showWelcomeModal && <TourWelcomeModal onStart={() => { setShowWelcomeModal(false); setIsTourOpen(true); setTourStep(0); }} onSkip={() => { setShowWelcomeModal(false); localStorage.setItem("hasCompletedQuickTour", "true"); }} />}
      {showGuestLimitModal && <GuestLimitModal isOpen={showGuestLimitModal} onClose={() => setShowGuestLimitModal(false)} onSignUp={() => router.push('/auth')} />}

      {(isModalOpen || (isTourOpen && tourStep === 5)) && (
        <ReflectionModal isOpen={isModalOpen} onClose={isTourOpen ? () => {} : () => setIsModalOpen(false)} onSave={handleSaveCpd} currentStreak={streakLoading ? 0 : currentStreak} cpdEntry={isTourOpen ? DUMMY_CPD_ENTRY : currentCpdEntry} tourId={isTourOpen && tourStep === 5 ? "tour-highlight-modal" : undefined} />
      )}
      
      <StreakPopup isOpen={isStreakPopupOpen} streakCount={streakToDisplay} onClose={() => setIsStreakPopupOpen(false)} />
      <ToolsModal isOpen={isToolsOpen} onClose={() => setIsToolsOpen(false)} initialTool={selectedTool} />
      <ReportModal isOpen={isReportModalOpen} onClose={() => setIsReportModalOpen(false)} entry={reportEntry} onSubmit={submitReport} />
      <ProUpgradeModal isOpen={isProModalOpen} onClose={() => setIsProModalOpen(false)} featureName={proModalFeature} />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
      
      <style jsx>{` @keyframes pulse-red { 0% { transform: scale(1); opacity: 1; } 50% { transform: scale(1.2); opacity: 0.7; } 100% { transform: scale(1); opacity: 1; } } .recording-pulse { animation: pulse-red 1.5s infinite; display: flex; align-items: center; justify-content: center; } `}</style>
    </>
  );
}