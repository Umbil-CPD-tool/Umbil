// src/app/psq/page.tsx
'use client';

import { useState, Suspense, useRef } from 'react';
import { Users, MessageSquare, Plus } from 'lucide-react';
import { useUserEmail } from "@/hooks/useUser";
import PsqTab from './components/PsqTab';
import MsfTab from './components/MsfTab';
import { useSearchParams } from 'next/navigation';

function AppraisalsHubContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get('tab');
  const initialTab = (tabParam === 'msf' || tabParam === 'psq') ? tabParam : 'psq';

  const [activeTab, setActiveTab] = useState<'psq' | 'msf'>(initialTab);
  const { loading: userLoading } = useUserEmail();
  
  // Refs to trigger modals in child components
  const psqTabRef = useRef<{ openModal: () => void } | null>(null);
  const msfTabRef = useRef<{ openModal: () => void } | null>(null);

  if (userLoading) return null;
  
  return (
    <div className="container mx-auto max-w-[1000px] px-5 py-8 pb-20">
      
      {/* Unified Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-8">
          <div>
              <h1 className="text-3xl font-bold text-[var(--umbil-text)] mb-2">Appraisals Hub</h1>
              <p className="text-[var(--umbil-muted)] text-lg">
                {activeTab === 'psq' 
                  ? "Manage your patient (PSQ) feedback cycles for revalidation."
                  : "Gather anonymous feedback from colleagues (MSF) for your appraisal."
                }
              </p>
          </div>
          <button 
            onClick={() => activeTab === 'psq' ? psqTabRef.current?.openModal() : msfTabRef.current?.openModal()} 
            className="btn btn--primary flex items-center gap-2 px-6 py-3 shadow-lg shadow-teal-500/20 whitespace-nowrap"
          >
              <Plus size={20} /> New {activeTab === 'psq' ? 'PSQ' : 'MSF'} Cycle
          </button>
      </div>

      {/* Tab Navigation Menu */}
      <div className="flex bg-[var(--umbil-surface)] border border-[var(--umbil-divider)] rounded-xl p-1 mb-8 w-full max-w-md">
          <button 
              onClick={() => setActiveTab('psq')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 ${activeTab === 'psq' ? 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] shadow-sm' : 'text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] hover:bg-gray-50/50'}`}
          >
              <Users size={18} />
              My PSQ
          </button>
          <button 
              onClick={() => setActiveTab('msf')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg font-semibold transition-all duration-200 ${activeTab === 'msf' ? 'bg-[var(--umbil-hover-bg)] text-[var(--umbil-brand-teal)] shadow-sm' : 'text-[var(--umbil-muted)] hover:text-[var(--umbil-text)] hover:bg-gray-50/50'}`}
          >
              <MessageSquare size={18} />
              My MSF
          </button>
      </div>

      {/* Tab Content Components */}
      {activeTab === 'psq' && <PsqTab onRef={(ref) => (psqTabRef.current = ref)} />}
      {activeTab === 'msf' && <MsfTab onRef={(ref) => (msfTabRef.current = ref)} />}

    </div>
  );
}

export default function AppraisalsHub() {
  return (
    <section className="bg-[var(--umbil-bg)] min-h-screen">
      <Suspense fallback={<div className="p-10 flex justify-center"><div className="animate-spin w-8 h-8 border-4 border-teal-500 rounded-full border-t-transparent"></div></div>}>
        <AppraisalsHubContent />
      </Suspense>
    </section>
  );
}