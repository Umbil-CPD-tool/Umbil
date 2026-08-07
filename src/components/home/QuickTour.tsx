// src/components/QuickTour.tsx
"use client";

import { useState, useLayoutEffect, useCallback, useRef } from "react";

const tourSteps = [
  { 
    id: "step-0", 
    title: "1. Ask Your Question", 
    text: "Start here. You can ask anything—clinical questions, drug dosages, or reflective prompts.", 
    highlightId: "tour-highlight-askbar" 
  },
  { 
    id: "step-1", 
    title: "2. Medical Tools", 
    text: "Find specialized tools here like the Referral Writer, Safety Netting generator, and SBAR handover tool to speed up your documentation.", 
    highlightId: "tour-highlight-tools-dropdown" 
  },
  { 
    id: "step-2", 
    title: "3. Choose Your Depth", 
    text: "Need a quick answer for the ward or a detailed explanation for study? Switch between 'Clinic', 'Standard', and 'Deep Dive' modes here.", 
    highlightId: "tour-highlight-style-dropdown" 
  },
  { 
    id: "step-3", 
    title: "4. Get Your Answer", 
    text: "Umbil provides a concise, evidence-based answer. Now, let's turn this knowledge into a permanent record.", 
    highlightId: "tour-highlight-message" 
  },
  { 
    id: "step-4", 
    title: "5. Log Learning", 
    text: "Click 'Log learning (CPD)' to save this interaction. This keeps your streak alive and builds your professional portfolio automatically.", 
    highlightId: "tour-highlight-cpd-button" 
  },
  { 
    id: "step-5", 
    title: "6. Reflect & Save (Multilingual)", 
    text: "Write your notes or let AI generate them. You can even write in your native language and click 'Translate' to convert it to English for your appraisal. Add tags and click 'Save' to finish.", 
    highlightId: "tour-highlight-modal" 
  },
  { 
    id: "step-6", 
    title: "7. Automated PDP Goals", 
    text: "Umbil works in the background. If you tag a topic (e.g., 'Asthma') 7 times, we'll automatically suggest a Personal Development Plan goal to help formalize your learning.", 
    highlightId: null 
  },
  { 
    id: "step-7", 
    title: "8. Explore Analytics", 
    text: "Open the menu to see your learning turn into visual charts. Track your GMC domain coverage, clinical topics, and maintain your streaks!", 
    highlightId: "tour-highlight-sidebar" 
  },
  { 
    id: "step-8", 
    title: "You're all set!", 
    text: "You can re-take this tour anytime from the menu. Happy learning!", 
    highlightId: null 
  },
];

type QuickTourProps = {
  isOpen: boolean;
  currentStep: number;
  onClose: () => void;
  onStepChange: (stepIndex: number) => void; 
};

