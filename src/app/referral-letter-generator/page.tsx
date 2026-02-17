import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "AI Referral Letter Generator for UK Clinicians | Umbil",
  description: "Convert rough clinical notes into consultant-ready referral letters instantly. Compliant with NHS standards and secure.",
  keywords: ["referral letter generator", "GP referral template", "AI medical scribe", "clinical letter writer"],
};

export default function ReferralGeneratorPage() {
  return (
    <WorkflowLandingPage
      title="AI Referral Letter Generator"
      subtitle="Paste rough notes. Get a consultant-ready referral letter in seconds."
      description="Writing referrals is one of the biggest time-sinks for GPs and hospital doctors. Umbil takes your shorthand notes, observations, and history, and formats them into a professional, structured letter ready for sending via e-Referral Service (e-RS)."
      bulletPoints={[
        "Converts shorthand to professional medical prose automatically.",
        "Structures output into standard NHS referral formats.",
        "Highlights Red Flags clearly to justify urgency.",
        "Zero patient data retention for full GDPR compliance."
      ]}
      faqs={[
        {
          question: "Is this safe for patient data?",
          answer: "Yes. Umbil removes patient identifiers client-side before processing. We do not store patient data."
        },
        {
          question: "Can I use this for 2WW referrals?",
          answer: "Yes. The tool is trained to structure information clearly, making it ideal for highlighting the 'Red Flags' required for 2-week wait pathways."
        },
        {
          question: "Does it work with messy notes?",
          answer: "Absolutely. You can paste unstructured, bulleted, or even dictated notes, and Umbil will organize them into a coherent clinical narrative."
        }
      ]}
      toolId="referral"
    />
  );
}