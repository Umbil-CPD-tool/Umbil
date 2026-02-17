import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "Multilingual Patient Advice Generator for Clinicians | Umbil",
  description: "Overcome language barriers instantly. Generate patient safety-netting advice and instructions in multiple languages to ensure safe discharge.",
  keywords: ["translate patient instructions medical", "multilingual patient leaflets", "medical translation tool", "foreign language discharge advice"],
};

export default function MultilingualAdvicePage() {
  return (
    <WorkflowLandingPage
      title="Multilingual Patient Advice Generator"
      subtitle="Communicate safely with every patient, in their own language."
      description="Language barriers are a major risk factor for patient safety. Umbil allows you to type instructions in English and instantly generate clear, simple explanations in your patient's native language—perfect for safety netting, medication instructions, and discharge advice."
      bulletPoints={[
        "Translate specific medical instructions instantly.",
        "Supports 50+ common languages (Polish, Urdu, Punjabi, etc).",
        "Simplifies jargon before translating for better clarity.",
        "Printable output for the patient to take home."
      ]}
      faqs={[
        {
          question: "Does this replace an interpreter?",
          answer: "No. Umbil is a support tool for written advice and simple instructions. For complex consent or history taking, you should always use an official interpreter."
        },
        {
          question: "Which languages are supported?",
          answer: "We support all major global languages, with specific optimization for common UK non-English languages like Polish, Romanian, Urdu, Punjabi, and Arabic."
        }
      ]}
      toolId="patient_friendly"
    />
  );
}