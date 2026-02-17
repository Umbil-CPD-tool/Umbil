import type { Metadata } from "next";
import WorkflowLandingPage from "@/components/landing/WorkflowLandingPage";

export const metadata: Metadata = {
  title: "Capture Clinical Learning Automatically | Umbil",
  description: "The effortless way to log CPD. Umbil identifies learning points from your clinical queries and logs them to your portfolio automatically.",
  keywords: ["log clinical learning portfolio", "CPD logging doctors", "automatic CPD tracker", "medical portfolio builder"],
};

export default function CaptureLearningPage() {
  return (
    <WorkflowLandingPage
      title="Capture Clinical Learning Automatically"
      subtitle="Turn your daily work into a finished CPD portfolio."
      description="Every time you check a dose or look up a guideline, you are learning. Umbil runs silently in the background of your queries, identifying potential CPD entries. With one click, you can generate a structured reflection aligned with GMC domains and save it to your log."
      bulletPoints={[
        "Converts quick questions into structured reflection logs.",
        "Maps entries to GMC Good Medical Practice domains.",
        "Tracks your learning streaks to build a habit.",
        "Export your full log for annual appraisal."
      ]}
      faqs={[
        {
          question: "Do I have to write the reflection myself?",
          answer: "No. Umbil drafts the reflection for you based on the clinical question you asked, which you can then edit or approve in seconds."
        },
        {
          question: "Is this accepted for appraisals?",
          answer: "Yes. The output is formatted specifically to meet the standard requirements for UK medical appraisals and revalidation."
        }
      ]}
      toolId="new"
    />
  );
}