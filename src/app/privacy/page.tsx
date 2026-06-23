// src/app/privacy/page.tsx

import Link from "next/link";
import { Metadata } from 'next'

// this page's title
export const metadata: Metadata = {
  title: 'Privacy',
}

export default function PrivacyPage() {
  return (
    <section className="main-content">
      <div className="container max-w-4xl mx-auto py-12 px-4">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold mb-4">Privacy Policy</h1>
          <p className="text-slate-500">Last updated: {new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}</p>
        </div>

        <div className="card mb-8">
          <div className="card__body space-y-6">
            
            {/* 1. Introduction */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">1. Introduction</h2>
              <p className="mb-2">
                Welcome to Umbil (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We are committed to protecting your privacy and ensuring the security of your professional learning data. 
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
                  <strong>User Responsibility:</strong> You are responsible for ensuring that any content you input into Umbil is appropriately anonymised and does not contain patient-identifiable information.
                </li>
              </ul>
            </section>

            {/* 3. Data We Collect & Appraisals */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">3. Data We Collect & Appraisals</h2>
              <ul className="list-disc pl-5 space-y-2">
                <li>
                  <strong>Account Information:</strong> When you sign up, we collect your email address and authentication credentials (managed securely via Supabase).
                </li>
                <li>
                  <strong>Appraisal Tools (PSQ & MSF):</strong> The app collects patient survey data for the Patient Satisfaction Questionnaire (PSQ) and doctor or staff survey data for the Multi-Source Feedback (MSF). <strong>All of this data is strictly anonymized.</strong> To prevent the identification of individual patients or colleagues, the only personal information tracked and stored alongside an individual survey submission is the specific date the survey was entered. No identifiable patient details are recorded.
                </li>
                <li>
                  <strong>Usage Data:</strong> We store the reflections, PDP goals, and clinical questions you generate to build your personal learning portfolio. 
                  This content is visible only to you unless you choose to export or share it.
                </li>
                <li>
                  <strong>Technical Data:</strong> We collect standard log information (IP address, browser type) for security monitoring and fraud prevention.
                </li>
              </ul>
            </section>

            {/* 4. How We Use Your Data */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">4. How We Use Your Data</h2>
              <p className="mb-2">We use your data solely to:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li>Provide and maintain the Umbil service.</li>
                <li>Generate AI-driven reflections, clinical summaries, and Appraisal reports requested by you.</li>
                <li>Maintain your persistent CPD (Continuing Professional Development) logs.</li>
                <li>Improve our algorithms and user experience.</li>
                <li>
                  <strong>AI Processing:</strong> User inputs may be processed by third-party AI providers (such as OpenAI or Anthropic) solely to generate responses, under strict contractual confidentiality obligations. We do not use your inputs to train public AI models.
                </li>
              </ul>
            </section>

            {/* 5. Data Security & Storage */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">5. Security & Storage</h2>
              <p className="mb-2">
                Your data is encrypted at rest and in transit. We partner with industry-leading infrastructure providers located in the UK/EU or operating under appropriate data protection safeguards:
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
                The Umbil application uses cookies <strong>strictly for essential functional purposes</strong> to help the page run smoother and maintain your secure login session. 
              </p>
              <p className="font-semibold text-teal-700 dark:text-teal-400">
                We do not use cookies for analytics, tracking, or marketing. No analytics are being performed with these cookies.
              </p>
            </section>

            {/* 7. Data Retention */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">7. Data Retention</h2>
              <p className="mb-2">
                We retain your personal profile data, CPD logs, and anonymized appraisal cycles only for as long as your account remains active with us. This ensures your historical data is reliably available for your annual appraisals.
              </p>
              <p>
                You may delete your account and all associated data instantly via the <strong>Settings</strong> page. Once you initiate a deletion, all learning logs, user profiles, and associated PSQ/MSF cycles are permanently erased from our active databases and cannot be recovered.
              </p>
            </section>

            {/* 8. Your Rights */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">8. Your Rights (UK GDPR)</h2>
              <p className="mb-2">Under the UK Data Protection Act 2018, you have robust rights regarding your information:</p>
              <ul className="list-disc pl-5 space-y-2">
                <li><strong>Right of Access:</strong> Request a copy of all data we hold about you (you can export your CPD and PSQ reports directly from the app).</li>
                <li><strong>Right to Rectification:</strong> Request correction of personal information you believe is inaccurate.</li>
                <li><strong>Right to Erasure:</strong> Delete your account and completely erase your personal information.</li>
                <li><strong>Right to Restriction:</strong> Request that we restrict the processing of your personal data under certain conditions.</li>
                <li><strong>Right to Portability:</strong> Export your learning logs and reflections in structured formats for your appraisal.</li>
              </ul>
            </section>

            {/* 9. Contact */}
            <section>
              <h2 className="text-xl font-semibold mb-3 text-teal-600">9. Contact Us</h2>
              <p>
                If you have questions about this privacy policy, please contact us via the Feedback button in the navigation menu or email us at <a href="mailto:umbil.support@gmail.com" className="underline hover:text-teal-500">umbil.support@gmail.com</a>.
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