// app/someClientPage/layout.tsx  ← no "use client" needed here
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'My Profile',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}