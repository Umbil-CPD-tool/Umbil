# Web → Mobile section port plan

## Can we just copy website code?

**No — not as-is.** The website is Next.js (DOM). The app is React Native.

**Reuse:** business logic, labels, API/Supabase, section order.  
**Rewrite:** UI (`div` → `View`) and charts.

---

## Sections

| # | Section | Web source | Mobile target | Status |
|---|---------|------------|---------------|--------|
| 1 | **CPD Analytics** | `src/app/cpd/analytics/page.tsx` | `apps/mobile/app/(app)/cpd/analytics.tsx` | ✅ Done |
| 2 | **CPD Log list** | `src/app/cpd/page.tsx` + layout tabs | `apps/mobile/app/(app)/(drawer)/cpd.tsx` | ✅ Done |
| 3 | **Capture learning** | capture-learning + ReflectionModal | `apps/mobile/app/(app)/cpd/capture.tsx` | ✅ Done |
| 4 | **Ask / Dashboard chat** | `src/components/home/*` | `chat.tsx` + AskBar + bubbles | ✅ Done |
| 5 | **Tools modal** | `src/components/tools/*` | `apps/mobile/app/(app)/tools.tsx` | ✅ Done |
| 6 | **Profile** | `src/app/profile/page.tsx` | `apps/mobile/app/(app)/(drawer)/account.tsx` | ✅ Done |
| 7 | **Settings** | `src/app/settings/*` | `apps/mobile/app/(app)/settings.tsx` | ✅ Done |
| 8 | **PDP** | `src/app/pdp` | Portfolio tab `pdp` | ✅ Done |
| 9 | **PSQ / MSF** | `src/components/psq/*` | Portfolio + `psq/[id]` + `msf/[id]` | ✅ Done |
| 10 | **Pro / billing** | `src/app/pro` | `apps/mobile/app/(app)/pro.tsx` | ✅ Done |

**Still web-only (deep-link, by design):** marketing/SEO landing pages, admin RAG console, public `/s/*` `/m/*` respondent forms (filled by patients/colleagues on their own devices, not in the clinician's app).

**Now done on mobile too:** CPD PDF export (`expo-print` + `expo-sharing`, native equivalent of web's zip), patient handout print (native print dialog), in-app PSQ/MSF result charts + MSF AI summary, QR code + in-app Kiosk Mode (WebView), real speech-to-text mic dictation (`expo-speech-recognition` — requires a rebuilt EAS development build before it's testable on-device, see `README.md`).

---

## Parallel agents

Yes — Cursor can run several agents at once (Task tool). We used that here: separate agents owned different files so they didn’t conflict, then typecheck merged the result.
