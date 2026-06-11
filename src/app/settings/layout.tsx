import { Metadata } from "next";

export const metadata: Metadata = {
  title: 'Settings',
  robots: {
    index: false,
    follow: false, // Prevents Bing from following links on this page
  },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}