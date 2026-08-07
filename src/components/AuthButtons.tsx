// src/components/AuthButtons.tsx
"use client";

import { useUserEmail } from "@/hooks/useUserEmail";
// Removed unnecessary imports: useEffect, useState, getMyProfile, Profile, supabase 
// since we now rely on the hook and moved sign-out to MobileNav.

export default function AuthButtons() {
  const { email, loading } = useUserEmail();

  if (loading) {
    // Show nothing/reserve space while waiting for Supabase to hydrate the session
    return <div className="user-profile" style={{ width: '80px' }}></div>; 
  }

  if (email) {
    // If signed in, return an empty fragment. The Sign out button is in MobileNav.
    return <></>; 
  }

  // If loading is false and no email is present, show the Sign in button
  return (
    <div className="user-profile">
      <a className="btn btn--primary" href="/auth">Sign in</a>
    </div>
  );
}