# Crystal Ski Rental — Implementation plan (release 1)

This plan builds release 1 of [REQUIREMENTS.md](REQUIREMENTS.md), from the Create T3 App
scaffold to a public demo. It is ordered as a sequence of **commits**: each one leaves the
app building, and together they tell the story of the project. Deployment is the last part.

---

## 1. Stack

| Concern      | Choice                                                                  |
| ------------ | ----------------------------------------------------------------------- |
| Framework    | Next.js 16 (App Router), React 19, TypeScript strict                    |
| API          | tRPC 11 + TanStack Query, superjson                                     |
| Database     | PostgreSQL 17, Prisma 7                                                 |
| Auth         | Better Auth (e-mail + password) with a role field                       |
| Validation   | Zod 4, schemas shared by server and forms                               |
| Money        | `Decimal` in Postgres, `decimal.js` for arithmetic, strings on the wire |
| UI           | Tailwind CSS 4, shadcn/ui on Base UI, lucide icons, Geist               |
| Forms        | React Hook Form + Zod resolver                                          |
| i18n         | next-intl (English catalogue in release 1)                              |
| Tests        | Vitest + Testing Library, Playwright                                    |
| Local infra  | Docker Compose Postgres on port 5433                                    |
| CI / hosting | GitHub Actions, Vercel (Hobby), Neon (Free), Frankfurt region           |

## 2. Architecture decisions

These are the calls that shape the code. Each one also gets a short section in the README's
**Decisions** chapter when it lands.

1. **Roles are enforced twice.**
   - Server-side page guards redirect (FR-5).
   - tRPC procedures protect data: `publicProcedure`, `protectedProcedure`, `userProcedure`
     (customers only), `staffProcedure` and `adminProcedure`.
   - Which _accounts_ a manager may write to depends on the target's role, so the account router
     checks it before every write, and again when a write would change the role (FR-62).
   - Better Auth's `role` field is `input: false`, so sign-up cannot set it.
2. **Whole-day dates.**
   - On the wire, dates are `YYYY-MM-DD` strings, widened to UTC midnight at the server edge.
   - Stored ranges are half-open, `[startDate, endDate)`. The UI shows the inclusive last day.
   - `src/lib/date.ts` holds the UTC helpers, with no date library (NFR-6).
3. **No double booking, guaranteed by the database (BR-20).**
   - An `EXCLUDE USING gist (skiId WITH =, daterange(startDate, endDate, '[)') WITH &&)` constraint,
     partial on `status IN ('CREATED','ACTIVE')`, needs `btree_gist`.
   - The routers still check first, but only to produce a friendly message.
   - Excluding `RETURNED` from the constraint is what frees the remaining days after an early return (BR-15).
4. **Money is exact (NFR-7).**
   - `Decimal(10,2)` columns, serialised as strings like `"38.00"` at the API boundary.
   - `src/lib/pricing.ts` is shared by the search (quote) and `reservation.create` (snapshot), so they
     cannot disagree.
5. **Rules live in pure modules.** `pricing.ts`, `reservation-lifecycle.ts` and `rating-rules.ts` in
   `src/lib` are imported by the routers (authoritative) and the UI, which only shows actions the
   server would accept.
6. **Separate selects for customers and staff.**
   - `skiPublicSelect` has no inventory code; `skiStaffSelect` has it.
   - Customer rating reads never include other people's comments (BR-50).
7. **Soft delete where history exists.**
   - Skis and accounts are soft-deleted; a ski with no history is hard-deleted (BR-32).
   - Brands, models and stores are hard-deleted with `onDelete: Restrict`.
   - List reads hide deleted rows. Detail reads return them, labelled.
8. **Denormalised model rating.** `SkiModel.avgRating` and `ratingCount` are recomputed from the
   aggregate in the same transaction as the rating write.
9. **View state in the URL.** Filters, sort, page and tabs are query parameters parsed with the same Zod
   schemas the routers use. Invalid values fall back to defaults (FR-35).
10. **Two list styles.**
    - Card grids (search, fleet) load in batches, with a real "Load more" button that also triggers on scroll.
    - Tables (reservations, accounts) are page-numbered.
    - Every list returns its total, and an out-of-range page number returns the last page.
11. **Errors.**
    - Anticipated failures (`notFound`, `conflict`, `badRequest`, `forbidden`) carry user-facing
      messages. Anything else is masked in production and logged.
    - `error.tsx`, `global-error.tsx` and `not-found.tsx` render the app shell with a retry and a way home.
12. **Theme without flash (NFR-3).**
    - A `theme` cookie holds `light | dark | system`. A tiny inline head script applies it before the
      first paint and follows the OS setting while it is `system`.
    - The server never reads the cookie, so pages stay statically renderable.
    - Tokens are oklch CSS variables, and contrast is verified.

