# Discovery platform implementation

## Phase 1: current architecture

The existing application is a public React 19, TypeScript, and Vite frontend. Its Node HTTP API uses a local SQLite database. The site currently has no login, Supabase client, source registry, scheduled collection, or administrator UI. Its eligibility matcher and bilingual scheme catalog remain the existing source of the current public experience.

The hosted Vercel project currently serves the static SPA. Its catch-all rewrite also returns `index.html` for `/api/health`; the local Node/SQLite server is not deployed there.

## Phase 2: additive database migration

Apply `supabase/migrations/20261122_discovery_platform.sql` to the Supabase project before deploying server functions. It creates `ss_*` tables for organizations, the domain taxonomy, permitted API/RSS/manual sources, opportunities, category links, update history, synchronization logs, administrator reviews, and public notification events. It includes indexes, constraints, and row-level security.

The `ss_` prefix is intentional. A prior SchemeSathi schema used unprefixed `schemes`, `scheme_categories`, and user tables. This migration does not alter or delete those tables or their records. It does not import the local SQLite database. No opportunity records or source feeds are seeded; only the fixed domain taxonomy is inserted.

All data access is intended to pass through server-side functions. The migration revokes access from Supabase's `anon` and `authenticated` roles and grants the server's `service_role` access. Never put the service-role key in the browser bundle.

Scheme-domain choices and saved schemes remain in the visitor's browser, consistent with the no-login requirement. Citizen profiles are not written to Supabase. Email notifications, if enabled in a later phase, must require explicit consent.

## Phase 3: source registry and collectors

The source registry accepts only API, RSS, or administrator-assisted manual sources. `server/services/sourceCollector.mjs` collects only enabled, verified API/RSS sources; the source registry is intentionally empty until an administrator verifies a permitted source. It supports field-mapped JSON APIs and RSS/Atom feeds, preserves source publication metadata, and does not infer benefits, eligibility, or apply links.

Automatic fetches require HTTPS, an exact registered official domain or its subdomain, same-domain redirects, a 1 MB response limit, and a 10-second timeout. API credentials are stored only in Vercel environment variables named `SOURCE_API_KEY_*`; the database stores only the environment-variable name. The collector does not scrape pages or contact unregistered URLs.

## Phase 4: verification and duplicate handling

`server/services/schemeVerification.mjs` requires a verified source and organization, matching official domains, a valid source publication date, known domains, and source-backed benefits, eligibility, and required-document lists before a record can be published. Missing or conflicting facts stay unpublished for administrator review. Application status is derived only from valid source dates or an explicit source status; an unknown status is never marked active.

Duplicate identity uses a normalized title and the verified organization's domain. Repeated identical records are ignored; changed facts are stored as history and queued for review without overwriting the currently published record. New verified records are inserted unpublished, linked to their domains, and published only after those writes succeed.

## Phase 5: domain preferences

The public app exposes the twelve taxonomy domains, supports multi-select and "All domains," and applies the selection to both the scheme catalog and eligibility results. Legacy catalog entries are mapped from their existing categories and tags; records without a reliable match appear under "Other Government & Private Benefits." Preferences contain only domain IDs and stay in browser storage, never in the citizen profile or a network request.

## Phase 6: public dashboard

The public dashboard summarizes domain-matched schemes, locally saved schemes, verified date-based deadlines, and the five most recently viewed catalog entries. It does not claim eligibility from domain matches. The live updates section is omitted from the public interface while no verified opportunities are available; it can be restored once the feed contains current, source-backed announcements.

## Phase 7: discovery API and scheduled synchronization

`/api/discovery/opportunities` returns only published, verified Supabase records and their verified organization/domain links. It validates source/application URLs and required fields before mapping to the public frontend contract, accepts only registered active domain IDs, and returns JSON for both data and configuration errors. Results are briefly cacheable because they are public.

The local Node server mounts the same discovery and notification handlers behind Vite's existing `/api` proxy, so an unconfigured local environment returns an explicit JSON 503 instead of the SPA or a 404.

`/api/cron/sync` requires the server-only `CRON_SECRET` bearer token. The Vercel Cron schedule invokes it daily at 03:00 UTC, which is compatible with Vercel Hobby's once-per-day schedule limit. It collects only enabled, verified API/RSS sources; honors each source's refresh interval and hourly request cap; retries one transient source failure; runs at most five sources per invocation with bounded concurrency; and records per-source outcomes, ETags, timestamps, and safe error summaries. Candidate processing uses the Phase 4 verification pipeline; new changes are not published unless that pipeline verifies them.

New verified publications create a public notice event with only the scheme title and official source link. The app does not collect email addresses, create push subscriptions, or send citizen data to source services.

The source registry must remain empty until permitted official feeds are independently reviewed and entered. The Vercel schedule requires a configured `CRON_SECRET` and a deployment plan that supports Cron Jobs; without that configuration, synchronization remains unavailable and the public API reports Supabase configuration errors as JSON.

## Phase 8: protected administration

The public site remains login-free. The separate `/admin` route has no public navigation link and requires the shared `ADMIN_API_SECRET` through a bearer-authenticated API. The key is typed by the operator and kept only in that tab's session storage; it is not embedded in the frontend or written to the database. Admin and cron secrets should be random values of at least 32 bytes and set only in server environment settings.

Administrators can add organizations and API/RSS sources, but new records start unverified and disabled. Explicit confirmation is required to mark an organization or feed verified; enabling a source rechecks HTTPS, official-domain relationships, feed type, parser mappings, and active categories. Review approval recalculates the Phase 4 verification rules before publication; rejected observed changes do not overwrite existing published records. No source entry can enable page scraping.

## Deployment prerequisites

The migration has not been applied to a remote database from this workspace: no Supabase project configuration or credentials are present. Before enabling the server-side API and scheduled jobs, configure these server-only Vercel variables:

- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `CRON_SECRET`
- `ADMIN_API_SECRET`
- `SOURCE_API_KEY_*` only for registered public APIs that require a key; source records store the variable name, never the key

Set secrets through the Vercel project settings, not in source control or chat. Use random values of at least 32 bytes for `ADMIN_API_SECRET` and `CRON_SECRET`. Until those values are configured and the migration is applied, the hosted application remains a static public frontend and discovery APIs are unavailable.

## Source policy

Only registered official APIs, authorized RSS feeds, and administrator-entered public source links may be used. Do not scrape pages where access is restricted or where the source provides no permitted method. Each published opportunity must retain its source URL and source publication date; missing or conflicting facts stay in review rather than being inferred.
