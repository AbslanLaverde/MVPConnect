# MVPConnect backend logging

The backend uses one correlation ID across HTTP, authentication, controller,
service, repository, domain-event, and exception logs. The same value is returned
to clients in the `X-Request-ID` response header.

## What is recorded

- HTTP request start, completion, status, and duration
- Controller and service operation start, completion, duration, and result type
- Spring Data repository operation start, completion, duration, and safe result metadata
- Slow controller, service, and repository operations
- Account creation and successful login by account ID and persona
- Onboarding draft, step, completion, and media-association lifecycle events
- Media initialization, completion, and deletion lifecycle events
- Handled API exceptions with status, stable error code, and exception type
- Unexpected server exceptions with a stack trace

Repository responses are deliberately summarized. Logs may say `present=true`,
`count=6`, or `resultType=Musician`; they never serialize the returned entity.

## Data that must not be logged

Do not add request/response-body logging. In particular, logs must not contain:

- passwords or password hashes
- JWTs or Authorization headers
- email addresses, phone numbers, bios, or other profile contents
- Google queries or place IDs
- presigned storage URLs, credentials, or object keys
- onboarding `dataJson`

Use stable IDs, persona, status, counts, durations, media type, step key, and error
codes when adding new operational events.

## Local development

Run with the `local` Spring profile. Application flow logging is `DEBUG`, Neo4j
driver logging is `INFO`, and output is written to both IntelliJ and the following
path relative to the service process's working directory:

```text
logs/mvpconnect.log
```

Follow the file from PowerShell:

```powershell
Get-Content .\logs\mvpconnect.log -Wait
```

Find every event for one failed request:

```powershell
Select-String -Path .\logs\mvpconnect.log -Pattern 'requestId:<the-id>'
```

The client-visible request ID is in the failed HTTP response's
`X-Request-ID` header. Browser JavaScript may read this header through CORS.

## Runtime controls

| Environment variable | Default | Purpose |
| --- | --- | --- |
| `APP_LOG_LEVEL` | `INFO` (`DEBUG` in local) | MVPConnect application detail |
| `LOG_FILE` | `logs/mvpconnect.log` in local | Local rolling log destination |
| `LOG_MAX_FILE_SIZE` | `20MB` | Roll the active file at this size |
| `LOG_MAX_HISTORY` | `30` | Maximum archived-file history |
| `LOG_TOTAL_SIZE_CAP` | `1GB` | Maximum retained rolling-log size |
| `SLOW_OPERATION_THRESHOLD_MS` | `1000` | Warn when an instrumented operation is slow |

Production defaults to `INFO` and console output so the deployment platform can
collect logs centrally. Set `APP_LOG_LEVEL=DEBUG` temporarily when safe repository
and internal flow summaries are required for diagnosis. Framework security remains
at `WARN`; enabling Spring Security `DEBUG` globally is not recommended.
