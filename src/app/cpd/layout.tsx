// src/app/cpd/layout.tsx
import { Metadata } from 'next'
import CpdLayoutClient from './CpdLayoutClient'

export const metadata: Metadata = {
  title: 'My CPD',
}

export default function CpdLayout({ children }: { children: React.ReactNode }) {
  return <CpdLayoutClient>{children}</CpdLayoutClient>
}