## 3. Data model

```prisma
enum Role              { USER MANAGER ADMIN }
enum SkiType           { PISTE ALL_MOUNTAIN FREERIDE FREESTYLE }
enum SkiGender         { MAN WOMAN KID UNISEX }
enum SkillLevel        { BEGINNER INTERMEDIATE EXPERT }
enum ReservationStatus { CREATED ACTIVE RETURNED CANCELLED_BY_USER CANCELLED_BY_STORE }

// Better Auth: User (+ role, deletedAt), Session, Account, Verification

model Brand    { id, name @unique, models SkiModel[] }

model SkiModel {
  id, brandId, name, type SkiType, gender SkiGender, skillLevel SkillLevel,
  pricePerDay Decimal @db.Decimal(10,2),
  avgRating   Decimal? @db.Decimal(3,2), ratingCount Int @default(0),
  @@unique([brandId, name])
}

model Store {
  id, name @unique, street, houseNumber, city, zipCode, phone, email,
  openingHoursMonday … openingHoursSunday String @default("")
}

model Ski {
  id, inventoryCode @unique, modelId, storeId, lengthCm Int,
  isAvailable Boolean @default(true), deletedAt DateTime?
}

model Reservation {
  id, skiId, userId, startDate @db.Date, endDate @db.Date,
  status ReservationStatus @default(CREATED),
  pricePerDay Decimal(10,2), rentalDays Int, discountPercent Int, totalPrice Decimal(10,2),
  pickedUpAt, pickedUpById, returnedAt, returnedById, cancelledAt, cancelledById
  // + EXCLUDE constraint (decision 3)
}

model ReservationRating { id, reservationId @unique, score Int, note String?, createdAt }

model ModelRating {
  id, modelId, userId, reservationId, windowStartedAt, score Int, comment String?,
  @@unique([modelId, userId])
}
```

All timestamps have `createdAt` and `updatedAt`. Foreign keys to catalogue rows and skis are `Restrict`.
Indexes serve:

- the overlap lookup `(skiId, status, startDate)`
- customer history `(userId, startDate)`
- the front desk `(status, startDate)` and `(status, endDate)`
- the search sorts (`pricePerDay`, `avgRating`, `lengthCm`)

## 4. Commit sequence

Every commit passes `pnpm check` and `pnpm test` from the moment those exist.
Relative size: **S** small, **M** medium, **L** large (roughly 1 : 3 : 6). Porting proven patterns keeps
most steps at S or M. Expected total for release 1: **about 2 days** of implementation, plus the
owner's manual deployment steps (§4 Part E).

### Part A — Foundation

| #   | Commit                                      | Contents                                                                                                                                                                                                                                                                                                                                                 | Size |
| --- | ------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 1   | `Initial commit from Create T3 App` ✅      | Scaffold.                                                                                                                                                                                                                                                                                                                                                | —    |
| 2   | `Add requirements and implementation plan`  | `docs/REQUIREMENTS.md`, `docs/PLAN.md`.                                                                                                                                                                                                                                                                                                                  | S    |
| 3   | `Upgrade to Next.js 16, Prisma 7 and Zod 4` | Dependency upgrades (TypeScript 6 and ESLint 9, the newest the lint plugins support). Prisma 7 config file, `prisma-client` generator and `pg` driver adapter. ESLint flat config without `next lint`. Remove the sample post router, page and GitHub sign-in, and replace them with a `health.ping` router. Exclude local-only folders from `tsconfig`. | M    |
| 4   | `Set up tooling`                            | Prettier (single quotes, 120 columns, Tailwind plugin) applied to the whole repo, Vitest + Testing Library (jsdom), Playwright config with its own port, build directory and `.env.test`, Docker Compose Postgres on 5433 (`pnpm db:up`), env validation for the auth URL and secret. Test specs and the e2e seed step arrive with their features.       | M    |
| 5   | `Add UI foundation and Crystal theme`       | shadcn/ui setup with the button primitive (others arrive with the screens that need them), oklch tokens for light and dark, theme cookie + switcher without flash, Ski Flake logo, SVG favicon and generated Apple touch icon, next-intl with a type-checked `messages/en.json`, error, global-error and not-found pages.                                | M    |

### Part B — Domain and API

