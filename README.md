# Crystal Ski Rental

Online reservations for a (fictional) ski rental with four stores in Slovak resorts. Customers find
skis that are free for their dates, see the price with a length-of-rental discount, book, cancel,
and rate both the rental and the ski model. Store staff run the front desk (pickups, returns,
no-shows), the fleet and the customer accounts. Admins also own the catalogue, prices, stores and
staff accounts.

It is a portfolio project built the way a client project would be: [the brief and the
requirements](docs/REQUIREMENTS.md) first, then [a plan](docs/PLAN.md) delivered as a sequence of
reviewable commits.

## Getting started

Requires Node 24+, pnpm 9 and Docker.

```bash
pnpm install
cp .env.example .env     # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:up               # Postgres 17 on localhost:5433
pnpm db:migrate          # create the schema
pnpm db:seed             # demo stores, fleet, accounts, reservations and ratings
pnpm dev                 # http://localhost:3000
```

Postgres listens on **5433** so it does not collide with another Postgres on the default port.

### Demo accounts

| Role     | E-mail                           | Password       |
| -------- | -------------------------------- | -------------- |
| Admin    | `admin@crystalskirental.test`    | `Admin123!`    |
| Manager  | `manager@crystalskirental.test`  | `Manager123!`  |
| Customer | `customer@crystalskirental.test` | `Customer123!` |

The other seeded customers are `<first>.<last>@example.test` with the customer password.

The seed is set up so every screen has something to show: the demo customer has a rental with a
locked rating, a newer rental of the same model that may update it, one returned today whose ratings
are still editable, one picked up, one upcoming and one cancelled. They also have a mailing address and
an invoice address made out to a company. The Jasná front desk has an item in each of its four lists.

## Scripts

| Command             | Does                                        |
| ------------------- | ------------------------------------------- |
| `pnpm dev`          | Development server                          |
| `pnpm build`        | Production build                            |
| `pnpm check`        | ESLint and TypeScript                       |
| `pnpm format:write` | Prettier                                    |
| `pnpm test`         | Unit tests (Vitest)                         |
| `pnpm test:e2e`     | End-to-end tests (Playwright, own database) |
| `pnpm db:up`        | Start Postgres in Docker                    |
| `pnpm db:generate`  | Create and apply a migration                |
| `pnpm db:migrate`   | Apply pending migrations                    |
| `pnpm db:seed`      | Reset the database to the demo data         |
| `pnpm db:studio`    | Browse the database                         |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · tRPC 11 with TanStack Query · Prisma 7 on
PostgreSQL 17 · Better Auth · Zod 4 · Tailwind CSS 4 with shadcn/ui on Base UI · React Hook Form ·
next-intl · decimal.js · Vitest and Playwright · GitHub Actions.

## Layout

```
docs/                 Requirements and implementation plan
e2e/                  Playwright specs, their seeding and helpers
messages/en.json      Every user-facing string
prisma/               Schema, migrations and the demo seed
src/app/              Routes; each keeps the components only it uses in _components/
src/components/       Shared components: ui/ (shadcn), layout/, common/, skis/, reservations/, stores/
src/hooks/            Client hooks: URL state, money and date formatting
src/lib/              Client-safe code: Zod schemas, domain rules, pricing, dates, routes
src/server/api/       tRPC routers, procedures, errors and shared selects
src/server/better-auth/  Auth configuration and page guards
```

## Decisions

The calls that are not obvious from the code, and why they went the way they did. Requirement IDs
refer to [REQUIREMENTS.md](docs/REQUIREMENTS.md).

### Roles are checked twice

Page guards run on the server before a page renders and redirect a signed-in user who is in the
wrong area to their own, so a stale bookmark is never a dead end. They protect pages, not data: every
tRPC procedure carries its own level (`userProcedure`, `staffProcedure`, `adminProcedure`),
because the API is reachable without loading a page.

Which _account_ a manager may change depends on that account's role, so `mayManageAccount` runs in
the router against the target's current role and again against any role the change would set.
Otherwise "promote this customer to admin" would do what "edit this admin" refuses.

Better Auth's `role` field is `input: false`: without it, a sign-up request could send
`"role": "ADMIN"`. A session hook refuses deleted accounts on every sign-in path, including Better
Auth's own endpoints, with the same message as a wrong password.

### Rentals are whole days in UTC

