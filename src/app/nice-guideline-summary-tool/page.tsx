import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "NICE Guideline Summary Tool for Clinicians | Umbil",
  description: "Summarise complex NICE guidelines instantly. Ask questions in plain English and get evidence-based answers sourced from NICE, CKS, and SIGN.",
  keywords: ["summarise NICE guidelines", "NICE cks summary", "clinical guidelines AI", "medical guidelines search"],
};

export default function NiceGuidelinePage() {
  return (
    <WorkflowLandingPage
      title="NICE Guideline Summary Tool"
      subtitle="Stop scrolling through 100-page PDFs. Get the answer you need, instantly."
      description="Clinical guidelines are essential but often unwieldy during a busy clinic. Umbil indexes the latest NICE, SIGN, and CKS guidelines, allowing you to ask natural language questions like 'First-line antibiotic for pediatric UTI?' and get a specific, sourced answer immediately."
      bulletPoints={[
        "Sourced strictly from NICE, CKS, SIGN, and BNF.",
        "Provides direct citations and links to the source documents.",
        "Updates automatically as guidelines change.",
        "Synthesises conflicting guidance into a clear management plan."
      ]}
      faqs={[
        {
          question: "Does it make up answers?",
          answer: "No. Umbil uses 'Retrieval-Augmented Generation' (RAG) to find the exact paragraph in the official guideline before answering. If the answer isn't in the guidelines, it will tell you."
        },
        {
          question: "Does it cover local hospital guidelines?",
          answer: "Currently, we focus on National UK guidelines (NICE/SIGN/CKS). We are working on a feature for Trusts to upload local protocols."
        }
      ]}
      toolId="new"
    />
  );
}