| #   | Commit                                       | Contents                                                                                                                                                                                                                                                                                                                                                                                                                  | Size |
| --- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 6   | `Add database schema`                        | §3 schema, init migration, hand-written `reservation_no_overlap` migration.                                                                                                                                                                                                                                                                                                                                               | M    |
| 7   | `Add authentication and roles`               | Better Auth e-mail/password with `role` and `deletedAt` (`input: false`), a session hook that refuses deleted accounts on every sign-in path, `auth` router (session, sign up, sign in, sign out), page guards, procedure levels, error helpers with production masking, role and error unit tests (FR-1…5, NFR-5).                                                                                                       | M    |
| 8   | `Add date and pricing rules`                 | `date.ts` (UTC days, half-open ranges, calendar conversion), `money.ts` (decimal.js with half-up rounding, money string schema), `pricing.ts` (BR-1…5) and `rental-range.ts` (BR-2), with unit tests on every tier boundary, rounding, float traps, the 30-day edge and time zones.                                                                                                                                       | M    |
| 9   | `Add reservation lifecycle and rating rules` | `reservation-lifecycle.ts` (BR-10…15: allowed transitions, due and overdue checks for the front desk) and `rating-rules.ts` (BR-40…41: edit windows, reopening a model rating through a newer rental), with table-driven unit tests including the 59/60-minute edges, plus tests that keep the status and role lists in sync with the database enums.                                                                     | M    |
| 10  | `Add catalogue API`                          | `brand`, `skiModel` and `store` routers (read for any signed-in account, write for admins), shared schemas with zip-code and phone normalisation, prices as decimal strings, in-use delete refusals with counts, schema and enum-sync unit tests (FR-10…13).                                                                                                                                                              | M    |
| 11  | `Add ski API`                                | `ski.list` (staff fleet with filters and inventory-code search), `ski.search` (customer: free for the dates, filters, sort, quote per result, no inventory code), `byId`, `create`, `update` (store-move rule), `delete` (refused while booked; soft or hard), the shared overlap helper, ski schemas and pagination helpers with unit tests (FR-20…24, FR-30…34, BR-22, BR-30…32).                                       | L    |
| 12  | `Add reservation API`                        | `create` with price snapshot and a race-safe double-booking check, `cancel` (customer or store), `pickUp`, `markReturned` as conditional updates on the expected status, `listMine`, `bySki`, `byUser`, `frontDesk` (due and overdue lists per store), `blockersBySki`; shared store and model selects; overlap-violation detection with a unit test (FR-40…41, FR-50…51, FR-60, BR-11…15, BR-20).                        | L    |
| 13  | `Add ratings API`                            | `rating.upsertReservationRating` and `rating.upsertModelRating` with server-clock edit windows and reopening, model average recomputed under a row lock, staff `rating.byModel` with customer e-mails, ratings attached to reservation histories (FR-14, FR-42…44, BR-40…42).                                                                                                                                             | M    |
| 14  | `Add account management API`                 | `user` router (list with search, role and removed filters; byId; create; update; soft delete that drops sessions; restore), `mayManageAccount` rule with unit tests, lockout guards, and `auth.updateProfile` / `auth.changePassword` for the signed-in account (FR-4, FR-61…63, BR-33).                                                                                                                                  | M    |
| 15  | `Add demo seed`                              | Deterministic seed (`pnpm db:seed`, run with tsx): 4 stores, 8 brands, 17 models, 49 skis, demo accounts per role plus generated customers (one removed), about 470 reservations in every status around today, scripted scenarios for the demo customer and the Jasná front desk, ratings in every access state, and invariant checks before anything is written. Refuses production unless `ALLOW_PRODUCTION_SEED=true`. | M    |

### Part C — Screens

| #   | Commit                            | Contents                                                                                                                                        | Size |
| --- | --------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 16  | `Add landing page and sign-in`    | Day/dusk hero by theme, sign-in / sign-up panel, header with logo and theme switcher, mobile nav.                                               | M    |
| 17  | `Add ski search and booking`      | Filters + sort in the URL, ski cards with discounted quote, reserve dialog with breakdown and store info, load-more grid (FR-30…35).            | L    |
| 18  | `Add my reservations and ratings` | Reservations table with status and price, cancel, rate-rental and rate-model dialogs with edit-window state (FR-40…44).                         | M    |
| 19  | `Add front desk`                  | Store tabs, due and overdue lists, pick-up / return / cancel actions (FR-50…51).                                                                | M    |
| 20  | `Add fleet management`            | Fleet grid with filters and code search, add/edit ski, ski detail with reservations and out-of-rental notice, delete dialog (FR-20…24, FR-60).  | L    |
| 21  | `Add catalogue management`        | Admin tabs for brands, models (price, attributes, ratings with mail-to) and stores (address, contacts, 7 hours fields) (FR-10…14).              | M    |
| 22  | `Add accounts and profile`        | Account list with filters and removed view, detail with reservation history, create/edit/delete/restore dialogs, profile page (FR-4, FR-60…63). | M    |

