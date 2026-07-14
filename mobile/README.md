# Umbil Mobile

Expo React Native application for Umbil. It uses the existing Supabase project and the existing Next.js/Vercel API routes.

## Requirements

- Node.js 22.13 or newer
- npm
- Expo Go for initial device testing
- Access to the public Supabase URL and anon key

## Setup

1. Copy `.env.example` to `.env`.
2. Fill in the three public environment variables.
3. Run `npm install`.
4. Run `npm start`.
5. Scan the QR code with Expo Go.

Do not add `SUPABASE_SERVICE_KEY`, Stripe secrets, AI provider keys, or database passwords to this project.

## Current milestone

- Email/password sign in
- Account creation and email-code verification
- Password recovery
- Secure native session persistence
- Clinical-question streaming through the existing `/api/ask` route
- Saving answers to the existing CPD learning log
- Learning-log viewing and deletion
- Profile and Pro-status display
- In-app account deletion

## Before production submission

Confirm the final iOS bundle identifier and Android package name with the organisation. The current value is `uk.co.umbil.app`.
