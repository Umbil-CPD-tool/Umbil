# Umbil mobile (Expo)

Native iOS/Android app sharing the same Supabase + `/api/*` backend as the website.

Uses **Expo SDK 54**. Branding matches web: **Inter**, teal `#1fb8cd`, tagline **Your Medical Lifeline**, hero **Smarter medicine starts here.**

## Run (Expo Go)

```bash
cd apps/mobile
npm install --legacy-peer-deps
npm start
```

If you see `failed to download remote update`, update Expo Go and try `npm run start:tunnel`.

## Expo Development Builds (recommended)

Expo Go is fine for UI, but a **development build** is your own Umbil-branded app with full native access (mic, push, custom modules). `eas.json` already has a `development` profile; `expo-dev-client` is installed.

```bash
# one-time: install EAS CLI and log in
npm i -g eas-cli
eas login

cd apps/mobile
# Android APK (install on phone)
eas build --profile development --platform android

# iOS simulator
eas build --profile development --platform ios

# After install, start Metro against the custom client:
npm run start:dev-client
```

Use Expo Go until you need native modules (e.g. real dictation). Then switch to a development build.

> **Mic dictation note:** the Ask bar's mic button uses `expo-speech-recognition`, a native module. If you already have a development build installed, it needs to be **rebuilt** (`eas build --profile development`) before dictation will work — existing installs won't have the new native module until then. It will never work in plain Expo Go.

## Feature status

See [FEATURES.md](./FEATURES.md).

## Navigation note

The website uses a **hamburger + side menu** (no bottom tabs). The app keeps four bottom tabs for thumb reach, labelled to match web: **Ask · Learning Log · Appraisals · My Profile**. The side menu still mirrors web (`Learning Log`, `My Profile`, `My PDP`, `Appraisals`).

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
