# Crystal Ski Rental — What real use would still need

> The app covers booking, the rental lifecycle, the fleet, the catalogue, accounts and ratings, and runs
> as a public demo. This document lists what a real ski rental would still need before it took real
> customers and money: first what blocks launch, then the counter, money, operations and running it.
> Requirement IDs refer to [REQUIREMENTS.md](REQUIREMENTS.md).

## Where the app is today

**Customers**

- Search free skis by store and dates, with filters.
- Build a reservation of up to 8 pairs from one store in a cart.
- Book with addresses and a note, and see a reservation code.
- Cancel before the first day, and rate the rental and each model.

**Staff**

- Front desk per store, with pickups, returns and no-shows behind confirmations, and lookup by code.
- Reservations list with search and filters, and a full reservation page.
- Fleet, accounts, stores and models with brands.

**Rules and data**

- Managers belong to one store and change skis only there.
- Prices are exact decimals with length-of-rental discounts and snapshots.
- The database guarantees no double booking.
- Rating edit windows.

**Quality**

- Unit and end-to-end tests and CI.
- Light and dark themes, phone layouts.
- Rate-limited sign-in, and a deterministic demo seed.

**Not done yet from release 1:** the deployment itself (repository, Neon, Vercel, CI checks, the first
demo reset; see PLAN §4 Part E) and the manual accessibility pass. `PLAN.md` also describes the data model
and screens as first planned, before multi-pair reservations, addresses, reservation codes and store
managers.

## How to read the priorities

| Priority | Meaning                                                                     |
| -------- | --------------------------------------------------------------------------- |
| **P0**   | Blocks real customers. Nothing launches without it.                         |
| **P1**   | Needed at the counter in the first season. Staff work around it at a cost.  |
| **P2**   | Money and pricing a real business expects. Can start with manual processes. |
| **P3**   | Operations and management. Grows in value with the business.                |
| **P4**   | Worthwhile later.                                                           |

Sizes follow PLAN: **S** a day or less, **M** a few days, **L** a week or more.

## P0 — Blocks launch

### Accounts and security

- **No password reset.** A customer who forgets their password is locked out for good, and staff can
  only set a new password by hand. Better Auth supports reset tokens; it needs an e-mail provider. **M**
- **No e-mail verification.** Anyone can sign up with someone else's address, and staff then contact the
  wrong person. **S** (after e-mail exists)
- **No two-factor sign-in for staff.** A leaked manager password exposes every customer's name,
  e-mail and addresses. **M**

### Messages

- **No e-mails at all:**
  - a booking confirmation with the code, the store and its opening hours;
  - a reminder the day before pickup;
  - a notice when the store cancels a booking;
  - a password reset.

  This needs a transactional e-mail provider, templates in the message catalogue, and sending outside
  the request, so a slow provider cannot fail a booking. **M**

### Booking rules that are not enforced

- **"Today" is judged in UTC.** All four stores are in Slovakia (UTC+1, or UTC+2 in summer). Between
  midnight and 1–2 a.m. local time:
  - the front desk shows yesterday's lists;
  - "a rental cannot start in the past" lets people book yesterday.

  "Today" should be the stores' local day, one time zone for the whole chain. **S**

- **Bookings can start or end on a day the store is closed.** Opening hours are free text, so nothing
  checks them. They need a structured form (closed, or open with times), with free text kept for the
  opening-hours display. **M**
- **Front-desk actions are limited by store only on screen.** A manager's pickup, return and cancel
  buttons appear only for their own store, but the API accepts them for any store (FR-64, agreed as a
  screen-only rule). Real use should enforce it on the server like ski changes. **S**

### Legal and privacy (GDPR)

- **No terms and conditions or privacy policy, and nothing accepted at sign-up or booking.** **S** for
  the flow; the texts come from the business.
- **No rental agreement or liability waiver.** Rental shops usually have one signed at pickup, stating
  the customer's responsibility for damage and loss. **M**
- **No way to export or erase a customer's data.** Removing an account today is a soft delete that keeps
  everything. Erasure has to anonymise the person while keeping the booking history truthful (BR-33). **M**
- **No record of consent** for marketing or data processing, and no cookie notice (only a functional
  theme cookie today, which may be exempt). **S**

### Sales channel

- **Only signed-in customers can see skis and prices.** Most shops let people browse availability first
  and ask for an account only when booking. **M**
- **Staff cannot create a reservation.** A walk-in customer or a phone booking has no way in; staff would
  have to create a customer account and book as them. There should be a counter booking flow that picks
  or creates the customer, and a guest customer without a password. **L**

## P1 — The rental counter

