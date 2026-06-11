import { Suspense } from 'react';
import MainWrapper from '@/components/MainWrapper';
import { Metadata } from "next";

export const metadata: Metadata = {
  robots: {
    index: false,
    follow: false, // Prevents Bing from following links on this page
  },
};

export default function DashboardPage() {
  return (
    <Suspense fallback={<div>Loading Dashboard...</div>}>
      <MainWrapper />
    </Suspense>
  );
}