Dates travel as `YYYY-MM-DD` strings and become UTC-midnight dates at the server. A date picked in a
calendar is local midnight, which `toISOString` turns into the previous day anywhere east of
Greenwich, so a booking for the 12th would quietly become the 11th for some visitors. There is no date
library, because the common ones default to local time.

Stored ranges are half-open: the start is inclusive and the end exclusive. That is what lets one
rental end on the day the next begins. It also means the stored end is never the date to show, so
`rentalPeriod` turns a stored range into the last day the customer keeps the skis.

### No double booking, guaranteed by the database

A ski can never hold two booked or picked-up reservations that share a day (BR-20). A reservation
holds one or more skis from one store (BR-6), each as a reservation item, and the rule is an
`EXCLUDE USING gist` constraint on the items over the ski and the date range, partial on items that
still hold their dates. It lives in a hand-written migration because Prisma cannot express it, with a
trigger that keeps every item in step with its reservation's status. Checking for a clash and then
inserting is two statements, and two customers booking the same ski at the same moment can both pass
the check, so the router's check only exists to explain the ordinary case. The constraint is what is
actually true.

Returned and cancelled reservations hold no dates. That is what frees the rest of an early return
(BR-15) without touching the price the customer agreed to.

`prisma db push` does not create the constraint, so use migrations for any database that matters.

### Money is exact

