# Mobile feature parity checklist

Logged-in product features from the web app, tracked for Expo.  
Web-only surfaces (marketing, admin, public `/s/*` and `/m/*` forms) stay in the browser.

---

## Auth & shell
- [x] Email/password sign-in
- [x] Sign-up (name, grade, terms)
- [x] OTP verification
- [x] Forgot password
- [x] Side menu (Learning Log, Profile, PDP, Appraisals, history)
- [x] Umbil logo → home / new chat
- [x] Live CPD streak in header + side menu
- [x] Inter font + web brand colours / tagline / logo asset
- [x] Bottom tabs labelled Ask / Learning Log / Appraisals / My Profile
- [x] Dark / light theme
- [x] Quick tour (9 steps tailored to app nav — Ask, styles, Tools, Capture, Reflect/Translate, PDP goals, Analytics, Appraisals)
- [x] Header shows "Upgrade" (free) vs "Umbil Pro" (subscribed) — matches web copy/icon logic

## Chat
- [x] Streaming ask (`/api/ask`)
- [x] Answer styles (Standard / Clinic / Deep Dive)
- [x] New chat + history reopen
- [x] Capture learning from answer
- [x] Copy / share / report answer
- [x] Markdown rendering (tables, lists)
- [x] Regenerate last answer
- [x] Weekend weekly-summary popup on chat
- [x] Translate + inline refine ("Done"/edit) on tool answers inside chat, matching Tools screen
- [x] Digital Triage safety chips (templates matched / detected context / high-risk wording) in chat + Tools screen
- [x] Real speech-to-text mic (expo-speech-recognition, requires a rebuilt dev client — see README)

## Tools
- [x] All 6 workflow tools via `/api/tools`
- [x] Pro limit handling
- [x] Tool history restore
- [x] Translate handout + language prefs
- [x] Inline edit before copy
- [x] Print patient handout (native print dialog via `expo-print`)

## CPD / Learning log
- [x] List, search, detail, delete
- [x] Capture + AI reflection
- [x] Analytics (text stats + bar charts)
- [x] CSV export
- [x] PDF export (multi-page, GMC-domain-grouped, via `expo-print` + `expo-sharing`)

## Portfolio
- [x] PDP CRUD
- [x] PSQ / MSF cycles, share links, MSF invite
- [x] Custom PSQ/MSF questions
- [x] In-app results charts — GMC domain bar chart, response-role/appointment-type breakdown, overview stats (once anonymity threshold met); web link kept as secondary option
- [x] AI appraisal summary in-app (MSF only — calls existing `/api/public/msf/ai-summary`, shows previously-generated summary immediately; PSQ has no AI-summary backend on web either)
- [x] QR code ("Scan to Start", save/share) + in-app Kiosk Mode (full-screen WebView on `?kiosk=true`, locked navigation, long-press exit)

## Profile & account
- [x] Profile edit (name, grade, academic email)
- [x] Memory & Custom Instructions UI
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
