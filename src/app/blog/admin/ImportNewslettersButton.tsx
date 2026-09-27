"use client";

import { useState, useTransition } from "react";
import { importResendNewsletters, type ResendImportResult } from "./actions";

export const ImportNewslettersButton = () => {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<ResendImportResult | null>(null);

  const onImport = () => {
    startTransition(async () => {
      const nextResult = await importResendNewsletters();
      setResult(nextResult);
    });
  };

  return (
    <div className="flex flex-col items-stretch gap-2 md:items-end">
      <button
        type="button"
        className="btn btn--outline"
        onClick={onImport}
        disabled={isPending}
      >
        {isPending ? "Importing…" : "Import newsletters from Resend"}
      </button>
      {result?.error && (
        <p className="text-sm text-red-600">{result.error}</p>
      )}
      {result && !result.error && (
        <p className="text-sm text-slate-600">
          Found {result.found}. Imported {result.imported} draft{result.imported === 1 ? "" : "s"}
          {result.skipped > 0 ? `, skipped ${result.skipped} already saved.` : "."} Review before publishing.
        </p>
      )}
    </div>
  );
};