Prices are `Decimal(10,2)` in Postgres, strings like `"38.00"` in the API, and `decimal.js` for any
arithmetic. A JavaScript number never holds a price. `quoteRental` in `src/lib/pricing.ts` computes
the discount for the rental length and rounds half-up to the cent; `quoteReservation` quotes every
pair of a reservation that way and adds up the rounded lines. The search, the reservation page and the
booking all use them, so the price on the card is the price saved. The reservation keeps that snapshot
(each pair's price per day and total, the days, discount and total), so a later price change never
rewrites what someone agreed to.

Formatting goes from the decimal string straight to `Intl.NumberFormat`, which accepts strings.

### Rules live in pure modules

The reservation lifecycle (`src/lib/reservation-lifecycle.ts`) and the rating windows
(`src/lib/rating-rules.ts`) are plain functions with table-driven tests. The routers enforce them;
the screens import the same functions only to decide which buttons to show, so a screen never offers
an action the server would refuse. Every status change is written as a conditional update on the
status it expects, so two people pressing at once cannot both succeed.

A model rating is one per customer per model, but it is written _through_ a returned reservation.
It records which reservation opened its one-hour edit window; after the window closes, only a rental
returned later may reopen it. An older rental that was never used for it cannot.

### What customers may see

Customer-facing reads use their own selects, which leave out inventory codes, other customers and
rating comments (BR-50). Comments and rental notes are for staff, who reply by e-mail from the model's
ratings.

### Deletion

Skis and accounts are soft-deleted once they have history, so reservations keep pointing at them and
the histories stay complete. A ski that was never booked is removed outright. Lists hide removed
records; detail pages show them, labelled. Removing an account also drops its sessions, so the
sign-out is immediate, and its e-mail stays reserved for a restore.

Brands, models and stores are hard-deleted and refused while anything still uses them. The dialog
says what is in the way.

Taking a ski out of rental is never refused: it stops new bookings and honours the existing ones,
and the ski's page keeps saying how many stand. Moving a ski to another store is refused while a
customer expects it where they booked it, and deleting it is refused while it is booked or picked up.

### View state lives in the URL

Search filters, sort, pages, the front desk's and stores page's store, and the models page's tab are query parameters.
A view can be reloaded, shared and bookmarked, and Back returns to it. The URL is untrusted input, so
it is parsed with the same Zod schema the router uses, and a parameter that does not survive is
dropped on its own instead of failing the whole page.

Card grids load in batches with a real "Show more" button that also triggers on scroll; tables and
histories are page-numbered. Every list returns its total, and an out-of-range page number is served
the last page.

### Errors say what the user can do

Anticipated failures (`notFound`, `conflict`, `badRequest`, `forbidden`) carry a sentence written
for the person reading it. Anything else is a fault whose text would name tables and queries, so a
production build replaces it and never attaches a stack; the tRPC route handler logs the real error.
Rendering failures land on `error.tsx`, `global-error.tsx` or `not-found.tsx`, which keep the app's
look and offer a retry and a way home.

### Theme without a flash

Light, dark and system themes are kept in a cookie and applied by a tiny inline script before the
first paint. The server never reads the cookie, so pages stay statically renderable. The palette is
oklch tokens with checked contrast; the warm highlight is reserved for prices, discounts and stars.

Node and browsers ship different ICU data, and Node puts thin spaces around the dash in a formatted
date range. `useFormatDateRange` normalises them, because a server-rendered range would otherwise
never match the browser's.

### tRPC and cookies

Most calls use the streaming batch link. Auth calls do not: a streamed response sends its headers
before the procedure runs, so a session cookie set by signing in would never reach the browser.

### Safeguards for a public demo

With `NEXT_PUBLIC_DEMO_MODE=true` the landing page offers one-click sign-in for each demo role and every
page says the data resets nightly. Because anyone can reach the demo, sign-ins and sign-ups are
rate-limited in the tRPC auth router, with counts kept in Postgres so every serverless instance sees the
same numbers: five failed sign-ins per address and twenty per client in ten minutes, and five sign-ups
per client an hour. Only failures count, so someone who knows their password is never slowed down.
Better Auth's own HTTP endpoints for those two actions are closed, since calling them directly would
bypass the limits. The client is taken from `x-forwarded-for`, which Vercel sets itself.

### Translations

The app ships in English, but every user-facing string is in `messages/en.json` and message keys are
type-checked, so a missing key is a compile error. Adding Slovak is a second catalogue and a locale
switch, with no component changes.

## Testing

**Unit tests** (Vitest) cover the rules where the edges matter: every discount tier and the rounding,
UTC dates across time zones and a daylight-saving change, every lifecycle transition, the rating
windows at 59 and 60 minutes, role and account rules, pagination, URL parsing, and that the catalogue
enums match the database.

**End-to-end tests** (Playwright) cover the main flow of each role against a real database, where the
overlap constraint, sessions and redirects actually live. The suite builds into `.next-e2e`, runs on
port 3100 against `crystal_ski_rental_test`, and reseeds before every run, so it never touches
development data. Values from `.env.test` are local defaults; variables already set in the environment
win, which is how CI points it at its own database.

The seed checks the rules the database cannot enforce (price snapshots, lifecycle timestamps, rating
eligibility, no overlaps) before writing anything, so demo data can never be something the app would
have refused.

## Continuous integration

`.github/workflows/ci.yml` runs on pushes to `main` and on pull requests: lint, typecheck, format
check, unit tests and a production build in one job, and the Playwright suite against a Postgres 17
service in another. The same checks locally are `pnpm check`, `pnpm format:check`, `pnpm test` and
`pnpm test:e2e`.

## Deployment

The public demo runs on **Vercel** (Hobby) with **Neon** Postgres (Free), both in Frankfurt.

- `vercel.json` pins the functions to `fra1` and makes the build run `prisma migrate deploy` before
  `next build`, so a deployment never serves code ahead of its schema.
- The app connects through Neon's pooled `DATABASE_URL`; migrations use the direct
  `DATABASE_URL_UNPOOLED`, because a pooler cannot hold the locks a migration takes.
- The Neon integration gives every preview deployment its own database branch, so previews and their
  migrations never touch production data.
- Better Auth's base URL and trusted origins come from Vercel's own variables (`src/lib/app-url.ts`):
  production uses its domain, a preview both its unique and its branch host. `BETTER_AUTH_URL`
  overrides them when set.

One-time setup, in the dashboards:

1. Create a Neon project in `aws-eu-central-1` with Postgres 17.
2. Import the GitHub repository into Vercel and add `BETTER_AUTH_SECRET` (`openssl rand -base64 32`)
   and `NEXT_PUBLIC_DEMO_MODE=true`.
3. Install the Neon integration on the Vercel project, and turn on automatic deletion of preview
   branches (the free plan allows ten).
4. Under the project's Deployment Checks, require the CI workflow before a deployment is promoted to
   production, and protect `main` on GitHub with the same checks.
5. Add the demo database's **direct** Neon connection string as the `DEMO_DATABASE_URL` repository secret
   on GitHub, then run the **Reset demo data** workflow once to seed it.

### Demo data reset

`.github/workflows/demo-reset.yml` migrates and reseeds the demo database every night at 03:00 UTC, and
can be started by hand from the Actions tab. Whatever visitors change, book or delete is gone by the
next morning. The seed only runs with `NODE_ENV=production` when `ALLOW_PRODUCTION_SEED=true` is set as
well, so it cannot wipe a real database by accident. Resetting also clears sessions, so everyone is
signed out.
