// src/components/LandingPage.tsx
"use client";

import Link from "next/link";
import { useState } from "react";

type LandingPageProps = {
  onStartDemo: () => void;
};

export default function LandingPage({ onStartDemo }: LandingPageProps) {
  // We force light-mode style colors on this specific page to ensure design consistency
  // regardless of the user's system theme preference.
  const sectionBg = "#ffffff";
  const textColor = "#1e293b"; // Slate-800
  const mutedColor = "#475569"; // Slate-600

  return (
    <div className="landing-page" style={{ overflowY: 'auto', height: '100%', background: sectionBg, color: textColor }}>
      
      {/* --- HERO SECTION --- */}
      <section style={{
        background: 'linear-gradient(135deg, #1fb8cd 0%, #115e6e 100%)',
        color: 'white',
        padding: '100px 20px 120px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '650px'
      }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          
          {/* Tagline Badge */}
          <div style={{ 
            display: 'inline-block', 
            background: 'rgba(255,255,255,0.15)', 
            backdropFilter: 'blur(10px)', 
            padding: '8px 20px', 
            borderRadius: '30px', 
            fontSize: '0.85rem', 
            fontWeight: 600, 
            marginBottom: '32px',
            border: '1px solid rgba(255,255,255,0.2)'
          }}>
            ✨ The Intelligent Learning Platform for Modern Medicine
          </div>
          
          <h1 style={{ 
            fontSize: 'clamp(2.5rem, 6vw, 4.5rem)', 
            fontWeight: 800, 
            marginBottom: '24px', 
            lineHeight: 1.1,
            letterSpacing: '-0.02em',
            textShadow: '0 4px 20px rgba(0,0,0,0.1)'
          }}>
            Your AI Clinical Co-Pilot & <br/>
            <span style={{ color: '#bafff9' }}>CPD Automation Tool</span>
          </h1>
          
          <p style={{ 
            fontSize: '1.25rem', 
            opacity: 0.9, 
            maxWidth: '640px', 
            margin: '0 auto 48px', 
            lineHeight: 1.6 
          }}>
            Umbil turns your daily clinical curiosity into verified CPD. Get instant 
            <strong> NICE/SIGN summaries</strong>, generate 
            <strong> GMC reflective entries</strong>, and draft referrals in seconds.
          </p>

          <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <Link href="/auth" className="btn" style={{ 
              backgroundColor: 'white', 
              color: '#0e7490', 
              padding: '16px 36px', 
              fontSize: '1.1rem', 
              fontWeight: 700,
              border: 'none',
              borderRadius: '12px',
              boxShadow: '0 10px 25px -5px rgba(0,0,0,0.2)',
              transition: 'transform 0.2s'
            }}>
              Start Free Now
            </Link>
            
            <button 
              onClick={onStartDemo}
              className="btn" 
              style={{ 
                backgroundColor: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(255,255,255,0.4)', 
                color: 'white',
                padding: '16px 36px',
                fontSize: '1.1rem', 
                fontWeight: 600,
                borderRadius: '12px',
                backdropFilter: 'blur(4px)',
                cursor: 'pointer'
              }}>
              See How It Works
            </button>
          </div>
          
          <p style={{ marginTop: '32px', fontSize: '0.9rem', opacity: 0.7, fontWeight: 500 }}>
            Built for UK Clinicians (Hospital, Primary Care, & Locums)
          </p>
        </div>
      </section>

      {/* --- FEATURES GRID (SEO RICH) --- */}
      <section style={{ padding: '100px 20px', background: '#f8fafc' }}>
        <div className="container" style={{ textAlign: 'center', maxWidth: '1000px' }}>
          <h2 style={{ fontSize: '2.2rem', fontWeight: 700, marginBottom: '16px', color: '#0f172a' }}>
            Reduce Admin & Automate Your Portfolio
          </h2>
          <p style={{ fontSize: '1.1rem', color: mutedColor, marginBottom: '60px', maxWidth: '600px', margin: '0 auto 60px' }}>
            Stop trawling through guidelines and writing reflections at midnight. Let Umbil handle the busywork.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', textAlign: 'left' }}>
            
            {/* Feature 1 */}
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ width: '48px', height: '48px', background: '#ecfeff', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '24px' }}>🧠</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: 700, color: '#0f172a' }}>Clinical Search Engine</h3>
              <p style={{ color: mutedColor, lineHeight: 1.6 }}>
                Ask questions like <em>"UTI management NICE"</em> or <em>"Red flags for vertigo"</em>. Umbil scans trusted UK sources (CKS, BNF, SIGN) to give you instant, cited answers in Clinic, Standard, or Deep Dive modes.
              </p>
            </div>

            {/* Feature 2 */}
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ width: '48px', height: '48px', background: '#fff1f2', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '24px' }}>✨</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: 700, color: '#0f172a' }}>Referral & SBAR Writer</h3>
              <p style={{ color: mutedColor, lineHeight: 1.6 }}>
                Turn rough shorthand notes into professional <strong>GP referral letters</strong> or structured <strong>SBAR handovers</strong> instantly. Includes safety netting generation for medico-legal protection.
              </p>
            </div>

            {/* Feature 3 */}
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ width: '48px', height: '48px', background: '#f0fdf4', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '24px' }}>✍️</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: 700, color: '#0f172a' }}>Automated Reflection</h3>
              <p style={{ color: mutedColor, lineHeight: 1.6 }}>
                Umbil automatically converts your clinical queries into <strong>GMC-compliant reflective entries</strong>. It tags them with domains (e.g., "Safety & Quality") and saves them to your timeline.
              </p>
            </div>

            {/* Feature 4 */}
            <div style={{ background: 'white', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ width: '48px', height: '48px', background: '#fff7ed', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '20px', fontSize: '24px' }}>📈</div>
              <h3 style={{ fontSize: '1.25rem', marginBottom: '12px', fontWeight: 700, color: '#0f172a' }}>PDP & Analytics</h3>
              <p style={{ color: mutedColor, lineHeight: 1.6 }}>
                Track your learning streaks and visualize your topic coverage. Umbil even <strong>suggests PDP goals</strong> automatically based on the topics you search for most often.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* --- SEO / USE CASES --- */}
      <section style={{ padding: '80px 20px', background: 'white' }}>
        <div className="container" style={{ maxWidth: '900px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '60px', alignItems: 'center' }}>
            
            {/* Left Content */}
            <div>
              <h2 style={{ fontSize: '2rem', marginBottom: '24px', color: '#0f172a' }}>Who is Umbil for?</h2>
              
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#1fb8cd' }}>For GP Trainees & FY2s</h3>
                <p style={{ color: mutedColor }}>
                  The ultimate <strong>portfolio companion</strong>. Prepare for ARCP, generate case-based discussions, and ensure you never miss a learning opportunity on the wards.
                </p>
              </div>

              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#1fb8cd' }}>For Primary Care</h3>
                <p style={{ color: mutedColor }}>
                  Streamline admin and stay up to date with changing guidelines. Use the <strong>Discharge Condenser</strong> to process clinic letters faster.
                </p>
              </div>

              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '8px', color: '#1fb8cd' }}>For Hospital Clinicians</h3>
                <p style={{ color: mutedColor }}>
                  Support your decision making with "Deep Dive" mode for complex cases and keep a permanent record of your CPD for appraisal.
                </p>
              </div>
            </div>

            {/* Right: Keywords/Visual */}
            <div style={{ background: '#f8fafc', padding: '40px', borderRadius: '24px', border: '1px dashed #cbd5e1' }}>
              <h4 style={{ fontSize: '1rem', marginBottom: '20px', fontWeight: 600, color: '#0f172a' }}>Popular Clinical Searches:</h4>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                {[
                  "Chest pain red flags", "Vertigo vs Dizziness", "NICE asthma summary", 
                  "GORD management", "Fever in child <5", "Hypertension guidelines",
                  "Diabetes meds review", "Sepsis screen criteria", "Headache red flags"
                ].map(tag => (
                  <span key={tag} style={{ 
                    fontSize: '0.85rem', 
                    background: 'white', 
                    padding: '8px 16px', 
                    borderRadius: '20px', 
                    color: '#475569',
                    border: '1px solid #e2e8f0',
                    fontWeight: 500,
                    boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                  }}>
                    🔍 {tag}
                  </span>
                ))}
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* --- CTA --- */}
      <section style={{ padding: '100px 20px', textAlign: 'center', background: '#f0f9ff' }}>
        <h2 style={{ fontSize: '2.5rem', marginBottom: '20px', fontWeight: 800, color: '#0f172a' }}>
          Start learning smarter.
        </h2>
        <p style={{ fontSize: '1.2rem', color: mutedColor, marginBottom: '40px' }}>
          Join the community of clinicians using Umbil today.
        </p>
        <Link href="/auth" className="btn btn--primary" style={{ 
          padding: '16px 48px', 
          fontSize: '1.2rem', 
          backgroundColor: '#1fb8cd', 
          border: 'none',
          boxShadow: '0 4px 14px rgba(31, 184, 205, 0.4)' 
        }}>
          Get Started for Free
        </Link>
      </section>

      {/* --- FOOTER --- */}
      <footer style={{ background: '#0f172a', color: 'white', padding: '60px 20px', fontSize: '0.9rem' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1.5rem', color: '#1fb8cd', marginBottom: '8px' }}>Umbil</div>
            <div style={{ opacity: 0.6 }}>Your Medical Education Lifeline.</div>
          </div>
          <div style={{ display: 'flex', gap: '32px' }}>
            <Link href="/auth" style={{ color: 'white', opacity: 0.8, textDecoration: 'none', fontWeight: 500 }}>Login</Link>
            <Link href="/about" style={{ color: 'white', opacity: 0.8, textDecoration: 'none', fontWeight: 500 }}>About</Link>
            <Link href="/privacy" style={{ color: 'white', opacity: 0.8, textDecoration: 'none', fontWeight: 500 }}>Privacy Policy</Link>
          </div>
        </div>
        <div className="container" style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.1)', opacity: 0.4, fontSize: '0.8rem' }}>
          © {new Date().getFullYear()} Umbil. All rights reserved.
        </div>
      </footer>
    </div>
  );
}