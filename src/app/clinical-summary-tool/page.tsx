import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "AI Clinical Summary Tool for Doctors | Umbil",
  description: "Summarise complex patient notes into clear clinical abstracts instantly. Perfect for discharge summaries and ward rounds.",
  keywords: ["clinical note summary tool", "summarise patient notes", "discharge summary generator", "medical abstract tool"],
};

export default function ClinicalSummaryPage() {
  return (
    <WorkflowLandingPage
      title="AI Clinical Summary Tool"
      subtitle="Turn pages of complex notes into a concise clinical abstract."
      description="Sifting through days of ward round entries to write a discharge summary is exhausting. Umbil analyzes the clinical text to extract the diagnosis, key management steps, medication changes, and follow-up plan—condensing it into a clear summary."
      bulletPoints={[
        "Extracts diagnoses and procedures from free text.",
        "Identifies medication changes automatically.",
        "Condenses long histories into SBAR-ready summaries.",
        "Saves hours on administrative discharge paperwork."
      ]}
      faqs={[
        {
          question: "How accurate is the summarisation?",
          answer: "Umbil uses advanced LLMs tuned for medical context. However, as with all AI tools, a clinician must review the output against the source notes."
        },
        {
          question: "Does it hallucinate information?",
          answer: "We use strict 'grounding' techniques. The AI is instructed to use only the information provided in your notes and will flag if information is missing rather than inventing it."
        }
      ]}
      toolId="discharge_summary"
    />
  );
}