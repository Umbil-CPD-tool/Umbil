"use client";

import { useState, useTransition } from "react";

type DeletePostButtonProps = {
  id: string;
  action: (id: string) => Promise<void>;
};

export default function DeletePostButton({ id, action }: DeletePostButtonProps) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const handleDelete = () => {
    if (!confirm("Are you sure you want to delete this post? This action can be recovered from the database.")) {
      return;
    }

    startTransition(async () => {
      try {
        await action(id);
      } catch (err: any) {
        setError(err?.message ?? "Unable to delete post.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        className="btn btn--outline"
        onClick={handleDelete}
        disabled={isPending}
        style={{ color: "#dc2626", borderColor: "#dc2626" }}
      >
        {isPending ? "Deleting..." : "Delete post"}
      </button>
      {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
    </>
  );
}
