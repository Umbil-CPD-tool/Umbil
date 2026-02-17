import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "Clinical Documentation AI Assistant for Healthcare | Umbil",
  description: "Stop spending hours on paperwork. Umbil's Clinical Documentation Assistant automates notes, summaries, and letters so you can focus on patients.",
  keywords: ["AI clinical documentation tools", "automate medical notes", "clinical scribe UK", "medical documentation software"],
};

export default function DocumentationAssistantPage() {
  return (
    <WorkflowLandingPage
      title="Clinical Documentation AI Assistant"
      subtitle="Halve the time you spend writing notes."
      description="Clinicians spend up to 50% of their day on documentation. Umbil is an AI assistant designed to reclaim that time. Whether you need to summarize a long admission, write a clinic letter, or document a complex safety-netting discussion, Umbil drafts the text for you in seconds."
      bulletPoints={[
        "Drafts clinic letters and discharge summaries instantly.",
        "Ensures documentation is structured and comprehensive.",
        "Reduces cognitive load at the end of a long shift.",
        "Works alongside your existing EPR (copy-paste workflow)."
      ]}
      faqs={[
        {
          question: "Is the data secure?",
          answer: "Yes. We process data transiently and strip identifiers. No patient data is used to train our models."
        },
        {
          question: "Can I customize the style?",
          answer: "Yes. You can instruct Umbil to be 'concise', 'detailed', or to follow a specific structure like SBAR or SOAP."
        }
      ]}
      toolId="discharge_summary"
    />
  );
}