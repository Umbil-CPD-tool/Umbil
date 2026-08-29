# Knowledge-base ingestion (archived)

This UI and API were removed from the live Next.js App Router so they are not
deployed. The code is kept here so it can be restored without a rewrite.

## Why it is archived

The live `/admin` page only gated access in the browser. `/api/admin/ingestion`
had no server authentication, so it was a public write path into the knowledge
base.

## Restore (local / controlled use only)

1. Copy `page.tsx` to `src/app/admin/page.tsx`
2. Copy `layout.tsx` to `src/app/admin/layout.tsx`
3. Copy `api-route.ts` to `src/app/api/admin/ingestion/route.ts`
4. **Before going live**, add real server auth on the API (session + `is_admin`
   or a server-only secret). Do not ship a password in client JavaScript.
5. Confirm `INGESTION_PROMPT` still exists in `src/lib/prompts.ts`
