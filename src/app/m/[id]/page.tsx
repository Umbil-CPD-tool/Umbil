'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MSF_QUESTIONS, MSF_ROLES } from '@/lib/msf-questions';
import { Check, ChevronRight, AlertCircle, ShieldCheck } from 'lucide-react';

const MSF_INTRO = {
  title: "Colleague Multi-Source Feedback",
  body: "Thank you for taking the time to provide feedback for this doctor. Your responses are 100% anonymous and will be used solely for professional development and GMC appraisal purposes. Please do not include any patient-identifiable data."
};

const MSF_SCALE = [
  { value: 5, label: "Outstanding" },
  { value: 4, label: "Good" },
  { value: 3, label: "Satisfactory" },
  { value: 2, label: "Below Expectations" },
  { value: 1, label: "Poor" },
  { value: 0, label: "Unable to comment" },
];

const FREE_TEXT_QUESTIONS = [
  { id: 'strengths', label: "What are this doctor’s greatest strengths?" },
  { id: 'example', label: "Please provide an example of something this doctor does particularly well." },
  { id: 'improve', label: "Are there any areas where this doctor could further develop or improve?" },
  { id: 'additional', label: "Any additional comments?" }
];

export default function PublicMsfPage() {
  const params = useParams();
  const id = params?.id as string;

  const [loading, setLoading] = useState(true);
  const [surveyValid, setSurveyValid] = useState(false);
  const [customQuestions, setCustomQuestions] = useState<string[]>([]);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  
  const [roleType, setRoleType] = useState<string>('');
  const [scores, setScores] = useState<Record<string, any>>({});
  const [freeText, setFreeText] = useState({ strengths: '', example: '', improve: '', additional: '' });
  const [submitting, setSubmitting] = useState(false);
  
  useEffect(() => {
    async function checkSurvey() {
      if (!id) return;
      
      try {
        const res = await fetch(`/api/public/msf?id=${id}`, { cache: 'no-store' });
        
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    if (!roleType) {
        alert("Please select your professional role before submitting.");
        setSubmitting(false);
        return;
    }

    const missing = MSF_QUESTIONS.filter(q => scores[q.id] === undefined);
    if (missing.length > 0) {
        alert("Please provide a rating (or select 'Unable to comment') for all standard questions.");
        setSubmitting(false);
        return;
    }

    try {
        const res = await fetch('/api/public/msf', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                cycle_id: id,
                role_type: roleType,
                scores: scores,
                strengths_text: freeText.strengths,
                example_text: freeText.example,
                improvements_text: freeText.improve,
                additional_comments: freeText.additional
            })
        });

        if (res.ok) {
            setCompleted(true);
            window.scrollTo(0, 0);
        } else {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.error || "Submission failed");
        }
    } catch (error: any) {
        alert(`Error: ${error.message}`);
        setSubmitting(false);
    }
  };

  const setScore = (qId: string, val: any) => {
    setScores(prev => ({ ...prev, [qId]: val }));
  };

  const setFreeTextInput = (field: keyof typeof freeText, val: string) => {
    setFreeText(prev => ({ ...prev, [field]: val }));
  };

  if (loading) return <div className="min-h-screen bg-white dark:bg-zinc-950" />;

  if (!surveyValid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50 dark:bg-zinc-950 text-center">
        <div>
          <AlertCircle className="w-12 h-12 text-gray-400 dark:text-zinc-600 mx-auto mb-4" />
          <h1 className="text-lg font-bold text-gray-900 dark:text-zinc-100">Feedback Cycle Not Found</h1>
          <p className="text-gray-500 mt-2">This cycle may have been closed by the clinician.</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6 bg-white dark:bg-zinc-950 text-center">
        <div className="max-w-md w-full">
           <div className="w-16 h-16 bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] rounded-full flex items-center justify-center mx-auto mb-6">
             <Check size={32} strokeWidth={3} />
           </div>
           <h2 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-4">Thank you</h2>
           <p className="text-gray-600 dark:text-zinc-400 mb-8">Your feedback has been securely and anonymously recorded for this appraisal cycle.</p>
        </div>
      </div>
    );
  }

  if (!started) {
    return (
        <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 flex items-center justify-center p-4">
            <style jsx global>{`
                html, body { overflow-y: auto !important; height: auto !important; background-color: #f9fafb; }
                @media (prefers-color-scheme: dark) { html, body { background-color: #09090b; } }
            `}</style>
            
            <div className="max-w-lg w-full bg-white dark:bg-zinc-900 rounded-xl shadow-sm border border-gray-200 dark:border-zinc-800 p-8 text-center transition-colors">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100 mb-4">{MSF_INTRO.title}</h1>
                <p className="text-gray-600 dark:text-zinc-400 mb-8 leading-relaxed">{MSF_INTRO.body}</p>
                
                <div className="flex items-center justify-center gap-2 text-sm text-[var(--umbil-brand-teal)] bg-[var(--umbil-brand-teal)]/10 p-3 rounded-lg mb-8 border border-[var(--umbil-brand-teal)]/20">
                    <ShieldCheck size={16}/> 100% Anonymous • No Traceable Data
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

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 py-12 px-4 transition-colors">
      <style jsx global>{`
          html, body { overflow-y: auto !important; height: auto !important; background-color: #f9fafb; }
          @media (prefers-color-scheme: dark) { html, body { background-color: #09090b; } }
      `}</style>

      <form onSubmit={handleSubmit} className="max-w-2xl mx-auto space-y-8 pb-20">
        
        {/* ROLE SELECTION (MANDATORY) */}
        <div className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-xl border border-[var(--umbil-brand-teal)] dark:border-[var(--umbil-brand-teal)] shadow-[0_0_15px_rgba(31,184,205,0.1)] transition-colors">
            <div className="mb-6">
                <span className="text-xs font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wide">Required</span>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mt-1">What is your professional role?</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MSF_ROLES.map((role) => (
                    <button
                        key={role}
                        type="button"
                        onClick={() => setRoleType(role)}
                        className={`p-4 rounded-lg border text-left transition-all ${roleType === role ? 'border-[var(--umbil-brand-teal)] bg-[var(--umbil-brand-teal)]/10 text-[var(--umbil-brand-teal)] dark:bg-[var(--umbil-brand-teal)]/20' : 'border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 text-gray-700 dark:text-zinc-300'}`}
                    >
                        {role}
                    </button>
                ))}
            </div>
        </div>

        {/* LIKERT QUESTIONS */}
        {MSF_QUESTIONS.map((q, idx) => (
            <div key={q.id} className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm transition-colors">
                <div className="mb-6">
                    <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Question {idx + 1}</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mt-1">{q.text}</h3>
                </div>
                <div className="space-y-3">
                    {MSF_SCALE.map((opt) => (
                        <label key={opt.value} className="flex items-center gap-4 p-4 rounded-lg border border-gray-100 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/50 cursor-pointer transition-colors">
                            <input 
                                type="radio" 
                                name={q.id} 
                                value={opt.value}
                                checked={scores[q.id] === opt.value}
                                onChange={() => setScore(q.id, opt.value)}
                                className="w-5 h-5 text-[var(--umbil-brand-teal)] accent-[var(--umbil-brand-teal)]"
                            />
                            <span className="text-gray-700 dark:text-zinc-300">{opt.label}</span>
                        </label>
                    ))}
                </div>
            </div>
        ))}

        {/* CUSTOM QUESTIONS (OPTIONAL) */}
        {customQuestions.map((qText, idx) => {
            const qId = `custom_${idx}`;
            return (
                <div key={qId} className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm relative overflow-hidden transition-colors">
                    <div className="absolute top-0 right-0 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide">
                        Optional
                    </div>
                    <div className="mb-6">
                        <span className="text-xs font-bold text-[var(--umbil-brand-teal)] uppercase tracking-wide">Practice-Specific Question</span>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mt-1">{qText}</h3>
                    </div>
                    <div>
                        <textarea 
                            className="w-full p-4 bg-transparent dark:bg-zinc-900 text-gray-900 dark:text-white border border-gray-300 dark:border-zinc-700 rounded-lg h-32 focus:border-[var(--umbil-brand-teal)] dark:focus:border-[var(--umbil-brand-teal)] outline-none transition-colors"
                            placeholder="Optional..."
                            value={scores[qId] || ''}
                            onChange={(e) => setScore(qId, e.target.value)}
                        />
                    </div>
                </div>
            );
        })}

        {/* FREE TEXT QUESTIONS (OPTIONAL) */}
        {FREE_TEXT_QUESTIONS.map((q) => (
            <div key={q.id} className="bg-white dark:bg-zinc-900 p-6 sm:p-8 rounded-xl border border-gray-200 dark:border-zinc-800 shadow-sm relative overflow-hidden transition-colors">
                <div className="absolute top-0 right-0 bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 text-[10px] font-bold px-3 py-1 rounded-bl-lg uppercase tracking-wide">
                    Optional
                </div>
                <div className="mb-6">
                    <span className="text-xs font-bold text-gray-400 dark:text-zinc-500 uppercase tracking-wide">Written Feedback</span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-zinc-100 mt-1">{q.label}</h3>
                </div>
                <div>
                     <div className="mb-2 text-xs text-amber-600 dark:text-amber-500 font-medium flex items-center gap-1">
                        <AlertCircle size={12}/> Please do not include any patient names or identifiers.
                     </div>
                     <textarea 
                        className="w-full p-4 bg-transparent dark:bg-zinc-900 text-gray-900 dark:text-white border border-gray-300 dark:border-zinc-700 rounded-lg h-32 focus:border-[var(--umbil-brand-teal)] dark:focus:border-[var(--umbil-brand-teal)] outline-none transition-colors"
                        placeholder="Optional..."
                        value={freeText[q.id as keyof typeof freeText]}
                        onChange={(e) => setFreeTextInput(q.id as keyof typeof freeText, e.target.value)}
                    />
                </div>
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