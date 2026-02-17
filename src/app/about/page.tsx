// src/app/about/page.tsx
"use client";

import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function AboutPage() {
  return (
    <section className="main-content">
      <div className="container" style={{ maxWidth: '800px', margin: '0 auto', paddingBottom: '40px' }}>
        
        {/* Navigation / Back */}
        <div style={{ marginBottom: 24 }}>
             <Link href="/settings" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', color: 'var(--umbil-muted)', fontSize: '0.9rem', fontWeight: 500, textDecoration: 'none' }}>
                <ArrowLeft size={16} /> Back to Settings
             </Link>
        </div>

        <h2 style={{ 
            fontSize: '3rem', 
            fontWeight: 800, 
            letterSpacing: '-0.03em', 
            marginBottom: 40,
            color: 'var(--umbil-text)'
        }}>About Umbil</h2>

        {/* Intro Section */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card__body" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: 24, fontSize: '1.75rem', fontWeight: 700, color: 'var(--umbil-brand-teal)' }}>Clinical Workflow Assistant</h3>
            <p className="section-description" style={{ marginBottom: 16, fontSize: '1.05rem', lineHeight: 1.6 }}>
              Umbil is a clinical workflow assistant designed to support doctors, trainees, allied health professionals, and medical students in everyday clinical practice.
            </p>
            <p className="section-description" style={{ marginBottom: 16, fontSize: '1.05rem', lineHeight: 1.6 }}>
              Modern healthcare is information dense and administratively heavy. Clinicians often work across multiple systems, search several guideline sources, and spend large amounts of time producing referral letters, documentation, patient information, and portfolio learning records. Umbil was created to reduce this friction by bringing key clinical workflows into one place.
            </p>
            <p className="section-description" style={{ marginBottom: 16, fontSize: '1.05rem', lineHeight: 1.6 }}>
              The platform helps clinicians retrieve trusted guidance from NICE, SIGN, and CKS, draft structured clinical documentation in seconds, generate patient friendly advice, and capture clinical learning automatically while working. The aim is simple: reduce cognitive load, save time, and allow clinicians to focus more fully on patient care.
            </p>
            <p className="section-description" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
              Umbil is designed for use across the entire clinical career journey, from medical school to senior practice, supporting both learning and real time clinical work.
            </p>
          </div>
        </div>

        {/* Our Mission */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card__body" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: 24, fontSize: '1.75rem', fontWeight: 700 }}>Our Mission</h3>
            <p className="section-description" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
              Our mission is to make clinical work simpler, faster, and safer by embedding intelligent workflow support directly into everyday practice. By reducing unnecessary administrative burden and improving access to trusted clinical knowledge, Umbil helps clinicians spend more time where it matters most, with patients.
            </p>
          </div>
        </div>

        {/* Who uses Umbil */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card__body" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: 24, fontSize: '1.75rem', fontWeight: 700 }}>Who uses Umbil</h3>
            <p className="section-description" style={{ marginBottom: 24, fontSize: '1.05rem' }}>
              Umbil is used by:
            </p>
            
            {/* Converted list to grid for better UI, keeping exact text */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: 24 }}>
                {[
                    "General practitioners", 
                    "Hospital doctors", 
                    "Trainees and foundation doctors", 
                    "Allied health professionals", 
                    "Medical students"
                ].map((item, i) => (
                    <div key={i} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        padding: '12px 16px', 
                        backgroundColor: 'var(--umbil-bg)', 
                        borderRadius: '8px',
                        border: '1px solid var(--umbil-border)',
                        fontWeight: 600,
                        fontSize: '0.95rem'
                    }}>
                        <span style={{ color: 'var(--umbil-brand-teal)', marginRight: '10px' }}>•</span> {item}
                    </div>
                ))}
            </div>

            <p className="section-description" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
              The platform supports clinicians from training through to consultant level, helping them learn, document, and manage clinical workflows more efficiently.
            </p>
          </div>
        </div>

        {/* What makes Umbil different */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card__body" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: 24, fontSize: '1.75rem', fontWeight: 700 }}>What makes Umbil different</h3>
            <p className="section-description" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
              Umbil is designed specifically for real clinical workflows rather than general artificial intelligence use. It combines trusted UK guideline sources with tools that generate real clinical outputs such as referral letters, summaries, safety netting advice, and patient information. Learning can be captured automatically as clinicians work, allowing portfolio evidence and professional development records to build naturally over time.
            </p>
          </div>
        </div>

        {/* Frequently Asked Questions */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card__body" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: 32, fontSize: '1.75rem', fontWeight: 700 }}>Frequently Asked Questions</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>What is Umbil?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Umbil is an AI powered clinical workflow assistant designed for doctors, trainees, allied health professionals, and medical students. It helps clinicians draft referral letters, summarise trusted clinical guidance, generate patient information, and capture learning automatically during everyday clinical work.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Who can use Umbil?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Umbil is designed for clinicians at every stage of their career, from medical school through to consultant and GP level, supporting learning and clinical workflow across healthcare settings.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>How does Umbil help reduce clinical admin workload?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Umbil automates common documentation tasks such as referral letters, safety netting advice, clinical summaries, and patient information leaflets, helping clinicians save time and reduce administrative burden.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Is Umbil based on trusted UK clinical guidance?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Yes. Umbil collates information from trusted UK sources including NICE, SIGN, and CKS, presenting structured summaries designed for real clinical decision support.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Can Umbil generate referral letters automatically?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Yes. Clinicians can enter short clinical details and Umbil will generate a structured referral letter ready for editing or copying into the clinical record.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Can Umbil create patient information leaflets?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Yes. Umbil can generate clear patient friendly information and safety netting advice tailored to the clinical situation.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Does Umbil replace clinical judgement?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>No. Umbil is designed as a clinical co-pilot that supports clinicians with workflow tasks and information retrieval, while all clinical decisions remain with the clinician.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>How does Umbil help with appraisal and portfolio learning?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Umbil captures learning automatically while clinicians work. Clinical questions can be converted into structured learning entries that can later be exported for appraisal, portfolio, or training requirements.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Is Umbil useful for medical students and trainees?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Yes. Medical students and trainees use Umbil to review guideline summaries, understand clinical presentations, and log learning encountered during placements and clinical work.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Does Umbil support multiple languages?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Yes. Umbil includes multilingual functionality that allows clinicians to generate patient advice, workflow documentation, and clinical summaries in multiple languages, supporting diverse healthcare environments.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Can Umbil translate patient advice into other languages?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Yes. Clinicians can generate patient information and safety netting advice in a range of languages to support communication with patients who do not speak English as their first language.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Can international clinicians use Umbil?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Yes. Umbil is designed for clinicians globally and is particularly useful for international medical graduates working within the UK and other healthcare systems.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Is Umbil secure to use in clinical environments?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Umbil is designed with healthcare data protection principles in mind. Workflow tools can be used without storing identifiable patient information.</p>
                </div>

                <div className="faq-item">
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>How is Umbil different from general AI tools?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Umbil is designed specifically for healthcare workflows and clinical learning, combining trusted guideline sources with tools that generate real clinical documentation and capture learning in real time.</p>
                </div>

                <div className="faq-item" style={{ paddingTop: 24, borderTop: '1px solid var(--umbil-divider)' }}>
                    <h4 style={{ fontSize: '1.2rem', fontWeight: 700, marginBottom: 10, color: 'var(--umbil-brand-teal)' }}>Where can I try Umbil?</h4>
                    <p className="section-description" style={{ fontSize: '1rem', lineHeight: 1.6 }}>Clinicians and students can explore Umbil by visiting <Link href="https://www.umbil.co.uk" target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'underline', fontWeight: 600, color: 'var(--umbil-brand-teal)' }}>www.umbil.co.uk</Link> and creating an account to begin using the platform.</p>
                </div>
            </div>
          </div>
        </div>

        {/* Closing Section */}
        <div className="card" style={{ marginBottom: 32 }}>
          <div className="card__body" style={{ padding: '32px' }}>
            <h3 style={{ marginBottom: 24, fontSize: '1.75rem', fontWeight: 700 }}>Our Philosophy</h3>
            <p className="section-description" style={{ fontSize: '1.05rem', lineHeight: 1.6 }}>
              Umbil is built around the belief that technology should quietly support clinicians rather than distract from care. By simplifying documentation, improving access to trusted knowledge, and capturing learning in the background, the platform aims to make everyday clinical work smoother for healthcare professionals at every stage of their career.
            </p>
          </div>
        </div>

      </div>
    </section>
  );
}