// src/app/psq/page.tsx
'use client';

import { useState } from 'react';
import { Users, MessageSquare } from 'lucide-react';
import { useUserEmail } from "@/hooks/useUser";
import PsqTab from './components/PsqTab';
import MsfTab from './components/MsfTab';

export default function AppraisalsHub() {
  const [activeTab, setActiveTab] = useState<'psq' | 'msf'>('psq');
  const { loading: userLoading } = useUserEmail();

  if (userLoading) return null;
  
  return (
    <section className="bg-[var(--umbil-bg)] min-h-screen">
      <div className="container mx-auto max-w-[1000px] px-5 py-8 pb-20">
        
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
        {activeTab === 'psq' && <PsqTab />}
        {activeTab === 'msf' && <MsfTab />}

      </div>
    </section>
  );
}