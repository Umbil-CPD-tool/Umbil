# Umbil mobile (Expo)

Native iOS/Android app sharing the same Supabase + `/api/*` backend as the website.

Uses **Expo SDK 54**. Branding matches web: **Inter**, teal `#1fb8cd`, tagline **Your Medical Lifeline**, hero **Smarter medicine starts here.**

Store version is **1.0.0** (`app.json`). There are **no push notifications in v1**.

## Run (Expo Go)

```bash
cd apps/mobile
npm install --legacy-peer-deps
npm start
```

Copy `.env.example` → `.env` first (see below). If you see `failed to download remote update`, update Expo Go and try `npm run start:tunnel`.

Expo Go is fine for UI only. **Dictation will not work in Expo Go** — it needs a development or production native client (see below).

## Env

```bash
cp .env.example .env
```

Fill in the Supabase project URL and **anon (publishable) key** — never the `service_role` secret. For anything other than a local Next.js backend, set:

```
EXPO_PUBLIC_API_URL=https://umbil.ai
```

Do not commit `.env`. The same three `EXPO_PUBLIC_*` values must be set as EAS secrets / environment variables for store builds.

## Expo Development Builds (recommended)

A **development build** is your own Umbil-branded app with native modules (mic dictation, SecureStore, print). `eas.json` already has `development` and `development-device` profiles; `expo-dev-client` is installed.

```bash
# one-time: install EAS CLI and log in
npm i -g eas-cli
eas login

cd apps/mobile
# first time only — writes extra.eas.projectId into app.json (do not invent a UUID)
eas init

# Android APK (install on phone)
eas build --profile development --platform android

# iOS simulator
eas build --profile development --platform ios

# After install, start Metro against the custom client:
npm run start:dev-client
```

> **Mic dictation:** the Ask bar uses `expo-speech-recognition`. It only works in a **development client or production/store build**, never in Expo Go. Rebuild after adding or changing native plugins (`eas build --profile development` or `development-device`).

## Store release

1. `eas login` then `cd apps/mobile && eas init` (creates the EAS project and sets `extra.eas.projectId` — leave `extra` empty until this runs).
2. Copy `.env.example` → `.env` with **production** values (`EXPO_PUBLIC_API_URL=https://umbil.ai`, real Supabase URL + anon key).
3. Set the same variables on EAS for the production profile (`eas secret:create` or the EAS dashboard env UI). Do not put secrets in `eas.json` or `app.json`.
4. Build store binaries:
   ```bash
   eas build --profile production --platform ios
   eas build --profile production --platform android
   ```
   Production Android is an **AAB** (`buildType: app-bundle`). iOS/Android version codes auto-increment (`autoIncrement` + `appVersionSource: remote`).
5. Submit (credentials are collected interactively — do not invent App Store Connect / Play IDs):
   ```bash
   eas submit --profile production --platform ios
   eas submit --profile production --platform android
   ```
6. Store listing: screenshots, privacy URL **https://umbil.ai/privacy**, support email, and account deletion (already in Settings). Complete Play Data safety and the App Store Connect encryption question (HTTPS + OS keychain / typical Expo SecureStore + local AES session — generally exempt; confirm in the console). See [FEATURES.md](./FEATURES.md) for the remaining human tasks (AASA / assetlinks, Apple + Google accounts).

## Feature status

See [FEATURES.md](./FEATURES.md).

## How to test (phones + tablets)

**Expo Go is the right first pass** for layout, login, Ask (typed), Learning Log, Tools (without dictation), PDP, PSQ/MSF, Profile, Settings, and dark mode. Install [Expo Go](https://expo.dev/go) on a physical iPhone and Android. Use an iPad or Android tablet the same way if you have one.

**Expo Go cannot test:** microphone dictation (`expo-speech-recognition`), or a pixel-perfect store binary. For those, use a **development build** (same login as above, then `eas build --profile development-device --platform ios` / `android`).

The app is **portrait-locked**. iPad is supported (`supportsTablet`); Android tablets work in portrait.

### 1. Start Metro

From `apps/mobile` (with `.env` pointing at `EXPO_PUBLIC_API_URL=https://umbil.ai`):

```bash
npm start
```

Scan the QR code with Expo Go (Camera on iOS, Expo Go app on Android). Same Wi‑Fi, or `npm run start:tunnel` if the QR fails.

### 2. What to tap through

On **one iPhone and one Android** (plus a tablet if you have one):

- Welcome → Sign in / Sign up / OTP / Forgot password
- Ask a question, stream, copy/share, Capture learning, streak popup on first log of the day
- Open Tools from the Ask bar — the chosen tool should open, drafts survive leaving the screen
- Keyboard: Ask bar stays above the keyboard and above the home indicator / Android nav bar
- Side menu: Learning Log, My Profile, My PDP, Appraisals (correct tab)
- Learning Log: markdown, Select → export PDF, duration picker (not a broken Android alert)
- Settings: dark mode, invite, legal links
- Small phone: header should drop the tagline and shorten “Upgrade” so it does not overflow
- Tablet: forms and chat column stay centered, not stretched edge-to-edge

Dictation only after a development/store build — in Expo Go the mic may show a “rebuild” or permission message; that is expected.

## Navigation

The website and the app both use a **hamburger + side drawer** (no bottom tabs). Drawer screens: **Ask**, **Learning Log**, **Portfolio/Appraisals**, **My Profile**. The side menu mirrors web (`Learning Log`, `My Profile`, `My PDP`, `Appraisals`).

## Layout

```
app/                   Expo Router screens
src/lib/               Supabase, API streaming, stores
src/providers/         Auth, menu
src/components/        Shell UI
src/theme/             Brand tokens + Inter typography
assets/images/         umbil-logo.png (same as web OG asset)
../../packages/shared  Shared types + API paths
```
