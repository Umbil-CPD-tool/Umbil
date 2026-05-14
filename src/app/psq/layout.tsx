// app/someClientPage/layout.tsx  ← no "use client" needed here
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'PSQ',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}