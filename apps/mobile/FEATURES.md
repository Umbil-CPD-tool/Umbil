# Mobile feature parity checklist

Logged-in product features from the web app, tracked for Expo.  
Web-only surfaces (marketing, admin, public `/s/*` and `/m/*` forms) stay in the browser.

---

## Auth & shell
- [x] Email/password sign-in
- [x] Sign-up (name, grade, terms)
- [x] OTP verification
- [x] Forgot password
- [x] Side drawer (Learning Log, Profile, PDP, Appraisals, history) — swipeable Gemini-style menu, not bottom tabs
- [x] Drawer screens: Ask, Learning Log, Portfolio/Appraisals, My Profile
- [x] Umbil logo → home / new chat
- [x] Live CPD streak in header + side menu
- [x] Inter font + web brand colours / tagline / logo asset
- [x] Dark / light theme (`userInterfaceStyle: automatic` follows the in-app theme)
- [x] Quick tour (9 steps tailored to app nav — Ask, styles, Tools, Capture, Reflect/Translate, PDP goals, Analytics, Appraisals)
- [x] Header shows "Upgrade" (free) vs "Umbil Pro" (subscribed) — matches web copy/icon logic
- [x] Profile completion prompt — added for web parity
- [x] Streak popup — added for web parity
- [x] CPD capture nudge — added for web parity

## Chat
- [x] Streaming ask (`/api/ask`)
- [x] Answer styles (Standard / Clinic / Deep Dive)
- [x] New chat + history reopen
- [x] Capture learning from answer
- [x] Auto `capture_learning` action (intent / `[[ACTION:capture_learning]]`) — added for web parity
- [x] Chat drafts (unfinished Ask input restored) — added for web parity
- [x] Copy / share / report answer
- [x] Share full conversation — added for web parity
- [x] Markdown rendering (tables, lists)
- [x] Regenerate last answer
- [x] Weekend weekly-summary popup on chat
- [x] Translate + inline refine ("Done"/edit) on tool answers inside chat, matching Tools screen
- [x] Digital Triage safety chips (templates matched / detected context / high-risk wording) in chat + Tools screen
- [x] Real speech-to-text mic (expo-speech-recognition, requires a rebuilt native client — see README)

## Tools
- [x] All 6 workflow tools via `/api/tools`
- [x] Pro limit handling
- [x] Tool history restore
- [x] Tool drafts (unfinished form restored) — added for web parity
- [x] Translate handout + language prefs
- [x] Inline edit before copy
- [x] Print patient handout (native print dialog via `expo-print`)

## CPD / Learning log
- [x] List, search, detail, delete
- [x] Capture + AI reflection
- [x] CPD markdown (entry body rendered as markdown) — added for web parity
- [x] Analytics (text stats + bar charts)
- [x] CSV export
- [x] PDF export (multi-page, GMC-domain-grouped, via `expo-print` + `expo-sharing`)
- [x] Select entries then export PDF — added for web parity

## Portfolio
- [x] PDP CRUD
- [x] PSQ / MSF cycles, share links, MSF invite
- [x] Invite copy matches web — added for web parity
- [x] Portfolio `?tab=` deep links (PDP / PSQ / MSF) — added for web parity
- [x] Custom PSQ/MSF questions
- [x] In-app results charts — GMC domain bar chart, response-role/appointment-type breakdown, overview stats (once anonymity threshold met); web link kept as secondary option
- [x] AI appraisal summary in-app (MSF only — calls existing `/api/public/msf/ai-summary`, shows previously-generated summary immediately; PSQ has no AI-summary backend on web either)
- [x] QR code ("Scan to Start", save/share) + in-app Kiosk Mode (full-screen WebView on `?kiosk=true`, locked navigation, long-press exit)

## Profile & account
- [x] Profile edit (name, grade, academic email)
- [x] Memory & Custom Instructions UI
- [x] Memory save protection (guards against accidental overwrite) — added for web parity
- [x] Weekly summary card on Account
- [x] Current + longest streak on Account
- [x] Streak heatmap calendar
- [x] Comms prefs, legal links, delete account
- [x] Pro checkout + billing portal (system browser)
- [x] Change password while signed in
- [x] Contact support screen (in-app) — FAQ link, status indicator, two-step feedback flow, dark mode
- [x] Pro page — Free/Pro/Team tiers, post-purchase stats dashboard (Questions/Tools/Learning), banners
- [x] Weekly Summary loads reliably (fixed session-race bug + `EXPO_PUBLIC_API_URL` pointed at production instead of `localhost:3000`; retry button shows the real error if it ever fails again)

## Explicitly out of scope (mobile)
- [ ] Face ID / biometrics (not wanted)
- [ ] Marketing / SEO landings 🌐
- [ ] Admin RAG console 🌐
- [ ] Public patient/colleague survey forms 🌐

---

## Store submission (not code)

These are human / console tasks — they are not solved by this repo and must not be invented in config files:

1. Apple Developer Program + Google Play Console accounts (and org identity docs).
2. `eas login` then `eas init` in `apps/mobile` so EAS writes a real `extra.eas.projectId` into `app.json` (do not paste a fake UUID).
3. Store screenshots and listing copy (iPhone, Android phone; tablet optional).
4. Privacy policy URL in both consoles: `https://umbil.ai/privacy`.
5. Play Console Data safety form (account data, health-adjacent clinical notes stored for the signed-in user, no advertising SDK).
6. App Store Connect export compliance: confirm the encryption question. This app uses standard HTTPS plus OS keychain (`expo-secure-store`) and typical local AES for session storage — generally treated as exempt, but a human must confirm in App Store Connect. `ITSAppUsesNonExemptEncryption` is set `false` in `app.json` to match that intent.
7. Production env on EAS (`EXPO_PUBLIC_SUPABASE_URL`, `EXPO_PUBLIC_SUPABASE_ANON_KEY`, `EXPO_PUBLIC_API_URL=https://umbil.ai`) via secrets / dashboard — never commit `.env`.
8. Apple App Site Association (AASA) and Android Digital Asset Links if relying on `umbil.ai` universal / app links for `/auth`.
9. No push notifications in v1 — do not declare FCM/APNs in store forms until that ships.
