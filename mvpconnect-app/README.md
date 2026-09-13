# MVPConnect client

Expo / React Native client for musician, venue, and promoter accounts. Start with the [project overview](../README.md), [local setup](../docs/LOCAL_DEVELOPMENT.md), and [environment reference](../docs/ENVIRONMENT.md).

## Run and check

With the backend and storage configured, run from this directory:

```powershell
# Copy only if .env does not already exist
Copy-Item .env.example .env
npm ci
npm run web -- --port 8081
```

Use `npm start`, `npm run android`, or `npm run ios` for a compatible native environment. iOS simulator development requires macOS. This repository uses Expo SDK 51; current Expo Go compatibility is not assumed. A global Expo CLI is unnecessary.

```powershell
npm test
npm run typecheck
```

The API URL comes from `EXPO_PUBLIC_API_BASE_URL`, falling back to `http://localhost:8080`. Do not edit `src/services/api.ts` to configure a machine. `EXPO_PUBLIC_OAUTH_RETURN_TARGET` must match the backend return allowlist. All `EXPO_PUBLIC_*` values are public; provider secrets belong in the backend environment. Restart Expo after configuration changes.

## Code map

| Path | Responsibility |
| --- | --- |
| `App.tsx` | Application entry and providers |
| `src/navigation/AppNavigator.tsx` | Routes and deep links |
| `src/screens` | Login/signup, welcome, OAuth result, musician home, profile editor |
| `src/onboarding` | Typed steps, state/API integration, save/resume/completion and sign-out |
| `src/components/onboarding` | Reusable fields, provider selectors, upload controls |
| `src/services` | Axios client and provider/identity/location requests |
| `src/store` | Redux store |
| `src/theme` | Design tokens and web input theme |
| `assets/branding` | Canonical logo and derivatives |

Auth responses use `accessToken`, `tokenType`, `userType`, `userId`, `email`, and optional `name`; see `AuthResponse` in the API client. Tokens use `authToken` in AsyncStorage, with `userType` stored separately. This is not encrypted credential storage or a token-refresh mechanism.

Onboarding navigation follows server state; `ONBOARDING_PLACEHOLDER_SAVE_BYPASS` is false. Signup/onboarding exist for all three personas. Welcome currently sends all personas to musician home, so dedicated venue/promoter dashboards are incomplete. Password reset is a placeholder. Image upload is implemented; general video hosting, messaging, bookings, and payments are not shipped claims.

See [architecture](../docs/ARCHITECTURE.md), [testing](../docs/TESTING.md), and [brand maintenance](assets/branding/BRAND_ASSETS.md). Create synthetic local accounts; this guide does not promise pre-seeded credentials.
