# MVPConnect quick start

Follow [the local development guide](../docs/LOCAL_DEVELOPMENT.md) first: Neo4j is provisioned separately, Compose starts MinIO, and Spring needs its own process environment. The backend defaults to port 8080.

Then, from `mvpconnect-app`:

```powershell
# Copy only if .env does not already exist
Copy-Item .env.example .env
npm ci
npm run web -- --port 8081
```

Configure `EXPO_PUBLIC_API_BASE_URL` in `.env` instead of editing the API client. Create a synthetic local account and follow onboarding. For readiness probes, device networking, optional providers, and troubleshooting, use the shared setup guide. For scope and checks, see [the client README](README.md).
