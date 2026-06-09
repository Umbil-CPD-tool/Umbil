import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "Create, gather and review Multi-source Feedback from your colleagues",
  description: "Easily create feedback form and collect appraisals from your colleagues. Compliant with GMC standards and secure.",
  keywords: ["multi-source feedback", "msf", "colleague feedback", "anonymous feedback", "GMC compliant", "cycles"],
};

export default function MSFPage() {
  return (
    <WorkflowLandingPage
      title="Multi-source Feedback (MSF)"
      subtitle="Gather anonymous colleague feedback. Nominate peers effortlessly. Collate your appraisal data."
      description="Securing the peer and colleague reviews required for your Multi-Source Feedback (MSF) shouldn't involve chasing teammates down hospital corridors. Umbil streamlines the entire 360-degree review process, allowing you to invite clinical and non-clinical nominators via email or messaging, track responses anonymously, and generate a perfectly structured summary for your annual appraisal."
      bulletPoints={[
        "Easily invite colleagues by inputting their professional NHS emails or sending secure individual links.",
        "Supports mandatory splitting between clinical peers (doctors, nurses) and non-clinical colleagues (admin, management).",
        "Guarantees absolute anonymity to encourage honest, constructive feedback from your workplace team.",
        "Auto-aggregates domain scores and qualitative comments into a formatted PDF ready for your appraiser."
      ]}
      faqs={[
        {
          question: "How many colleague responses do I need for a valid MSF?",
          answer: "The GMC generally requires a minimum of 15 fully completed responses for a valid MSF cycle. To ensure you hit this threshold, it is highly recommended to nominate around 20 to 25 colleagues across your multidisciplinary team."
        },
        {
          question: "Do I need a mix of different types of colleagues?",
          answer: "Yes. To meet standard appraisal frameworks, your nominators should reflect your true working environment. This means gathering a healthy balance of clinical peers (such as fellow doctors, pharmacists, and nurses) and non-clinical staff (such as medical secretaries, receptionists, or managers)."
        },
        {
          question: "Can my colleagues see each other's responses, or will I know who wrote what?",
          answer: "No, the process is strictly confidential. To protect the integrity of the feedback and adhere to Caldicott principles, all individual scores and written comments are entirely anonymized and pooled together before you or your appraiser can see them."
        },
        {
          question: "What happens if I don't get enough responses in time?",
          answer: "Umbil features a live progress tracker on your dashboard. If you are running close to your appraisal deadline and are short of the minimum 15 responses, you can send gentle, automated email reminders to your pending nominators with a single click."
        }
      ]}
      toolId="msf"
    />
  );
}