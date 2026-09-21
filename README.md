# Crystal Ski Rental

Online reservations for a (fictional) ski rental with four stores in Slovak resorts. Customers find
skis that are free for their dates, see the price with a length-of-rental discount, book, cancel,
and rate both the rental and the ski model. Store staff run the front desk (pickups, returns,
no-shows), the fleet and the customer accounts. Admins also own the catalogue, prices, stores and
staff accounts.

It is a portfolio project built the way a client project would be: [the brief and the
requirements](docs/REQUIREMENTS.md) first, then [a plan](docs/PLAN.md) delivered as a sequence of
reviewable commits. [What real use would still need](docs/PRODUCTION-READINESS.md) lists the gaps
between this demo and a rental that takes real customers.

## Getting started

Requires Node 24+, pnpm 9 and Docker.

```bash
pnpm install
cp .env.example .env     # then set BETTER_AUTH_SECRET (openssl rand -base64 32)
pnpm db:up               # Postgres 17 on localhost:5433 and Mailpit on localhost:8025
pnpm db:migrate          # create the schema
pnpm db:seed             # demo stores, fleet, accounts, reservations and ratings
pnpm dev                 # http://localhost:3000
```

Postgres listens on **5433** so it does not collide with another Postgres on the default port. Mailpit
catches every e-mail the app sends and delivers none of it; read them at http://localhost:8025.

### Demo accounts

