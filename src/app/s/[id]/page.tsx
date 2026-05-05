// src/app/s/[id]/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { PSQ_QUESTIONS, PSQ_INTRO, PSQ_SCALE } from '@/lib/psq-questions';
import { Check, ChevronRight, AlertCircle, ShieldCheck, RefreshCw } from 'lucide-react';

export default function PublicSurveyPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const id = params?.id as string;
  const isKiosk = searchParams.get('kiosk') === 'true';

  const [loading, setLoading] = useState(true);
  const [surveyValid, setSurveyValid] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  const [answers, setAnswers] = useState<Record<string, any>>({});
  const [submitting, setSubmitting] = useState(false);
  
  // Kiosk Auto-Refresh State
  const [timeLeft, setTimeLeft] = useState(5);

  useEffect(() => {
    async function checkSurvey() {
      if (!id) return;
      
      try {
        const res = await fetch(`/api/public/psq?id=${id}`, { cache: 'no-store' });
        
        if (res.ok) {
            const data = await res.json();
            setSurveyValid(true);
            if (data.custom_questions) setCustomQuestions(data.custom_questions);
        } else {
            setSurveyValid(false);
        }
      } catch (error) {
          console.error("Connection error:", error);
          setSurveyValid(false);
      } finally {
          setLoading(false);
      }
    }
    checkSurvey();
  }, [id]);

  // Handle Kiosk Countdown
  useEffect(() => {
    if (completed && isKiosk) {
      const timer = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            clearInterval(timer);
            window.location.reload(); // Hard reload to clear state for next patient
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    }
  }, [completed, isKiosk]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    // Validation: Only score Likert questions are mandatory
    const missing = PSQ_QUESTIONS.filter(q => q.type === 'likert' && !answers[q.id]);
    if (missing.length > 0) {
        alert("Please answer all scored questions.");
        setSubmitting(false);
        return;
    }

    try {
        const res = await fetch('/api/public/psq', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                survey_id: id,
                answers: answers
            })
        });

        if (res.ok) {
            setCompleted(true);
            window.scrollTo(0, 0);
        } else {
            throw new Error("Submission failed");
        }
    } catch (error) {
        alert('Error submitting. Please try again.');
        setSubmitting(false);
    }
  };

  const setAnswer = (qId: string, val: any) => {
    setAnswers(prev => ({ ...prev, [qId]: val }));
  };

  if (loading) return <div className="min-h-screen bg-white" />;

  if (!surveyValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 text-center">
        <div>
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900">Survey Not Found</h1>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white text-center">
        <div className="max-w-md w-full">
           <div className="w-16 h-16 bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-6">
             <Check size={32} strokeWidth={3} />
           </div>
           <h2 className="text-2xl font-bold text-gray-900 mb-4">Thank you</h2>
           <p className="text-gray-600 mb-8">Your feedback has been recorded anonymously.</p>
           
           {isKiosk && (
             <div className="bg-gray-50 rounded-lg p-4 flex items-center justify-center gap-3 text-sm text-gray-500">
                <RefreshCw size={16} className="animate-spin" />
                Next patient in {timeLeft}s...
             </div>
           )}
        </div>
      </div>
    );
  }

  if (!started) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
            {/* Global Override for Scrolling Issue */}
            <style jsx global>{`
                html, body { overflow-y: auto !important; height: auto !important; }
            `}</style>
            
            <div className="max-w-lg w-full bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <h1 className="text-2xl font-bold text-gray-900 mb-4">{PSQ_INTRO.title}</h1>
                <p className="text-gray-600 mb-8 leading-relaxed">{PSQ_INTRO.body}</p>
                
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--umbil-brand-teal)] bg-[var(--umbil-brand-teal)]/10 p-3 rounded-lg mb-8 border border-[var(--umbil-brand-teal)]/20">
                    <ShieldCheck size={16}/> 100% Anonymous • No Personal Data
                </div>

                <button 
                    onClick={() => setStarted(true)}
                    className="w-full py-4 bg-[var(--umbil-brand-teal)] text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                >
                    Start Feedback
                </button>
            </div>
        </div>
    );
  }

  // Combine Core Questions with Optional Custom Questions
  // Custom questions are inserted after Likert (index 9) but before Free Text
  const renderQuestions = [
      ...PSQ_QUESTIONS.slice(0, 10), // Likert 1-10
      ...customQuestions.map((text, i) => ({
          id: `custom_${i}`,
          text,
          type: 'text' as const, // Re-using text input type
          domain: 'Custom',
          isOptional: true
      })).filter(q => q.text.trim().length > 0),
      ...PSQ_QUESTIONS.slice(10) // Rest of questions
  ];

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      {/* Global Override for Scrolling Issue */}
      <style jsx global>{`
          html, body { overflow-y: auto !important; height: auto !important; }
      `}</style>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8 pb-20">
        
        {/* QUESTIONS LOOP */}
        {renderQuestions.map((q, idx) => (
            <div key={q.id} className="bg-white p-6 sm:p-8 rounded-xl border border-gray-200 shadow-sm relative overflow-hidden">
                {q.isOptional && (
                    <div className="absolute top-0 right-0 bg-gray-100 text-gray-500 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide">
                        Optional
                    </div>
                )}
                
                <div className="mb-6">
                    <span className="text-xs font-bold text-gray-400 uppercase tracking-wide">Question {idx + 1}</span>
                    <h3 className="text-lg font-semibold text-gray-900 mt-1">{q.text}</h3>
                </div>

                {/* LIKERT */}
                {q.type === 'likert' && (
                    <div className="space-y-3">
                        {PSQ_SCALE.map((opt) => (
                            <label key={opt.value} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors">
                                <input 
                                    type="radio" 
                                    name={q.id} 
                                    value={opt.value}
                                    checked={answers[q.id] === opt.value}
                                    onChange={() => setAnswer(q.id, opt.value)}
                                    className="w-5 h-5 text-[var(--umbil-brand-teal)] accent-[var(--umbil-brand-teal)]"
                                />
                                <span className="text-gray-700">{opt.label}</span>
                            </label>
                        ))}
                    </div>
                )}

                {/* OPTION */}
                {q.type === 'option' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {q.options?.map((opt) => (
                            <button
                                key={opt}
                                type="button"
                                onClick={() => setAnswer(q.id, opt)}
                                className={`p-4 rounded-lg border text-left transition-all ${answers[q.id] === opt ? 'border-[var(--umbil-brand-teal)] bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)]' : 'border-gray-200 hover:bg-gray-50'}`}
                            >
                                {opt}
                            </button>
                        ))}
                    </div>
                )}

                {/* TEXT (Used for both Free Text & Custom Optional) */}
                {q.type === 'text' && (
                    <div>
                         {!q.isOptional && (
                             <div className="mb-2 text-xs text-amber-600 font-medium flex items-center gap-1">
                                <AlertCircle size={12}/> Please do not include names.
                             </div>
                         )}
                         <textarea 
                            className="w-full p-4 border border-gray-300 rounded-lg h-32 focus:border-[var(--umbil-brand-teal)] outline-none"
                            placeholder={q.isOptional ? "Optional..." : "Type here..."}
                            value={answers[q.id] || ''}
                            onChange={(e) => setAnswer(q.id, e.target.value)}
                        />
                    </div>
                )}
            </div>
        ))}

        <button 
            type="submit" 
            disabled={submitting}
            className={`w-full py-5 bg-[var(--umbil-brand-teal)] text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 ${submitting ? 'opacity-70' : 'hover:opacity-90'}`}
        >
            {submitting ? 'Submitting...' : 'Submit Feedback'} <ChevronRight/>
        </button>

      </form>
    </div>
  );
}