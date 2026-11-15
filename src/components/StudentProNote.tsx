"use client";

import Link from "next/link";

type StudentProNoteProps = {
  signedIn?: boolean;
  onNavigate?: () => void;
};

export const StudentProNote = ({ signedIn = true, onNavigate }: StudentProNoteProps) => {
  const href = signedIn ? "/pro" : "/auth?mode=signup&next=%2Fpro";

  return (
    <p className="text-sm text-[var(--umbil-muted)] mb-8">
      Students with a .ac.uk email can use the{" "}
      <Link
        href={href}
        onClick={onNavigate}
        className="font-bold underline text-[var(--umbil-brand-teal)]"
      >
        £4.99/month student plan
      </Link>
      .
    </p>
  );
};