These passwords are for a local database only. A deployed demo is seeded with its own secret password
(see [Deployment](#deployment)).

| Role     | E-mail                           | Password       |
| -------- | -------------------------------- | -------------- |
| Admin    | `admin@crystalskirental.test`    | `Admin123!`    |
| Manager  | `manager@crystalskirental.test`  | `Manager123!`  |
| Customer | `customer@crystalskirental.test` | `Customer123!` |

The demo manager runs the Jasná store, so they can change only Jasná's skis; each of the other three
stores has its own manager (`ondrej.kollar@`, `eva.mikulova@` and `lucia.simkova@crystalskirental.test`, with
the manager password). The other customers are `<first>.<last>@example.test` with the customer password.

The demo data is 4 stores with 100 pairs each, 5 brands and 27 models, 100 customers and 1,000 reservations
from three months back to three months ahead, with ratings. Half the customers came once or twice; the
others are regulars. Nothing in it is dated: every date counts from the day of seeding, so the demo never
goes stale.

Some of it is scripted so every screen has something to show: the demo customer has a rental with a
locked rating, a newer rental of the same model that may update it, one returned today whose ratings
are still editable, one picked up, a family booking coming up and one cancelled. They also have a mailing
address and an invoice address made out to a company. The Jasná front desk has an item in each of its
four lists, and nothing else.

### Seed data

`prisma/seed/data/` is a committed snapshot, one record per line:

- **Written by hand:** `stores.json`, `brands.json`, `models.json`, `staff.json`.
- **Generated:** `customers.json`, `skis/<store>.json` and `reservations/<store>.json`, the latter with each
  reservation's ratings. `pnpm db:seed:generate` rewrites them from the hand-written files and
  `prisma/seed/generate/`, the same way every time; commit what changes.

Files refer to each other by what people read: stores by slug, models by "Brand Model", accounts by
e-mail and skis by inventory code. Days are offsets from today (`"start": -12`), and moments are a day and
a UTC time (`"-12 09:30"`) or minutes before seeding (`"40m"`). `pnpm db:seed` validates the files, checks
the result and writes it; it never generates anything.

## Scripts

| Command                 | Does                                        |
| ----------------------- | ------------------------------------------- |
| `pnpm dev`              | Development server                          |
| `pnpm build`            | Production build                            |
| `pnpm check`            | ESLint and TypeScript                       |
| `pnpm format:write`     | Prettier                                    |
| `pnpm test`             | Unit tests (Vitest)                         |
| `pnpm test:e2e`         | End-to-end tests (Playwright, own database) |
| `pnpm db:up`            | Start Postgres and Mailpit in Docker        |
| `pnpm db:generate`      | Create and apply a migration                |
| `pnpm db:migrate`       | Apply pending migrations                    |
| `pnpm db:seed`          | Reset the database to the demo data         |
| `pnpm db:seed:generate` | Regenerate the generated seed data files    |
| `pnpm db:studio`        | Browse the database                         |

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · tRPC 11 with TanStack Query · Prisma 7 on
PostgreSQL 17 · Better Auth · Zod 4 · Tailwind CSS 4 with shadcn/ui on Base UI · React Hook Form ·
next-intl · decimal.js · Vitest and Playwright · GitHub Actions.

## Layout

```
docs/                 Requirements, implementation plan and production readiness
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

### Optimised for search, kept out of it

The public pages carry the metadata a real site needs: canonical URLs, Open Graph and Twitter cards, a
generated share image, a sitemap and `SkiRental` structured data built from the stores' own addresses and
opening hours. `SEARCH_INDEXING` decides whether they may be indexed, and it is off, so every page sends
`noindex, nofollow`.

`robots.ts` still allows crawling the public pages, because a crawler has to fetch a page to see its
`noindex`, and because Google's own testing tools cannot inspect what `robots.txt` blocks. The signed-in
areas and the API are never crawlable. The demo describes four stores that do not exist, so keeping it out
of results matters more than being found.

### E-mail goes nowhere by accident

One Nodemailer transport over SMTP serves every environment, so switching providers is configuration,
not code: Mailpit locally and in CI, Resend in production. Without `SMTP_HOST` and `EMAIL_FROM` nothing
is sent, the password reset says so instead of failing, and the address confirmation is not required at
all, so the app still works end to end without a mail server.

`src/lib/email-address.ts` decides where a message may go, as a pure function with its own tests. The
seeded accounts use reserved domains (`.test`, `example.com`), which no mail server can deliver to:
sending to them would bounce and cost the sending domain its reputation. In production those messages
go to a capture inbox (`EMAIL_CAPTURE_ADDRESS`) with the original recipient in the subject, so they can
be read in one place. A password reset is the exception: it is never captured, because every seeded
account shares the public demo password and the link would hand the account over (FR-8).

Sending happens in `after()`, once the response is on its way, so a slow mail server cannot delay a
reset or a booking, and the answer is the same whether or not the address has an account.

### Confirming an address

A sign-up gets a confirmation link instead of a session, and signing in before it is opened is refused
with a button that sends a new one (FR-9). That refusal is not a failed attempt, so it never counts
towards the sign-in rate limit; the resend has its own limit, per address and per client, and answers
the same for an address with no account, one waiting and one already confirmed. A new link is only ever
sent when someone asks for it, never automatically on a refused sign-in, which would turn the form into
a way of mailing a stranger. Seeded and staff-created accounts count as confirmed: their addresses could
never receive a link.

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
win, which is how CI points it at its own database. The suite refuses any database that is not local and
named `*_test`, so it can never run against the deployed demo.

The seed checks the rules the database cannot enforce (price snapshots, lifecycle timestamps, rating
eligibility, no pair on two rentals at once, everything created within the last 90 days, managers handling
only their own store) before writing anything, so demo data can never be something the app would have
refused, nor a history that could not have happened.

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
2. Import the GitHub repository into Vercel and add `BETTER_AUTH_SECRET` (`openssl rand -base64 32`),
   plus the e-mail variables for production: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`,
   `EMAIL_FROM` and `EMAIL_CAPTURE_ADDRESS`.
   Leave `NEXT_PUBLIC_DEMO_MODE` unset: the one-click sign-in uses the committed passwords, which a
   deployment does not accept.
3. Install the Neon integration on the Vercel project, and turn on automatic deletion of preview
   branches (the free plan allows ten).
4. Under the project's Deployment Checks, require the CI workflow before a deployment is promoted to
   production, and protect `main` on GitHub with the same checks.
5. On GitHub, add two repository secrets: the demo database's **direct** Neon connection string as
   `DEMO_DATABASE_URL`, and the password every seeded account should sign in with as `DEMO_SEED_PASSWORD`.
   Then run the **Reset demo data** workflow once to seed it.

### Demo data reset

`.github/workflows/demo-reset.yml` migrates and reseeds the demo database every night at 03:00 UTC, and
can be started by hand from the Actions tab. Whatever visitors change, book or delete is gone by the
next morning. The seed refuses a database that is not on localhost, or any run with `NODE_ENV=production`,
unless `ALLOW_PRODUCTION_SEED=true` is set, so a remote URL left in `.env` cannot be wiped by accident. Such a
run also requires `SEED_PASSWORD` and gives it to every account, because the passwords in the seed data are
public. Resetting also clears sessions, so everyone is signed out.
