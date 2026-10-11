'use client';

import { pdf } from '@react-pdf/renderer';
import type { FeedbackReport } from '@/lib/feedbackReport';
import { FeedbackReportPdf } from './FeedbackReportPdf';

export const downloadFeedbackReport = async (report: FeedbackReport) => {
  const blob = await pdf(<FeedbackReportPdf report={report} />).toBlob();
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${report.docTitle}.pdf`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};
