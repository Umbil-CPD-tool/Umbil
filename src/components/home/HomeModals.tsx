// src/components/home/HomeModals.tsx
import React from "react";

export function TourWelcomeModal({ onStart, onSkip }: { onStart: () => void; onSkip: () => void }) {
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '400px', textAlign: 'center', padding: '32px' }}>
        <div style={{ fontSize: '40px', marginBottom: '16px' }}>👋</div>
        <h2 style={{ marginBottom: '12px', fontSize: '1.5rem' }}>Welcome to Umbil</h2>
        <p style={{ color: 'var(--umbil-muted)', marginBottom: '24px', lineHeight: '1.5' }}>
          Your new clinical co-pilot is ready. Would you like a 60-second tour of the key features?
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <button className="btn btn--primary" onClick={onStart} style={{ width: '100%' }}>Take the Tour</button>
          <button className="btn btn--outline" onClick={onSkip} style={{ width: '100%' }}>Skip for Now</button>
        </div>
      </div>
    </div>
  );
}

export function GuestLimitModal({ isOpen, onClose, onSignUp }: { isOpen: boolean; onClose: () => void; onSignUp: () => void }) {
  if (!isOpen) return null;
  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '48px', marginBottom: '20px' }}>🚀</div>
        <h2 style={{ marginBottom: '16px', fontSize: '1.6rem', color: '#0f172a' }}>You&apos;re on a roll!</h2>
        <p style={{ color: '#64748b', marginBottom: '32px', lineHeight: '1.6', fontSize: '1.05rem' }}>
          You&apos;ve asked a few questions as a guest. 
          <br/>
          To <strong>save your history</strong>, <strong>track CPD credits</strong>, and access <strong>pro features</strong>, create a free account today.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <button className="btn btn--primary" onClick={onSignUp} style={{ width: '100%', fontSize: '1.1rem', padding: '14px' }}>
            Create Free Account
          </button>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '0.95rem', fontWeight: 500 }}>
            Continue as Guest
          </button>
        </div>
      </div>
    </div>
  );
}

export const CpdNudge = ({ onLog }: { onLog: () => void }) => (
  <div className="cpd-nudge-container" style={{
    marginTop: '16px',
    padding: '16px',
    backgroundColor: 'var(--umbil-bg-subtle, #f9fafb)',
    border: '1px solid var(--umbil-border, #e5e7eb)',
    borderRadius: '8px',
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    animation: 'fadeIn 0.5s ease-in-out'
  }}>
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
      <div style={{ fontSize: '1.5rem' }}>🧠</div>
      <div>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '0.95rem', fontWeight: 600 }}>Capture this for your appraisal?</h4>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--umbil-muted)', lineHeight: '1.4' }}>
          You’ve covered a lot of ground! If this answer was useful, logging it now takes just seconds and builds your evidence base.
        </p>
      </div>
    </div>
    <button 
      onClick={onLog} 
      className="btn btn--sm btn--outline"
      style={{ alignSelf: 'flex-start', marginLeft: '44px' }}
    >
      Capture learning
    </button>
  </div>
);