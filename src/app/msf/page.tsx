"use client";

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useUserEmail } from '@/hooks/useUser';
import MsfPdfDocument from '@/components/MsfPdfDocument';
import { PDFDownloadLink } from '@react-pdf/renderer';

export default function MsfDashboard() {
  const { email } = useUserEmail();
  const [cycles, setCycles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [aiSummary, setAiSummary] = useState<string | null>(null);
  const [generatingAi, setGeneratingAi] = useState(false);

  useEffect(() => {
    fetchCycles();
  }, []);

  const fetchCycles = async () => {
    try {
      const res = await fetch('/api/msf/cycle');
      const data = await res.json();
      setCycles(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const startNewCycle = async () => {
    setLoading(true);
    await fetch('/api/msf/cycle', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ required_responses: 10 }),
    });
    fetchCycles();
  };

  const closeCycle = async (id: string) => {
    setLoading(true);
    await fetch('/api/msf/cycle', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cycle_id: id, status: 'closed' }),
    });
    fetchCycles();
  };

  const generateAiSummary = async (cycleId: string) => {
    setGeneratingAi(true);
    try {
      const res = await fetch('/api/msf/ai-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cycle_id: cycleId }),
      });
      const data = await res.json();
      if (data.summary) setAiSummary(data.summary);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingAi(false);
    }
  };

  if (loading && cycles.length === 0) return <div className="p-8">Loading MSF Dashboard...</div>;

  const activeCycle = cycles.find(c => c.status === 'open');
  const pastCycles = cycles.filter(c => c.status === 'closed');

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-8">
      <div className="mb-8 flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">360° Colleague Feedback (MSF)</h1>
          <p className="text-gray-500 mt-2">Gather anonymous feedback from clinical and non-clinical colleagues for your appraisal.</p>
        </div>
        {!activeCycle && (
          <button onClick={startNewCycle} className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700">
            Start New Cycle
          </button>
        )}
      </div>

      {activeCycle && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">Active Feedback Cycle</h2>
            <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm font-medium">In Progress</span>
          </div>

          <div className="mb-8">
            <label className="block text-sm font-medium text-gray-700 mb-2">Share this anonymous link with colleagues (WhatsApp/Email):</label>
            <div className="flex gap-2">
              <input 
                type="text" 
                readOnly 
                value={`${window.location.origin}/m/${activeCycle.id}`}
                className="flex-1 px-4 py-2 bg-gray-50 border border-gray-300 rounded-lg text-gray-600"
              />
              <button 
                onClick={() => navigator.clipboard.writeText(`${window.location.origin}/m/${activeCycle.id}`)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Copy Link
              </button>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex justify-between text-sm mb-2">
              <span className="font-medium">Responses Gathered</span>
              <span className="text-gray-500">{activeCycle.response_count} / {activeCycle.required_responses} Required</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-500" 
                style={{ width: `${Math.min(100, (activeCycle.response_count / activeCycle.required_responses) * 100)}%` }}
              ></div>
            </div>
            {activeCycle.response_count < activeCycle.required_responses ? (
              <p className="text-sm text-gray-500 mt-3 flex items-center gap-1">
                <svg className="w-4 h-4 text-orange-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
                Results remain locked until the required threshold is met to protect anonymity.
              </p>
            ) : (
              <p className="text-sm text-green-600 mt-3 font-medium">
                Threshold met! You can now close this cycle and generate your report.
              </p>
            )}
          </div>

          <button 
            disabled={activeCycle.response_count < activeCycle.required_responses}
            onClick={() => closeCycle(activeCycle.id)}
            className={`w-full py-3 rounded-lg font-semibold ${
              activeCycle.response_count >= activeCycle.required_responses 
                ? 'bg-blue-600 text-white hover:bg-blue-700' 
                : 'bg-gray-100 text-gray-400 cursor-not-allowed'
            }`}
          >
            Close Cycle & Generate Report
          </button>
        </div>
      )}

      {pastCycles.length > 0 && (
        <div>
          <h2 className="text-xl font-semibold mb-4">Completed Appraisals</h2>
          <div className="grid gap-4">
            {pastCycles.map(cycle => (
              <div key={cycle.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                  <p className="font-semibold">MSF Cycle - {new Date(cycle.created_at).toLocaleDateString()}</p>
                  <p className="text-sm text-gray-500">{cycle.response_count} Responses</p>
                </div>
                <div className="flex gap-2 w-full sm:w-auto">
                  <button 
                    onClick={() => generateAiSummary(cycle.id)}
                    className="flex-1 sm:flex-none px-4 py-2 border border-purple-200 text-purple-700 bg-purple-50 rounded-lg hover:bg-purple-100 font-medium text-sm transition-colors"
                  >
                    {generatingAi ? 'Analyzing...' : '✨ Auto-Draft Reflection'}
                  </button>
                  {/* Mock PDF Link for structural completeness - real implementation uses fetched JSON */}
                  <PDFDownloadLink
                    document={<MsfPdfDocument cycleDate={new Date(cycle.created_at).toLocaleDateString()} responseCount={cycle.response_count} />}
                    fileName={`MSF_Report_${new Date(cycle.created_at).toISOString().split('T')[0]}.pdf`}
                    className="flex-1 sm:flex-none px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium text-sm text-center"
                  >
                    {({ loading }) => (loading ? 'Preparing...' : 'Download PDF')}
                  </PDFDownloadLink>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AI Summary Modal */}
      {aiSummary && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-2xl font-bold mb-4 flex items-center gap-2">
              ✨ AI Executive Summary
            </h3>
            <div className="prose prose-blue max-w-none whitespace-pre-wrap text-gray-700">
              {aiSummary}
            </div>
            <div className="mt-6 flex justify-end">
              <button onClick={() => setAiSummary(null)} className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg font-medium hover:bg-gray-200">
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}