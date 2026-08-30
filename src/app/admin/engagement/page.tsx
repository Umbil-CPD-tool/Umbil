import type { Metadata } from "next";
import { fetchEngagementPayload } from "@/lib/engagement/fetchReport";
import EngagementDashboard from "./EngagementDashboard";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Engagement",
  robots: { index: false, follow: false },
};

const EngagementPage = async () => {
  const payload = await fetchEngagementPayload();
  return <EngagementDashboard payload={payload} />;
};

export default EngagementPage;
