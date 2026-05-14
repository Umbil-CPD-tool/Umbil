import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Capture Learning',
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}