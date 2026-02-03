// src/app/privacy/page.tsx
"use client";

import Link from "next/link";

export default function PrivacyPage() {
  return (
    <section className="main-content">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy & Terms of Use</h1>
          <p className="text-slate-500">Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="card mb-8">
          <div className="card__body space-y-6">
            
            {/* 1. Introduction */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">1. Introduction</h2>
              <p className="mb-2">
                Welcome to Umbil (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring the security of your professional data. 
                This policy outlines how we collect, use, and safeguard your information when you use our clinical workflow and learning platform.
              </p>
              <p>
                By using Umbil, you agree to the collection and use of information in accordance with this policy. 
                Our services are designed for UK-based healthcare professionals.
              </p>
            </section>

            {/* 2. Critical: Patient Data Policy */}
            <section className="p-4 bg-amber-50/50 border border-amber-200 rounded-lg dark:bg-amber-900/10 dark:border-amber-800">
              <h2 className="text-xl font-bold mb-3 text-amber-700 dark:text-amber-500">
                2. IMPORTANT: Patient Data Policy
              </h2>
              <p className="font-medium mb-2">
                Umbil is a learning and workflow tool, NOT a patient record system.
              </p>
              <ul className="list-disc pl-5 space-y-2 text-sm">
                <li>
                  <strong>Do not upload real patient names, NHS numbers, or identifiable data.</strong>
                </li>
                <li>
                  We employ automated server-side filters to detect and redact potential personal identifiers before data is processed by our AI models.
                </li>
                <li>
                  However, you remain the data controller for any text you input. You must ensure all clinical notes used for reflection or summary generation are anonymised at the source.
                </li>
              </ul>
            </section>

            {/* 3. Data We Collect */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">3. Data We Collect</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Account Information:</strong> When you sign up, we collect your email address and authentication credentials (managed securely via Supabase).
                </li>
                <li>
                  <strong>Usage Data:</strong> We store the reflections, PDP goals, and clinical questions you generate to build your personal learning portfolio.
                </li>
                <li>
                  <strong>Technical Data:</strong> We may collect standard log information (IP address, browser type) for security monitoring and fraud prevention.
                </li>
              </ul>
            </section>

            {/* 4. How We Use Your Data */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">4. How We Use Your Data</h2>
              <p className="mb-2">We use your data solely to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide and maintain the Umbil service.</li>
                <li>Generate AI-driven reflections and clinical summaries requested by you.</li>
                <li>Maintain your persistent CPD (Continuing Professional Development) logs.</li>
                <li>Improve our algorithms and user experience.</li>
              </ul>
              <p className="mt-2 font-semibold">
                We do not sell your data to third parties. We do not use your inputs to train public AI models.
              </p>
            </section>

            {/* 5. Data Security & Storage */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">5. Security & Storage</h2>
              <p className="mb-2">
                Your data is encrypted at rest and in transit. We partner with industry-leading infrastructure providers:
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Supabase:</strong> For authentication and database hosting (Enterprise-grade security).
                </li>
                <li>
                  <strong>Vercel:</strong> For secure application deployment.
                </li>
              </ul>
            </section>

            {/* 6. Cookies */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">6. Cookies</h2>
              <p className="mb-2">
                We use cookies to enhance your experience. You can manage your preferences via our Cookie Banner.
              </p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Essential Cookies:</strong> Required for login sessions and security (e.g., Supabase Auth).</li>
                <li><strong>Performance Cookies:</strong> Help us understand how the app is used (we do not use invasive marketing trackers).</li>
              </ul>
            </section>

            {/* 7. Your Rights */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">7. Your Rights (GDPR)</h2>
              <p className="mb-2">Under the UK Data Protection Act 2018, you have the right to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Access:</strong> Request a copy of all data we hold about you.</li>
                <li><strong>Deletion:</strong> Delete your account and all associated data instantly via the Settings page.</li>
                <li><strong>Portability:</strong> Export your CPD logs and reflections for your appraisal.</li>
              </ul>
            </section>

            {/* 8. Contact */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">8. Contact Us</h2>
              <p>
                If you have questions about this privacy policy, please contact us via the Feedback form in your settings or email us at <a href="mailto:hello@umbil.co.uk" className="underline hover:text-teal-500">hello@umbil.co.uk</a>.
              </p>
            </section>

          </div>
        </div>

        <div className="text-center mt-8">
          <Link href="/" className="text-sm font-medium hover:underline opacity-70 hover:opacity-100">
            &larr; Back to Home
          </Link>
        </div>
      </div>
    </section>
  );
}