import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Umbil Pro',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}