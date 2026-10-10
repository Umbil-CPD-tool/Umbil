"use client";

import Link from "next/link";

const PROFILE_PATH = "/profile?student=1";

type StudentProNoteProps = {
  signedIn?: boolean;
  onNavigate?: () => void;
};

export const StudentProNote = ({ signedIn = true, onNavigate }: StudentProNoteProps) => {
  const href = signedIn
    ? PROFILE_PATH
    : `/auth?mode=signup&next=${encodeURIComponent(PROFILE_PATH)}`;

  return (
    <p className="text-sm text-[var(--umbil-muted)] mb-8">
      Students can{" "}
      <Link
        href={href}
        onClick={onNavigate}
        className="font-bold underline text-[var(--umbil-brand-teal)]"
      >
        add a .ac.uk email
      </Link>
      {" "}to get Pro free.
    </p>
  );
};
