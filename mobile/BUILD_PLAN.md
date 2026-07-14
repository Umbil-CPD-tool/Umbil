# Umbil Mobile Build Plan

## Milestone 1 — Foundation (included)

- Expo SDK 56 and TypeScript
- iOS and Android project configuration
- Existing Supabase authentication
- Secure native session persistence
- Email sign-up, verification, sign-in and password recovery
- Existing `/api/ask` streaming integration
- CPD Learning Log save, view and delete
- Existing Pro status display
- In-app account deletion
- Umbil visual foundation and app icons

## Milestone 2 — Clinical workflow tools

Rebuild the existing web tools as native screens:

- Referral letters
- Safety-netting advice
- Patient information sheets
- Plain-language explanations
- Translation support
- SBAR and discharge summaries
- Native copy, share and document export actions

The existing `/api/tools` bearer-token route can be reused.

## Milestone 3 — Appraisal and professional development

- Full CPD entry editing
- AI reflection generation
- PDP creation and management
- CPD analytics and export
- Native PDF preview and share

The existing `/api/generate-reflection` route can be reused. PDF handling needs a mobile-specific implementation.

## Milestone 4 — MSF and PSQ

- Create and manage MSF cycles
- Create and manage PSQ surveys
- Share links using the native share sheet
- Response progress and thresholds
- AI summaries and reflections
- Appraisal-ready report viewing and export

Public questionnaire links should continue opening without requiring respondents to install the app.

## Milestone 5 — Production hardening

- Verify Supabase Row Level Security for every mobile-accessible table
- Move CPD usage enforcement to a server route rather than relying on client-side checks
- Add central entitlement resolution for Stripe, student and Team access
- Add clinical-data consent and AI-processing disclosures
- Redact sensitive data from analytics and errors
- Add automated tests and error monitoring
- Complete accessibility and physical-device testing

## Milestone 6 — Store release

- Confirm bundle/package identifiers
- Configure the organisation's Apple and Google developer accounts
- Create EAS project and signing credentials
- Build TestFlight and Google Play internal-test releases
- Add store metadata, privacy declarations and reviewer credentials
- Complete final clinical and regulatory review
