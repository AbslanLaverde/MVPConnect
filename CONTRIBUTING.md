# Contributing to MVPConnect

MVPConnect is a pre-release product and is not currently offered under an open-source license. Contributions should be coordinated with the repository owner.

## Workflow

1. Follow [Local Development](docs/LOCAL_DEVELOPMENT.md) and keep secrets in ignored local configuration.
2. Create a focused branch from the current `master` branch.
3. Keep changes scoped and add or update tests with behavioral changes.
4. Run the relevant checks before opening a pull request:
   - `npm test -- --ci` and `npm run typecheck` in `mvpconnect-app`
   - `mvn clean test` in `mvpconnect-svc`
   - `git diff --check` from the repository root
5. Open a pull request that explains the product impact, verification, and known limitations.

UI changes should include screenshots or video and relevant web/native verification. Never commit secrets, tokens, OAuth callback captures, personal data, database exports, or presigned URLs.

Generated files should be regenerated through their source tooling. For example, update the canonical brand SVG and run `npm run brand:generate` instead of hand-editing derived brand assets.
