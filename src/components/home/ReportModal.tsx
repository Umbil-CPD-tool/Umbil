'use client';

import React, { useMemo, useState, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import dynamic from 'next/dynamic';
// Updated Import: Use the actual exported type
import { AnalyticsResult } from '@/lib/psq-analytics';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

// --- Dynamic Imports ---
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false, loading: () => <span className="text-gray-400">Loading PDF generator...</span> }
);

// --- INTERFACE: Supports BOTH modes now ---
interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  // Mode A: PSQ Analytics (Updated Type)
  stats?: AnalyticsResult | null;
  // Mode B: Flagging Content
  entry?: { question: string; answer: string; } | null;
  onSubmit?: (reason: string) => Promise<void>;
}

// --- PDF Styles ---
const styles = StyleSheet.create({
  page: { padding: 40, backgroundColor: '#ffffff', fontFamily: 'Helvetica' },
  header: { marginBottom: 30, borderBottom: '2px solid #f3f4f6', paddingBottom: 20 },
  title: { fontSize: 24, fontWeight: 'bold', color: '#111827' },
  subtitle: { fontSize: 12, color: '#6b7280', marginTop: 5 },
  section: { marginBottom: 25 },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#374151', marginBottom: 10, textTransform: 'uppercase' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8, paddingBottom: 4, borderBottom: '1px solid #f9fafb' },
  label: { fontSize: 10, color: '#4b5563', width: '70%' },
  value: { fontSize: 10, fontWeight: 'bold', color: '#111827' },
  highlightBox: { padding: 15, backgroundColor: '#f3f4f6', borderRadius: 8, marginBottom: 20, flexDirection: 'row', justifyContent: 'space-between' },
  scoreBig: { fontSize: 32, fontWeight: 'bold', color: '#0d9488' }, // Teal color
  scoreLabel: { fontSize: 10, color: '#6b7280', marginTop: 4 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, fontSize: 8, textAlign: 'center', color: '#9ca3af', borderTop: '1px solid #f3f4f6', paddingTop: 10 },
});

// --- PDF Document Component ---
// Updated to map AnalyticsResult structure to the PDF view
const PsqReportDocument = ({ stats }: { stats: AnalyticsResult | null }) => (
  <Document>
    <Page size="A4" style={styles.page}>
      <View style={styles.header}>
        <Text style={styles.title}>Patient Feedback Report</Text>
        <Text style={styles.subtitle}>Generated via Umbil • {new Date().toLocaleDateString()}</Text>
      </View>
      
      <View style={styles.highlightBox}>
        <View>
          <Text style={styles.scoreLabel}>AVERAGE SCORE</Text>
          {/* Mapped stats.averageScore */}
          <Text style={styles.scoreBig}>{stats?.stats.averageScore.toFixed(2) ?? 0} / 5</Text>
        </View>
        <View>
           <Text style={styles.scoreLabel}>KEY STRENGTH</Text>
           {/* Mapped stats.topArea */}
           <Text style={{ ...styles.scoreBig, fontSize: 14, marginTop: 10, maxWidth: 200 }}>
             {stats?.stats.topArea ?? 'N/A'}
           </Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Domain Breakdown</Text>
        {/* Mapped breakdown array (name/score) */}
        {stats?.breakdown.map((item, idx) => (
          <View key={idx} style={styles.row}>
            <Text style={styles.label}>{item.name}</Text>
            <Text style={styles.value}>
              {typeof item.score === 'number' ? item.score.toFixed(2) : item.score}
            </Text>
          </View>
        ))}
      </View>

      <View style={styles.footer}>
        <Text>Umbil CPD Tool - Confidential Personal Report - GMC Aligned</Text>
      </View>
    </Page>
  </Document>
);

export default function ReportModal({ isOpen, onClose, stats, entry, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async () => {
    if (!onSubmit || !reason.trim()) return;
    setIsSubmitting(true);
    await onSubmit(reason);
    setIsSubmitting(false);
    setReason(""); 
  };

  const isPsqMode = !!stats;
  
  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" aria-hidden="true" />
        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
            
            <Dialog.Title as="h3" className="text-lg font-bold leading-6 text-gray-900">
              {isPsqMode ? "Export Report" : "Report an Issue"}
            </Dialog.Title>

            {/* --- MODE A: PSQ PDF DOWNLOAD --- */}
            {isPsqMode && (
              <>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Download a formal PDF summary for your appraisal evidence.
                  </p>
                </div>
                <div className="mt-6 flex flex-col items-center gap-4 py-6 bg-gray-50 rounded-lg border border-dashed border-gray-200">
                    <div className="p-3 bg-white rounded-full shadow-sm">
                       <svg className="w-8 h-8 text-teal-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                       </svg>
                    </div>
                    {stats && (
                      <PDFDownloadLink
                        document={<PsqReportDocument stats={stats} />}
                        fileName={`Umbil_PSQ_Report_${new Date().toISOString().split('T')[0]}.pdf`}
                        className="inline-flex justify-center rounded-md border border-transparent bg-teal-600 px-4 py-2 text-sm font-medium text-white hover:bg-teal-700"
                      >
                        {/* @ts-ignore */}
                        {({ loading }) => (loading ? 'Generating PDF...' : 'Download PDF Report')}
                      </PDFDownloadLink>
                    )}
                </div>
              </>
            )}

            {/* --- MODE B: CONTENT FLAGGING --- */}
            {!isPsqMode && entry && (
              <>
                <div className="mt-2">
                  <p className="text-sm text-gray-500 mb-4">
                    Help us improve. Why are you flagging this response?
                  </p>
                  <div className="p-3 bg-gray-50 rounded-md mb-4 text-xs text-gray-600 italic border-l-4 border-blue-500">
                    "{entry.answer.slice(0, 100)}..."
                  </div>
                  <textarea
                    className="w-full p-3 border rounded-md text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    rows={4}
                    placeholder="Describe the inaccuracy or issue..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                  />
                </div>
                <div className="mt-6 flex justify-end gap-3">
                  <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:bg-gray-100 rounded-md">
                    Cancel
                  </button>
                  <button 
                    onClick={handleSubmit} 
                    disabled={!reason.trim() || isSubmitting}
                    className="px-4 py-2 text-sm bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
                  >
                    {isSubmitting ? "Submitting..." : "Submit Report"}
                  </button>
                </div>
              </>
            )}

            {isPsqMode && (
              <div className="mt-4 flex justify-end">
                <button type="button" className="text-sm text-gray-500 hover:text-gray-700 font-medium" onClick={onClose}>
                  Close
                </button>
              </div>
            )}
          </Dialog.Panel>
        </div>
      </Dialog>
    </Transition>
  );
}