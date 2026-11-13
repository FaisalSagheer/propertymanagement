# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PropertyPro (`propertypro` in package.json): a property management SaaS built on the Next.js App Router (Next 16, React 19, TypeScript), MongoDB/Mongoose 8, Auth.js (`next-auth` v5 beta), Stripe, Tailwind 4 and Radix/shadcn UI. Path alias `@/*` → `src/*`.

## Commands

```bash
npm install
npm run dev              # dev server on http://localhost:3001 (not 3000)
npm run build
npm run lint             # next lint
npm run seed:demo        # tsx src/scripts/seed-demo-accounts.ts
npm run seed:demo-data   # tsx src/scripts/seed-demo-data.ts
npx tsc --noEmit         # type-check; the build will NOT catch type errors
```

Other one-off scripts in `src/scripts/` and `scripts/` are run directly with `npx tsx <file>` / `node <file>`.

**The README is partly stale.** `npm test`, `test:unit/integration/e2e`, `seed:settings`, `setup:unified-settings`, `scripts/setup-admin.js`, `.env.example` and `server.js` (used by `npm start`) do not exist in this repo. Don't rely on them.

**Tests:** a few Jest-style tests exist (`src/app/api/**/__tests__/route.test.ts`, `src/lib/tests/*.test.ts`) but Jest is not installed or configured. `src/lib/tests/README.md` describes the setup needed (jest, ts-jest, `moduleNameMapper` for `@/`). Once it is configured, run a single test with `npx jest path/to/file.test.ts`.

**Environment:** config is read from `.env` / `.env.local` (git-ignored). `MONGODB_URI` is required at import time by `src/lib/auth.ts`. OAuth providers (Google/GitHub) are only registered when their client ID/secret are set. Other groups: Stripe, SMTP/email, Cloudflare R2 (or AWS S3), feature flags (`ENABLE_*`), late-fee defaults.

## Architecture

### Request flow and auth
- `src/lib/auth.ts` sets up NextAuth with the MongoDB adapter plus a Credentials provider; the session callback resolves the user's role and puts `role` and `permissions` on `session.user`.
- API routes live under `src/app/api/**/route.ts`. The standard guard is `withRoleAndDB([UserRole.ADMIN, UserRole.MANAGER])(async (user, request, context) => …)` from `src/lib/api-utils.ts`. It connects to the DB, checks the session, resolves the role and passes an `AuthenticatedUser`. Some routes call `auth()` directly instead. Use the response helpers from the same file (`createSuccessResponse`, `createErrorResponse`, `handleApiError`, `parsePaginationParams`/`paginateQuery`, `parseRequestBody`) and Zod schemas from `src/lib/validations.ts` (`validateSchema`).
- There is no Next.js `middleware.ts`; `src/middleware/` holds an audit helper, not route middleware. Page protection happens in layouts/components and the API guards.

### Roles and permissions (`src/lib/auth/`)
- Three built-in roles in `src/types/index.ts`: `admin`, `manager`, `tenant`. Admins can also create **custom roles** (`Role` model), each with `inheritsFrom` a built-in role and a `permissions` array.
- `resolve-role.ts` maps a custom role to its effective built-in role, so guards only ever compare against the enum. Built-in roles resolve with `permissions: []`.
- `require-permission.ts` / `permissions.ts`: `requirePermission(user, "x_action")` gives finer control *within* a role-gated route. Admin is always allowed, built-in manager is allowed, and custom roles must hold the permission or its `*_management` parent.
- `property-scope.ts`: non-admins only see properties they own (`ownerId`, set to the creator) or are assigned to (`managerId`/`assignedAgentId`), unless they hold `property_view_all`. Apply `applyPropertyScope` / `canViewAllProperties` to any property-related query.

### Data layer
- Mongoose models are in `src/models/`, re-exported from `src/models/index.ts` (import from `@/models`). Units are **embedded in `Property.units`** (max 1000), not a separate collection; `/api/units` aggregates over properties.
- DB connection: `src/lib/mongodb.ts` (default `connectDB`, also `connectToDatabase`), re-exported by `src/lib/db.ts` and `api-utils.ts`; it uses a cached global connection.
- Business logic lives in `src/lib/services/*.service.ts`: payments/invoices/receipts, lease lifecycle and expiration, late fees, proration, recurring payments, payment↔lease sync, calendar, messaging, email. Route handlers should call into these rather than re-implement them.

### Billing (two separate systems)
- **Tenant rent payments:** Stripe (`src/lib/stripe*.ts`, `src/app/api/stripe/*`, `src/app/api/payments`, invoice/payment services).
- **Manager account plans** (what a client pays the admin for a manager account): `src/lib/billing/` and `src/app/api/billing/*`, models `ManagerAccount`/`ManagerPayment`. The plan catalogue is a const in `src/lib/billing/plans.ts` (GBP, placeholder prices); plan `id`s are persisted, so renaming one needs a migration.

### Other
- File uploads: `src/lib/file-upload.ts` writes to local `public/uploads` by default. Its `UPLOAD_STORAGE_PROVIDER=cloud` branch is a stub. Real cloud storage is Cloudflare R2 via `src/lib/r2.ts` / `src/lib/r2-server.ts`, used by the `/api/upload/*` routes. R2 hostnames are allowed in `next.config.ts` `images.remotePatterns`.
- i18n: JSON message files per namespace in `src/locales/{en,de,es,fr}/`, aggregated by `src/locales/index.ts` and served through `localization.service.ts`, `LocalizationProvider` and the `use-localization` hook. When adding UI strings, add keys to all four locales.
- Cron: `src/app/api/cron/check-leases` triggers lease expiration and is guarded by `checkCronAuth` (`src/lib/auth/cron-auth.ts`): callers must send `Authorization: Bearer $CRON_SECRET`, and the route refuses to run if `CRON_SECRET` is unset.
- Stripe webhooks (`/api/billing/webhook` for manager plans, `/api/stripe/webhook` for tenant rent): each verifies the signature on the raw body, then claims the event id through `claimStripeEvent` (`src/lib/stripe-events.ts`, `StripeEvent` model, 30-day TTL) so a redelivery is skipped, and releases the claim if the handler throws so Stripe's retry runs. In the billing webhook `ManagerAccount` is the source of truth; `syncSubscriptionState` mirrors it onto `User.subscription` and the `Subscription` record after every change. Handlers re-read the subscription/invoice from Stripe rather than trusting a possibly stale payload.
- Guarded routes (`src/lib/auth/route-guards.ts`): seed/demo/debug routes (`/api/seed/*`, `/api/demo-data`, `/api/auth/session-debug`) answer 404 in production unless `ENABLE_DEMO_ROUTES=true`; `DELETE /api/demo-data` also needs `{"confirm":"DELETE ALL DATA"}`. `POST /api/setup/create-admin` needs the `x-setup-token` header to match `SETUP_TOKEN` (24+ chars) and is off when unset.
- Passwords: the length rule lives in `src/lib/auth/password-policy.ts` (shared by sign-up, reset, setup and the forms). `User.password` keeps its looser model-level `minlength` so seed scripts still work; enforce the policy at API boundaries.
- Client state: Zustand stores in `src/stores/`; hooks in `src/hooks/`; UI primitives (shadcn) in `src/components/ui/`.
- `next.config.ts` sets `typescript.ignoreBuildErrors: true` and proxies PostHog under `/ingest/*`.
