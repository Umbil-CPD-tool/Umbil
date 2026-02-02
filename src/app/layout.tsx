import type { Metadata } from "next";
import { Inter, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

// 1. Load the new "Sleek" font (Inter)
const inter = Inter({ 
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

// --- SEO METADATA ---
export const metadata: Metadata = {
  metadataBase: new URL("https://umbil.co.uk"),
  title: "Umbil | Clinical Workflow Assistant & Referral Writer",
  description: "Clinical workflow optimisation tool. Paste rough notes, get consultant-ready documents.",
  keywords: [
    "Umbil AI",
    "GP referral writer",
    "clinical safety netting tool",
    "SBAR generator",
    "medical scribe UK",
    "clinical decision support",
    "GMC reflection generator",
  ],
  openGraph: {
    title: "Umbil | Clinical Workflow Assistant",
    description: "Clinical workflow optimisation tool",
    url: "https://umbil.co.uk",
    siteName: "Umbil",
    locale: "en_GB",
    type: "website",
    images: [
      {
        url: "/umbil_logo.png.png",
        width: 1200,
        height: 630,
        alt: "Umbil Clinical Workflow Tool",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Umbil - The Clinical Workflow Assistant",
    description: "Clinical workflow optimisation tool",
    images: ["/umbil_logo.png.png"],
  },
  verification: {
    google: "Cq148L5NeSJqEJnPluhkDGCJhazxBkdFt5H3VrXqvI4",
  }
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        suppressHydrationWarning
        // 2. Apply the Inter font variable first
        className={`${inter.variable} ${geistSans.variable} ${geistMono.variable} font-sans antialiased bg-slate-950 text-slate-100 selection:bg-teal-500/30 selection:text-teal-50`}
      >
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}