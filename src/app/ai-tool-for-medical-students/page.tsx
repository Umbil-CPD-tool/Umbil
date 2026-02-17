import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "AI Clinical Study Assistant for Medical Students | Umbil",
  description: "The ultimate revision partner for UK medical students. Practice OSCEs, summarise conditions, and quiz yourself against NICE guidelines.",
  keywords: ["AI tools for medical students", "OSCE practice AI", "medical school revision app", "clinical case generator"],
};

export default function MedStudentPage() {
  return (
    <WorkflowLandingPage
      title="AI Clinical Study Assistant"
      subtitle="Your personal tutor for Med School, OSCEs, and Finals."
      description="Bridge the gap between textbooks and the ward. Umbil helps medical students practice clinical reasoning, generate SBAR handovers, and understand complex management guidelines without the jargon. It's like having a friendly Registrar in your pocket."
      bulletPoints={[
        "Practice 'Simulated Patient' scenarios for OSCEs.",
        "Translate complex guidelines into simple revision notes.",
        "Generate SBAR handovers to practice ward communication.",
        "Safe environment to ask 'stupid questions' without judgement."
      ]}
      faqs={[
        {
          question: "Is it free for students?",
          answer: "We offer a free tier that is perfect for daily study queries. We also offer student discounts for the Pro plan."
        },
        {
          question: "Can I use it on the wards?",
          answer: "Yes, it's mobile-optimised. However, always ensure you follow your medical school's policy on using mobile devices in clinical areas."
        }
      ]}
      toolId="new"
    />
  );
}