export default function QuickTour({ 
  isOpen, 
  currentStep, 
  onClose, 
  onStepChange 
}: QuickTourProps) {
  
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [windowWidth, setWindowWidth] = useState(0);
  const [windowHeight, setWindowHeight] = useState(0);
  const tourBoxRef = useRef<HTMLDivElement>(null);

  const updatePosition = useCallback(() => {
    if (typeof window === 'undefined') return;

    setWindowWidth(window.innerWidth);
    setWindowHeight(window.innerHeight);

    const step = tourSteps[currentStep];
    
    // IF NO HIGHLIGHT ID (e.g. Last Step 8, or Step 6 PDP), 
    // explicitly set rect to null so we trigger the "Center Screen" fallback.
    if (!step?.highlightId) {
      setHighlightRect(null);
      return;
    }

    const element = document.getElementById(step.highlightId);
    if (element) {
      const rect = element.getBoundingClientRect();
      if (rect.width > 0 || rect.height > 0) {
        setHighlightRect(rect);
      }
    } else {
      setHighlightRect(null);
    }
  }, [currentStep]);

  useLayoutEffect(() => {
    if (!isOpen) return;
    updatePosition();
    const timer = setInterval(updatePosition, 300);
    window.addEventListener("resize", updatePosition);
    window.addEventListener("scroll", updatePosition, true);
    
    return () => {
      clearInterval(timer);
      window.removeEventListener("resize", updatePosition);
      window.removeEventListener("scroll", updatePosition, true);
    };
  }, [isOpen, updatePosition]);

  const handleNext = () => {
    const nextStep = currentStep + 1;
    if (nextStep < tourSteps.length) {
      onStepChange(nextStep); 
    } else {
      onClose();
    }
  };

  const handleBack = () => {
    const prevStep = currentStep - 1;
    if (prevStep >= 0) {
      onStepChange(prevStep);
    }
  };

  if (!isOpen) return null;

  const step = tourSteps[currentStep];
  const isMobile = windowWidth < 768; 
  
  // -- BASE STYLES --
  const boxStyle: React.CSSProperties = {
    position: 'fixed',
    zIndex: 1002, 
    width: isMobile ? '90%' : '320px',
    maxWidth: 'calc(100vw - 32px)', 
    maxHeight: '80vh', 
    overflowY: 'auto',
  };

  // -- POSITIONING CALCULATIONS --
  if (highlightRect) {
    if (isMobile) {
        // === MOBILE LOGIC ===
        // Center horizontally
        boxStyle.left = '50%';
        boxStyle.transform = 'translateX(-50%)';

        // Modal: Center
        if (step.highlightId === 'tour-highlight-modal') {
            boxStyle.top = '50%';
            boxStyle.bottom = 'auto';
            boxStyle.transform = 'translate(-50%, -50%)';
        } 
        // Sidebar: Put at bottom right away (safest)
        else if (step.highlightId === 'tour-highlight-sidebar') {
             boxStyle.bottom = '20px';
             boxStyle.top = 'auto';
        }
        // General: If element low -> Top. If element high -> Bottom.
        else if (highlightRect.top > windowHeight * 0.5) {
            boxStyle.top = '80px'; // Clear header
            boxStyle.bottom = 'auto';
        } else {
            boxStyle.bottom = '40px'; 
            boxStyle.top = 'auto';
        }

    } else {
        // === DESKTOP LOGIC ===
        
        // 1. Sidebar Special Case (Place to RIGHT)
        if (step.highlightId === 'tour-highlight-sidebar') {
            // Position to the right of the sidebar + margin
            let leftPos = highlightRect.right + 15;
            // Clamp so it doesn't go off screen
            if (leftPos + 320 > windowWidth) leftPos = windowWidth - 340;
            
            boxStyle.left = `${leftPos}px`;
            boxStyle.top = `${highlightRect.top + 20}px`; // Align near top of sidebar items
        } 
        // 2. Modal Special Case (Center)
        else if (step.highlightId === 'tour-highlight-modal') {
            boxStyle.top = '50%';
            boxStyle.left = '50%';
            boxStyle.transform = 'translate(-50%, -50%)';
        } 
        // 3. Standard Logic (Top/Bottom flip)
        else {
            let leftPos = highlightRect.left;
            // Clamp horizontal
            if (leftPos + 320 > windowWidth) leftPos = windowWidth - 340;
            if (leftPos < 20) leftPos = 20;
            
            boxStyle.left = `${leftPos}px`;

            // Vertical Flip
            const spaceBelow = windowHeight - highlightRect.bottom;
            if (spaceBelow < 250 && highlightRect.top > 250) {
                // Not enough space below, put ABOVE
                boxStyle.bottom = `${windowHeight - highlightRect.top + 15}px`;
                boxStyle.top = 'auto';
            } else {
                // Put BELOW
                boxStyle.top = `${highlightRect.bottom + 15}px`;
                boxStyle.bottom = 'auto';
            }
        }
    }
  } else {
    // === NO ELEMENT (Step 8, etc.) ===
    // Force absolute center. This fixes the "Gone on mobile" issue.
    boxStyle.top = '50%';
    boxStyle.left = '50%';
    boxStyle.transform = 'translate(-50%, -50%)';
  }

  return (
    <>
      <div className="tour-overlay" onClick={onClose}>
        {highlightRect && (
          <div
            className="tour-highlight-box"
            style={{
              top: `${highlightRect.top - 4}px`, 
              left: `${highlightRect.left - 4}px`,
              width: `${highlightRect.width + 8}px`,
              height: `${highlightRect.height + 8}px`,
              position: 'fixed', 
            }}
          ></div>
        )}
      </div>

      <div ref={tourBoxRef} className="tour-content-box" style={boxStyle}>
        <button onClick={onClose} className="tour-close-button">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        </button>
        
        <h4 className="tour-title">{step.title}</h4>
        <p className="tour-text">{step.text}</p>
        
        <div className="tour-footer">
          <span className="tour-step-counter">
            {currentStep + 1} / {tourSteps.length}
          </span>
          <div className="tour-buttons">
            {currentStep > 0 && (
              <button className="tour-button-back" onClick={handleBack}>
                Back
              </button>
            )}
            <button className="tour-button-next" onClick={handleNext}>
              {currentStep === tourSteps.length - 1 ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}