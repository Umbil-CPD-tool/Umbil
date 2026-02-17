import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "AI GP Workflow Assistant | Reduce Admin Time | Umbil",
  description: "Reduce GP paperwork with Umbil. AI tools for referrals, patient texts, and clinical filing. Built for UK General Practice.",
  keywords: ["AI for GP admin", "reduce GP paperwork", "general practice workflow", "clinical admin automation"],
};

export default function GPWorkflowPage() {
  return (
    <WorkflowLandingPage
      title="AI GP Workflow Assistant"
      subtitle="Your digital partner for the 10-minute consultation."
      description="General Practice is overwhelming. Umbil acts as your AI sidekick, handling the repetitive administrative tasks that eat into your day—from writing referral letters to generating safety-netting SMS texts for patients."
      bulletPoints={[
        "Generate patient-friendly information leaflets on the fly.",
        "Draft referral letters in under 30 seconds.",
        "Translate medical advice into multiple languages instantly.",
        "Capture CPD credits automatically from your case queries."
      ]}
      faqs={[
        {
          question: "Does it integrate with EMIS or SystmOne?",
          answer: "Umbil is currently a standalone web tool. You simply copy and paste the generated text directly into your clinical system."
        },
        {
          question: "Is it free for NHS GPs?",
          answer: "We offer a generous free tier that covers most daily usage. Pro plans are available for heavy users requiring advanced features."
        }
      ]}
      toolId="referral"
    />
  );
}