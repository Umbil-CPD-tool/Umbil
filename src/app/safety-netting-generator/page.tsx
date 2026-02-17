import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "Safety Netting Advice Generator for Clinicians | Umbil",
  description: "Generate robust, medico-legally sound safety netting advice and red flags for your patients. Protect your practice and your patients.",
  keywords: ["safety netting advice examples", "GP safety netting template", "discharge advice generator", "clinical red flags"],
};

export default function SafetyNettingPage() {
  return (
    <WorkflowLandingPage
      title="Safety Netting Advice Generator"
      subtitle="Robust, specific, and documented safety netting in seconds."
      description="Generic 'worsening advice' isn't enough. Umbil generates specific Red Flags based on the patient's presentation (e.g., 'fever in a child' or 'head injury'), ensuring your documentation is medico-legally watertight and your patient is safe."
      bulletPoints={[
        "Generates condition-specific Red Flags (e.g., meningitis signs).",
        "Provides clear 'When to call 999 vs 111' guidance.",
        "Formats advice for easy pasting into notes or text messages.",
        "Based on NICE CKS and local UK guidelines."
      ]}
      faqs={[
        {
          question: "Can I give this to the patient?",
          answer: "Yes. The output is written in clear, patient-friendly language suitable for printing or texting."
        },
        {
          question: "Does it cover all conditions?",
          answer: "It covers the vast majority of common primary care and emergency presentations, deriving safety flags from established clinical guidelines."
        }
      ]}
      toolId="safety_netting"
    />
  );
}