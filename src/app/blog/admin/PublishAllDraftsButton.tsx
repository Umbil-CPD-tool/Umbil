"use client";

import { useState, useTransition } from "react";
import { publishAllDrafts } from "./actions";

export const PublishAllDraftsButton = () => {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<{ published: number; error?: string } | null>(null);

  const onPublish = () => {
    const confirmed = window.confirm(
      "Publish every Resend newsletter draft now? Existing slugs and original send dates will be kept."
    );
    if (!confirmed) return;

    startTransition(async () => {
      const nextResult = await publishAllDrafts();
      setResult(nextResult);
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-2 md:items-end">
      <button
        type="button"
        className="btn btn--outline"
        onClick={onPublish}
        disabled={isPending}
      >
        {isPending ? "Publishing…" : "Publish all newsletter drafts"}
      </button>
      {result?.error && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
      {result && !result.error && (
        <p className="text-sm text-slate-600">
          Published {result.published} newsletter{result.published === 1 ? "" : "s"}.
        </p>
      )}
    </div>
  );
};
