// src/components/MainWrapper.tsx
"use client";

import { useUserEmail } from "@/hooks/useUser";
import HomeContent from "@/components/HomeContent";
import { useEffect, useState, ReactNode } from "react";
import { useRouter } from "next/navigation";

// Interface allows wrapping other pages (like Capture Learning)
interface MainWrapperProps {
  children?: ReactNode;
}

export default function MainWrapper({ children }: MainWrapperProps) {
  const { email, loading } = useUserEmail();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      // Logic Update: Allow access regardless of auth status to support Guest Mode
      setIsAuthenticated(true);
    }
  }, [loading, email, router]);

  // Show loading spinner while checking auth
  if (loading || !isAuthenticated) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100dvh',
        background: 'var(--umbil-bg)',
        color: 'var(--umbil-brand-teal)',
        fontWeight: 600
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
           <div className="loading-pulse">Umbil</div>
        </div>
        <style jsx>{`
          @keyframes pulse { 0% { opacity: 0.5; } 50% { opacity: 1; } 100% { opacity: 0.5; } }
          .loading-pulse { animation: pulse 1.5s infinite; font-size: 1.5rem; letter-spacing: -0.02em; }
        `}</style>
      </div>
    );
  }

  // If children are provided (e.g. Capture Page), render them.
  // Otherwise, default to HomeContent (Home Page).
  return <>{children || <HomeContent />}</>;
}