// src/app/m/[id]/page.tsx
"use client";

import React, { useState, use } from 'react';
import { MSF_QUESTIONS, MSF_ROLES } from '@/lib/msf-questions';

export default function MsfSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const cycleId = resolvedParams.id;
  
  const [role, setRole] = useState<string>('');
  const [scores, setScores] = useState<Record<string, number>>({});
  const [strengths, setStrengths] = useState('');
  const [improvements, setImprovements] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleScoreChange = (questionId: string, score: number) => {
    setScores(prev => ({ ...prev, [questionId]: score }));
  };

  const isFormValid = role !== '' && Object.keys(scores).length === MSF_QUESTIONS.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/public/msf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cycle_id: cycleId,
          role_type: role,
          scores,
          strengths_text: strengths,
          improvements_text: improvements,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to submit feedback');
      }

      setIsSuccess(true);
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-2xl shadow-sm p-8 text-center border border-gray-100">
          <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-semibold text-gray-900 mb-2">Thank You</h2>
          <p className="text-gray-600">
            Your feedback has been securely and anonymously submitted. You can now close this window.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        
        {/* Header */}
        <div className="bg-teal-600 px-6 py-8 text-center">
          <h1 className="text-2xl font-bold text-white mb-2">360° Colleague Feedback</h1>
          <p className="text-teal-100 text-sm">
            Your feedback is 100% anonymous and will only be shared in an aggregated format once a minimum number of responses is reached.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="p-6 sm:p-8 space-y-10">
          
          {error && (
            <div className="bg-red-50 text-red-600 p-4 rounded-lg text-sm font-medium border border-red-100">
              {error}
            </div>
          )}

          {/* Role Selection */}
          <div className="space-y-3">
            <label className="block text-base font-semibold text-gray-900">
              What is your professional role? <span className="text-red-500">*</span>
            </label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
              required
            >
              <option value="" disabled>Select your role...</option>
              {MSF_ROLES.map((r) => (
                <option key={r} value={r}>{r}</option>
              ))}
            </select>
          </div>

          <div className="border-t border-gray-100 pt-8"></div>

          {/* Likert Questions */}
          <div className="space-y-8">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Ratings</h3>
              <p className="text-sm text-gray-500">Please rate the doctor across the following domains.</p>
            </div>

            {MSF_QUESTIONS.map((q, index) => (
              <div key={q.id} className="bg-gray-50 p-5 rounded-xl border border-gray-100">
                <p className="text-sm font-medium text-gray-900 mb-4">
                  {index + 1}. {q.text} <span className="text-red-500">*</span>
                </p>
                <div className="flex flex-wrap gap-2 sm:gap-4">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <label
                      key={`${q.id}-${num}`}
                      className={`flex-1 min-w-[3rem] sm:min-w-[4rem] text-center cursor-pointer py-2 rounded-lg border transition-all ${
                        scores[q.id] === num
                          ? 'bg-teal-600 border-teal-600 text-white shadow-md'
                          : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <input
                        type="radio"
                        name={q.id}
                        value={num}
                        className="hidden"
                        onChange={() => handleScoreChange(q.id, num)}
                      />
                      <span className="block text-lg font-medium">{num}</span>
                      <span className="block text-[10px] sm:text-xs opacity-80 mt-1">
                        {num === 1 ? 'Poor' : num === 5 ? 'Excellent' : ''}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 pt-8"></div>

          {/* Free Text Questions */}
          <div className="space-y-6">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Comments</h3>
              <p className="text-sm text-gray-500">Free text comments are often the most valuable part of feedback.</p>
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900">
                What does this doctor do particularly well?
              </label>
              <textarea
                rows={4}
                value={strengths}
                onChange={(e) => setStrengths(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                placeholder="Share specific examples of positive behaviors or actions..."
              />
            </div>

            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-900">
                Are there any areas where this doctor could improve or develop?
              </label>
              <textarea
                rows={4}
                value={improvements}
                onChange={(e) => setImprovements(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 focus:ring-2 focus:ring-teal-500 focus:border-teal-500 resize-none"
                placeholder="Constructive feedback for future growth..."
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="pt-6">
            <button
              type="submit"
              disabled={!isFormValid || isSubmitting}
              className={`w-full py-4 px-6 rounded-xl text-white font-semibold text-lg transition-all shadow-md
                ${(!isFormValid || isSubmitting) 
                  ? 'bg-teal-300 cursor-not-allowed' 
                  : 'bg-teal-600 hover:bg-teal-700 hover:shadow-lg active:transform active:scale-95'
                }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Anonymous Feedback'}
            </button>
            {!isFormValid && (
              <p className="text-center text-sm text-gray-500 mt-3">
                Please answer all required (*) questions to submit.
              </p>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}