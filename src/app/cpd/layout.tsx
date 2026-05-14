// src/app/cpd/layout.tsx
// "use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'CPD',
}

// Simple tab-like navigation component
function CpdNav() {
  const pathname = usePathname();
  
  const navItems = [
    { href: "/cpd", label: "My CPD Log" },
    { href: "/cpd/analytics", label: "Analytics" },
  ];

  return (
    <div style={{ 
      display: 'flex', 
      gap: '8px', 
      marginBottom: '24px', 
      borderBottom: '1px solid var(--umbil-divider)',
    }}>
      {navItems.map(item => {
        const isActive = pathname === item.href;
        return (
          <Link 
            key={item.href} 
            href={item.href}
            style={{
              padding: '12px 16px',
              fontWeight: isActive ? 600 : 500,
              color: isActive ? 'var(--umbil-brand-teal)' : 'var(--umbil-muted)',
              borderBottom: isActive ? '3px solid var(--umbil-brand-teal)' : '3px solid transparent',
              textDecoration: 'none',
              transform: 'translateY(1px)', // Aligns with the bottom border
            }}
          >
            {item.label}
          </Link>
        );
      })}
    </div>
  );
}


export default function CpdLayout({ children }: { children: React.ReactNode }) {
  return (
    <section className="main-content">
      <div className="container">
        <h2 style={{ marginBottom: 16 }}>My Professional Development</h2>
        
        {/* Add the new navigation bar */}
        <CpdNav />
        
        {/* Render the active page (either page.tsx or analytics/page.tsx) */}
        {children}
      </div>
    </section>
  );
}