### Part D — Quality

| #   | Commit                 | Contents                                                                                                                                                                | Size |
| --- | ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 23  | `Add end-to-end tests` | One spec per role on its own test database: auth and redirects; customer search → book → cancel; staff pick up → return → customer rates; admin catalogue and accounts. | L    |
| 24  | `Add CI workflow`      | GitHub Actions: lint, typecheck, format, unit, e2e against a `postgres:17` service, build. Required status checks on `main`.                                            | M    |
| 25  | `Write README`         | Setup, scripts, demo accounts, project layout, and Decisions (§2 in prose).                                                                                             | M    |

### Part E — Deployment (last)

| #   | Commit                        | Contents                                                                                                                                                                                                                      | Size |
| --- | ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---- |
| 26  | `Prepare for Vercel and Neon` | Prisma pooled URL at runtime and direct URL for migrations. Build command `prisma migrate deploy && next build`. `vercel.json` with region `fra1`. Better Auth trusted origins for preview URLs. Env schema for `VERCEL_URL`. | S    |
| 27  | `Add demo mode`               | Demo accounts shown on the landing page with one-click sign-in, a "demo data resets daily" banner, Better Auth rate limits on sign-in and sign-up, and text length limits (NFR-9).                                            | M    |
| 28  | `Add scheduled demo reset`    | GitHub Actions workflow on a nightly cron plus a manual trigger that migrates and re-seeds production. The seed refuses production unless `ALLOW_PRODUCTION_SEED=true`.                                                       | S    |

**Manual steps, done by the owner in the dashboards and documented in the README:**

1. Create a GitHub repository and push `main`.
2. Neon: create a project in `aws-eu-central-1` with Postgres 17.
3. Vercel: import the repository, set the function region to `fra1`, and set `BETTER_AUTH_SECRET`.
4. Install the Neon integration on the Vercel project. It creates a database branch per preview,
   so enable automatic deletion of preview branches (the Free plan allows 10 branches).
5. Vercel Deployment Checks: require the CI workflow before promoting to production.
6. GitHub: add `DATABASE_URL` (Neon direct URL of `main`) as a secret for the reset workflow, then run it once.
7. Smoke test on the production URL: sign in as each demo role and run a booking through to a rating.

## 5. Testing strategy

| Layer      | What                                                                                                                                                                                                 | Where              |
| ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------ |
| Unit       | Pricing tiers and rounding, UTC dates and half-open ranges, lifecycle transitions, rating windows, role checks, pagination edges, URL filter parsing, the public ski select having no inventory code | `src/**/*.test.ts` |
| End-to-end | The main flow of each role against a real, freshly seeded database. This is where the overlap constraint, sessions and cascades are exercised.                                                       | `e2e/*.spec.ts`    |
| Manual     | Accessibility pass on each screen (keyboard, focus, contrast) in light and dark themes, and at 375 px                                                                                                | before commit 25   |

The e2e suite uses its own database (`crystal_ski_rental_test`) and port (3100), and re-seeds before
every run, so it never touches development data.

## 6. Definition of done (release 1)

- Every `FR`, `BR` and `NFR` in REQUIREMENTS §4–§6 marked release 1 is implemented, or explicitly
  noted in the README as a deviation.
- `pnpm check`, `pnpm test` and `pnpm test:e2e` pass locally and in CI.
- The production demo is live, sign-in works for all three demo roles, and the nightly reset has run once.
- The README lets a stranger run the project locally in under ten minutes.

## 7. Risks

| Risk                                           | Mitigation                                                                                                                               |
| ---------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| Decimal values leak into floating-point math   | All arithmetic lives in `pricing.ts`, money crosses the API as strings, and unit tests include classic float traps (`19.99 × 7 × 0.85`). |
| Edge cases in the rating-window rules          | A pure function with table-driven tests. The server clock is the only clock.                                                             |
| Late returns clash with the next booking       | Accepted by design (REQUIREMENTS §8). The front desk surfaces overdue returns.                                                           |
| Flaky e2e runs in CI                           | Deterministic seed, one worker, test IDs and role-based selectors, and traces uploaded on failure.                                       |
| Neon cold start on the demo                    | Acceptable for a demo. The first request after idle takes about a second.                                                                |
| Free-tier limits (Neon branches, Vercel usage) | Automatic preview-branch cleanup and a low-traffic demo.                                                                                 |

## 8. After release 1

In rough priority order:

1. Slovak language: `sk.json`, a locale cookie and switcher, and server error messages as translation keys.
2. Model photos, stored in Vercel Blob.
3. Blocking bookings of skis that are overdue for return.
4. Public model comments with moderation.
5. Other equipment.
