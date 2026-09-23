# MVPConnect client

Expo / React Native client for Artist, Venue, and Promoter accounts. Artist maps to `MUSICIAN` in the backend; code/API identifiers retain their existing names. Start with the [project overview](../README.md), [architecture guide](../docs/ARCHITECTURE.md), and [environment reference](../docs/ENVIRONMENT.md).

## Verification

From this package after installing the committed dependency graph:

```powershell
npm ci
npm test
npm run typecheck
```

`EXPO_PUBLIC_API_BASE_URL` selects the backend origin. `EXPO_PUBLIC_OAUTH_RETURN_TARGET` must exactly match a backend return allowlist entry. All `EXPO_PUBLIC_*` values are public client configuration; provider secrets belong in the backend environment.

## Code map

| Path | Responsibility |
| --- | --- |
| `App.tsx` | Application entry and providers |
| `src/navigation/AppNavigator.tsx` | Routes and deep links |
| `src/screens` | Login/signup, Welcome, OAuth result, and profile surfaces |
| `src/home` | Shared Home foundation and explicit Artist, Venue, and Promoter compositions |
| `src/onboarding` | Typed steps, state/API integration, save/resume/completion and sign-out |
| `src/components/onboarding` | Reusable fields, provider selectors, upload controls |
| `src/services` | Axios client and provider/identity/location requests |
| `src/store` | Redux store |
| `src/theme` | Design tokens and web input theme |
| `assets/branding` | Canonical logo and derivatives |

Auth responses use `accessToken`, `tokenType`, `userType`, `userId`, `email`, and optional `name`; see `AuthResponse` in the API client. Tokens use `authToken` in AsyncStorage, with `userType` stored separately. This is not encrypted credential storage or a token-refresh mechanism.

Onboarding navigation follows server state; `ONBOARDING_PLACEHOLDER_SAVE_BYPASS` is false. Signup/onboarding and dedicated post-onboarding Home destinations exist for all three personas. Completed login and Welcome use one authenticated resolver to route Musician/Artist, Venue, and Promoter accounts. Password reset is a placeholder. Image upload is implemented; general video hosting, messaging, bookings, and payments are not shipped claims.

See [architecture](../docs/ARCHITECTURE.md), [testing](../docs/TESTING.md), and [brand maintenance](assets/branding/BRAND_ASSETS.md).
