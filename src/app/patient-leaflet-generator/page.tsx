import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "AI Patient Information Leaflet Generator | Umbil",
  description: "Generate NHS-style patient information leaflets in seconds. Print-ready, clear, and condition-specific advice for your patients.",
  keywords: ["patient leaflet template", "generate patient advice sheet", "patient information leaflet generator", "medical explanation tool"],
};

export default function PatientLeafletPage() {
  return (
    <WorkflowLandingPage
      title="AI Patient Information Leaflet Generator"
      subtitle="Create bespoke, easy-to-read patient guides in seconds."
      description="Patients forget 80% of what is said in a consultation. Umbil allows you to generate a custom, print-ready information leaflet for any condition, procedure, or medication instantly. Improve compliance and reduce anxiety with clear written advice."
      bulletPoints={[
        "Generates print-friendly PDFs instantly.",
        "Written in plain English (Reading age 9-11).",
        "Includes specific safety-netting and 'when to call back' advice.",
        "Customisable for specific patient needs (e.g., 'Safe for pregnancy')."
      ]}
      faqs={[
        {
          question: "Can I print these directly?",
          answer: "Yes. The tool formats the output into a clean, professional document ready to print directly from your browser."
        },
        {
          question: "Is the medical advice reliable?",
          answer: "The content is sourced from the NHS website, CKS, and standard patient information resources, ensuring consistency with UK care standards."
        }
      ]}
      toolId="patient_friendly"
    />
  );
}