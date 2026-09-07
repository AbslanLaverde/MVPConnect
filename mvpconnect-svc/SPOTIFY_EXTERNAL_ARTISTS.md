# Spotify / ExternalArtist local configuration

MVPConnect uses Spotify's Client Credentials flow only for backend artist identity search.
No Spotify user authorization is part of this integration.

Set these environment variables on the Spring Boot process:

```text
SPOTIFY_CLIENT_ID=
SPOTIFY_CLIENT_SECRET=
```

In IntelliJ, add them under **Run > Edit Configurations > MVPConnect > Environment
variables**. Do not put them in the mobile/web app, committed Postman environments,
or source control.

When either value is missing, the rest of the backend starts normally. Spotify-backed
endpoints return HTTP `503` with the safe code `SPOTIFY_UNAVAILABLE`, allowing onboarding
to create a retryable manual artist instead.

Optional operational settings:

```text
SPOTIFY_ACCOUNTS_BASE_URL=https://accounts.spotify.com
SPOTIFY_API_BASE_URL=https://api.spotify.com
SPOTIFY_CONNECT_TIMEOUT=3s
SPOTIFY_READ_TIMEOUT=8s
```
