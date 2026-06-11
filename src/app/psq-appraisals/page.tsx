import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "Create, share and review Patient Satisfaction Questionnaires",
  description: "Easily create questionnaires and gather insights of patient satisfaction. Compliant with GMC standards and secure.",
  keywords: ["patient satisfaction questionnaire", "psq", "questionaire", "patient satisfaction"],
};

export default function PSQPage() {
  return (
    <WorkflowLandingPage
      title="Patient Satisfaction Questionnaires (PSQ)"
      subtitle="Gather seamless patient feedback. Track responses in real time. Meet GMC revalidation requirements."
      description="Collecting the mandatory patient feedback for your 5-year GMC revalidation can be a logistical headache. Umbil simplifies the entire PSQ process by allowing you to launch digital cycles instantly, give patients easy access via QR codes or links, and automatically collate the anonymized data into clear, appraisal-ready insights."
      bulletPoints={[
        "Generates unique QR codes and direct links for quick patient access at the point of care.",
        "Fully anonymizes responses instantly to satisfy GMC and Caldicott principles.",
        "Provides a real-time response counter so you know exactly when you hit your target quota.",
        "Automatically calculates benchmarking scores, ready to export straight into your appraisal portfolio."
      ]}
      faqs={[
        {
          question: "How many patient responses do I need to collect?",
          answer: "While specific requirements can vary slightly depending on your royal college or designated body, the GMC typically requires a minimum of 34 valid patient responses for a standard revalidation cycle."
        },
        {
          question: "Is patient feedback completely anonymous?",
          answer: "Yes, completely. To comply with GMC guidelines and data protection regulations, patients submit their responses via a secure portal that strips out all tracking metadata. You will only see aggregate scores and anonymized written comments."
        },
        {
          question: "How do patients actually fill out the questionnaire?",
          answer: "You can display a unique QR code on your tablet or smartphone at the end of a consultation, or text/email a secure link to the patient. They can complete the survey in under two minutes on their own device."
        },
        {
          question: "Can I use this for remote or telephone consultations?",
          answer: "Absolutely. Because Umbil generates individual digital links alongside QR codes, you can easily paste the link into your SMS text templates (like Accurx or e-Hub) or email it directly to patients following a remote appointment."
        }
      ]}
      toolId="psq"
    />
  );
}