- **Boots, poles, helmets and packages.**
  - Rentals are mostly sold as sets (skis with boots and poles, kids' sets), and boots are fitted by size.
  - This changes the data model: an item becomes a piece of equipment of some kind, and packages have
    their own prices.
  - Already listed as "later" in REQUIREMENTS §7. **L**
- **Fitting details for bindings.** Height, weight, age, skill and boot sole length, recorded per
  person on the booking, so staff can set the release value (DIN) safely, with a record that it was
  checked. A safety and liability matter. **M**
- **Changing a booking.** Customers can only cancel and book again, which may lose the skis. Needed:
  - change the dates, and add or remove pairs, with the price quoted again;
  - staff doing the same at the counter. **M**
- **Swapping a pair at pickup or during the rental.** A different length, or a broken ski, needs the item
  changed without cancelling the reservation, keeping who did it and why. **M**
- **Printed or PDF documents.** The rental agreement or receipt at pickup, and a return receipt. **M**
- **QR code** of the reservation code in the confirmation e-mail and on "My reservations", scanned at the
  counter. **S**
- **Blocking bookings of pairs overdue for return.** The next customer arrives and the skis are not
  back. Listed in PLAN §8; today staff sort it out at the counter (REQUIREMENTS §8). **M**
- **Pickup and return times.** Whole days only today, so the counter cannot plan the morning rush or
  same-day turnaround. **M**
- **Front desk search and a wider view.** The desk shows today and overdue only. Staff also want
  tomorrow's pickups (to prepare skis the evening before) and a week at a glance. **S–M**

## P2 — Money

- **Payments.** None online or recorded at the counter. Minimum: record how and when a rental was paid
  (cash, card, invoice). Full: online payment or a deposit at booking through a payment provider, with
  refunds. **M–L**
- **Deposits and damage charges.** A deposit held at pickup, and charges for damage or loss on return,
  tied to a damage report. **M**
- **Cancellation policy.** Free cancellation until a deadline, a fee after, and no-show charges. Today a
  customer can cancel for free until the first day (BR-11). **M**
- **Invoices and VAT.**
  - Numbered invoices and credit notes, with VAT lines, in PDF.
  - The invoice address is already stored on each reservation (FR-6, FR-36).
  - Slovak invoicing rules apply. **L**
- **Seasonal and store pricing.** One price per model today. Real rentals charge more at Christmas,
  in February holidays and at weekends, sometimes differently per resort. Needs price periods, with
  the snapshot on the reservation kept as it is. **M**
- **Discounts beyond length of rental:** promo codes, children's and group pricing, and season passes or
  partner deals with the resorts. **M**

## P3 — Operations and management

- **Servicing:**
  - a turnaround gap between rentals for waxing and edges;
  - a service history per pair;
  - damage notes taken at return;
  - retiring a pair once worn out.

  "Out of rental" today is a single switch without a reason. **M**

- **Moving stock between stores.** Today an admin edits a ski's store. Real transfers are planned,
  travel, and arrive, and the pair is unavailable in between. **M**
- **Reports:**
  - utilisation per store and model;
  - revenue per store, model and period;
  - no-show and cancellation rates;
  - ratings trends;
  - exports to CSV for accounting. **M–L**
- **Staff roles beyond admin and manager:** counter staff who cannot change the fleet or accounts, and
  area managers across stores. Discussed and set aside as too much for now; store managers cover the most
  pressing need (FR-64). **M**
- **Audit log.** Who changed a price, a store's details, a ski or an account, and when. Today only a
  reservation's lifecycle records who acted (BR-13). **M**
- **Stock planning:** how many pairs of which model and length each store needs, from past demand. **L**

## P4 — Later

- **Slovak**, then Polish, Hungarian and German for guests (PLAN §8). The message catalogue is ready; server
  error messages still need to become translation keys. **M**
- **Model photos** (PLAN §8). **M**
- **Public model comments** with moderation (PLAN §8). **M**
- **Size advice** in the search from the customer's height, weight and level. **S**
- **Customer self-service extras:** a family or group profile so parents book for their children without
  retyping fitting details; favourite store. **M**
- **Search engine visibility** for public store and model pages, once they exist. **S**

## Running it in production

- **Deployment** as planned (PLAN §4 Part E): repository, Neon, Vercel, CI required before release,
  the nightly demo reset. A real deployment would add separate staging and production databases, and
  no demo reset. **S**
- **Error tracking and logs.** Failures are masked for users (NFR-5) but not reported anywhere. **S**
- **Uptime monitoring and alerts**, for the site and the scheduled jobs. **S**
- **Backups and restore.** Neon keeps history, but a restore has never been tried. It should be written
  down and tried once. **S**
- **Rate limits beyond sign-in.** Booking, search and the address and rating APIs are not limited, so
  one client can hammer them. **S**
- **Accessibility audit** with a screen reader and keyboard on every screen, in both themes, at 375 px
  (PLAN §5). **M**
- **Performance under load.** Search and the front desk were only tried against the demo data. They need
  a test with a few seasons of reservations and indexes checked against real query plans. **M**
- **Data retention.** How long reservations, addresses, ratings and rate-limit rows are kept, and a job
  that clears them. **S**

## Decisions the business needs to make

1. Are online payments or deposits needed at launch, or is paying at the counter enough for the first season?
2. What is the cancellation and no-show policy, and does it cost the customer anything?
3. Are boots, poles and helmets in the first season, and are they sold as packages?
4. Which prices change by season or store, and when do the seasons start and end?
5. Can people browse without an account, and can staff book for walk-in customers without one?
6. What goes in the rental agreement, and must it be signed at pickup?
7. How long must customer data be kept, and what does "delete my account" have to remove?
8. Which languages come after English, and in what order?

## Suggested order

1. **Finish release 1:** deploy, run the accessibility pass, bring `PLAN.md` up to date.
2. **Before any real customer:** stores' local day and closed-day checks, server-side store rule for
   the front desk, password reset with e-mail, booking e-mails, terms and privacy, data export and
   erasure.
3. **First season at the counter:** staff bookings for walk-ins, changing bookings, fitting details,
   documents at pickup, recording payments.
4. **Grow:** equipment and packages, seasonal pricing, payments online, servicing, reports.
