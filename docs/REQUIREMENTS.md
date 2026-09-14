# Crystal Ski Rental — Requirements

> **About this document.** Crystal Ski Rental is a fictional business, and this project is a
> portfolio piece. The brief below is written the way a real client would send it, and the
> requirements that follow are what came out of the clarification rounds with that "client".
> Requirement IDs (`FR-`, `BR-`, `NFR-`) are referenced from the [implementation plan](PLAN.md) and the code.

---

## 1. The brief

> **From:** Martina Kováčová, Operations Manager, Crystal Ski Rental
> **Subject:** Online reservations for our ski rental stores
>
> Hi,
>
> we run ski rental stores in four Slovak resorts: Jasná, Tatranská Lomnica, Štrbské Pleso and
> Donovaly. Today every reservation comes in by phone or at the counter and goes into a shared
> spreadsheet. On a busy Saturday morning that means double-booked skis, customers queueing
> while we search for their booking, and no idea which skis come back when.
>
> We'd like a web application where:
>
> - **customers** can find skis that are free for their dates at the store they're going to,
>   see the price up front, book them, and cancel if their plans change;
> - **our staff** can see what's being picked up and returned today, hand skis over, take them
>   back, and keep the fleet up to date;
> - **the head office** can manage the brands and models we carry, our prices, our stores and
>   who works for us.
>
> A few things matter to us:
>
> - We price by **model**, per day, and we reward longer rentals: from 4 days up the customer
>   gets a discount that grows with the length of the rental.
> - A customer who booked must pay what they saw, even if we change the price later.
> - Every ski has a sticker with our **inventory code**. Staff need it, but customers shouldn't
>   see it.
> - Customers pick skis by length. Two pairs of the same model in different lengths are
>   different skis to us.
> - After the rental we want feedback twice: once about the **rental experience** (the store,
>   the service) and once about the **ski model** itself. We don't want people rewriting
>   reviews months later, so a review should be editable only briefly after it's written.
> - Customers need our store **addresses, phone numbers, e-mails and opening hours**.
> - It has to work on a phone, since most people will open it on the way to the slopes, and it
>   should look fresh and wintery. A dark mode would be nice for the evening.
> - We start in English. Slovak will come later, so please don't make that hard.
>
> Photos of the skis, online payment and equipment other than skis can wait for a later phase.
>
> Thanks,
> Martina

---

## 2. Business context

| Topic       | Detail                                                                                                                        |
| ----------- | ----------------------------------------------------------------------------------------------------------------------------- |
| Business    | Ski rental with 4 stores, all in Slovakia (time zone Europe/Bratislava), prices in EUR.                                       |
| Product     | Skis only. Each physical pair is one **ski** with its own inventory code and length, belonging to a **model** of a **brand**. |
| Rental unit | Whole days. A customer takes the skis on the first day and brings them back by the end of the last day.                       |
| Today       | Phone and walk-in reservations tracked in a spreadsheet.                                                                      |
| Goal        | Customers can book online, staff get a clear daily view, and double bookings stop happening.                                  |

## 3. Users and roles

| Role                    | Who                  | Can                                                                                                         |
| ----------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Visitor**             | Anyone not signed in | See the landing page, sign up, sign in.                                                                     |
| **Customer** (`USER`)   | Registered renters   | Search and book skis, see and cancel their own reservations, rate rentals and models, manage their profile. |
| **Manager** (`MANAGER`) | Store staff          | Everything on the shop floor: front desk, the fleet (skis), all reservations, and customer accounts.        |
| **Admin** (`ADMIN`)     | Head office          | Everything a manager can do, plus the catalogue (brands, models, prices, stores) and staff accounts.        |

Staff (managers and admins) do not rent. A staff member who wants to rent uses a separate
customer account.

## 4. Functional requirements

### 4.1 Accounts and access

- **FR-1** A visitor can sign up with name, e-mail and password, and becomes a customer.
- **FR-2** Anyone with an account can sign in with e-mail and password, and sign out.
- **FR-3** After signing in, a customer lands on ski search and staff land on the front desk.
- **FR-4** A signed-in user can edit their name and change their password (current password required).
- **FR-5** Pages and data are restricted by role. A user who opens a page they may not use is
  redirected to their own home rather than shown an error.

### 4.2 Catalogue (admin)

- **FR-10** An admin can create, rename and delete **brands**.
- **FR-11** An admin can create, edit and delete **models**. A model has a brand, name, ski type,
  gender, skill level and price per day. A model name is unique within its brand.
- **FR-12** An admin can create, edit and delete **stores**. A store has a name, an address (street,
  house number, city, zip code), a phone, an e-mail and opening hours as free text for each
  day of the week (empty means closed).
- **FR-13** A brand, model or store that is still in use cannot be deleted, and the admin is told why.
- **FR-14** An admin can see all ratings of a model, including comments, with the customer's name
  and a link to reply by e-mail.

### 4.3 Fleet (staff)

- **FR-20** Staff can list all skis and filter by brand, model, store, type, gender, level and length,
  and search by inventory code.
- **FR-21** Staff can add a ski: inventory code (unique), model, length in cm, store.
- **FR-22** Staff can edit a ski's inventory code and store, and take it out of rental or offer it again.
  Model and length cannot be changed. A different length is a different ski.
- **FR-23** Staff can open a ski's detail page: its attributes, its model's price and rating, and its
  full reservation history.
- **FR-24** Staff can delete a ski (see BR-30 to BR-32).

### 4.4 Search and booking (customer)

- **FR-30** A customer searches for skis by rental dates (required) and can narrow the results by
  store, brand, model, type, gender, skill level, length range, maximum price per day and
  minimum model rating.
- **FR-31** Results can be sorted by best rated (default), price low to high, and price high to low.
- **FR-32** Each result shows brand and model, length, type, gender and level badges, store, the
  model's average rating, the price per day, and the **total for the chosen dates with the
  discount applied** and visible.
- **FR-33** The customer can reserve a result. Before confirming they see the price breakdown
  (days × price per day, discount, total) and the store's address, contacts and opening hours.
- **FR-34** Results never include skis that are out of rental, deleted, or already booked for any of
  the chosen days.
- **FR-35** The filters and page state are kept in the URL, so a search can be reloaded, shared and
  bookmarked.

### 4.5 My reservations (customer)

- **FR-40** A customer sees their reservations, newest first, with ski, store (with address and
  contacts), dates, status and the price they agreed to.
- **FR-41** A customer can cancel a reservation that has not started yet (BR-12).
- **FR-42** For a returned reservation, the customer can **rate the rental**: score 1–5 and an optional note.
- **FR-43** For a returned reservation, the customer can **rate the ski model**: score 1–5 and an
  optional comment.
- **FR-44** While a rating can still be edited, the page says until when. After that it shows as locked.

### 4.6 Front desk (staff)

- **FR-50** Staff have a front desk page per store listing:
  - pickups due today
  - returns due today
  - overdue pickups (the start date has passed and the skis weren't collected)
  - overdue returns (the end date has passed and the skis aren't back)
- **FR-51** From the front desk and from any reservation list, staff can **mark picked up**, **mark
  returned** and **cancel** a reservation, whenever the lifecycle allows it (BR-10 to BR-15).

### 4.7 Reservations and accounts overview (staff)

- **FR-60** Staff can see the reservation history of any ski and of any customer, with status, price
  and the rental rating and note.
- **FR-61** Managers can list, create, edit and delete **customer** accounts. Admins can do the same for
  **all** accounts, including making someone a manager or admin.
- **FR-62** A manager cannot create, edit, delete, promote or demote a staff account. This is enforced by
  the server, not only hidden in the UI.
- **FR-63** A deleted account can be restored. Its e-mail address stays reserved while deleted.

## 5. Business rules

### 5.1 Pricing

- **BR-1** Prices are per model, per day, in EUR with two decimals, stored exactly (no floating point).
- **BR-2** Rental length = number of days, from the first day up to and including the last day. Minimum 1,
  maximum **30** days. A reservation cannot start in the past.
- **BR-3** Discount by rental length, applied to the **whole** rental:

  | Days  | Discount |
  | ----- | -------- |
  | 1–3   | 0 %      |
  | 4–6   | 10 %     |
  | 7–10  | 15 %     |
  | 11–19 | 20 %     |
  | 20–30 | 25 %     |

- **BR-4** `total = price per day × days × (1 − discount)`, rounded half-up to the cent.
- **BR-5** The price per day, number of days, discount and total are **saved on the reservation** when it
  is made. Later price changes don't affect existing reservations.

### 5.2 Reservation lifecycle

- **BR-10** Statuses: `CREATED` (booked), `ACTIVE` (picked up), `RETURNED`, `CANCELLED_BY_USER`,
  `CANCELLED_BY_STORE`.
- **BR-11** Allowed transitions, and nothing else:

  | From      | To                   | Who          | When                                                       |
  | --------- | -------------------- | ------------ | ---------------------------------------------------------- |
  | `CREATED` | `CANCELLED_BY_USER`  | the customer | before the first day                                       |
  | `CREATED` | `CANCELLED_BY_STORE` | staff        | any time before pickup (this is how a no-show is recorded) |
  | `CREATED` | `ACTIVE`             | staff        | on a day within the rental period                          |
  | `ACTIVE`  | `RETURNED`           | staff        | any day                                                    |

- **BR-12** Active and returned reservations cannot be cancelled.
- **BR-13** Each transition records when it happened and which user performed it.
- **BR-14** No-shows and late returns are handled by staff. The system lists them (FR-50) but never
  changes a reservation on its own.
- **BR-15** **Early return:** the customer pays the agreed total, and the ski becomes bookable again from
  the day it was returned.

### 5.3 Availability

- **BR-20** A ski can never have two reservations in `CREATED` or `ACTIVE` whose periods share a day.
  This must hold even when two customers book at the same moment, and is guaranteed by the database.
- **BR-21** One reservation may end on the day the next begins. Pickup and return times are not tracked
  (whole days only).
- **BR-22** Taking a ski out of rental stops new bookings. Existing reservations stay valid, and staff are
  warned how many there are.

### 5.4 Fleet changes and deletion

- **BR-30** A ski cannot be **moved to another store** while it is picked up or has upcoming reservations,
  because the customer expects it where they booked it.
- **BR-31** A ski cannot be **deleted** while any of its reservations is `CREATED` or `ACTIVE`.
- **BR-32** A ski with reservation history is soft-deleted (hidden from lists, kept for history). A ski
  without any history is removed completely.
- **BR-33** Accounts are soft-deleted, and signing out is immediate.

### 5.5 Ratings

- **BR-40** **Rental rating:** one per reservation, possible only once it is `RETURNED`. Editable for **1 hour**
  after it was first submitted, then locked for good.
- **BR-41** **Model rating:** one per customer per model, created or changed **through a returned
  reservation** of a ski of that model. Each returned reservation opens one **1-hour edit window**, starting
  when the rating is first submitted through it. To change a locked model rating, the customer needs
  a newer returned reservation of that model.
- **BR-42** A model's average rating and number of ratings are shown to customers. Comments and notes
  are visible to staff only, and staff reply by e-mail.

### 5.6 Privacy

- **BR-50** Customers never see inventory codes, other customers' identities, comments or notes.

## 6. Non-functional requirements

- **NFR-1 Accessibility.** The fundamentals: semantic markup, labelled form controls, keyboard
  navigation, visible focus states and sufficient colour contrast. That is roughly WCAG 2.1 AA for the
  flows involved.
- **NFR-2 Responsive.** Every screen is usable from 375 px wide. Tables scroll inside their own
  container, never the whole page.
- **NFR-3 Visual identity.** "Crystal" palette with glacier blue, snow and ink neutrals, and an alpenglow
  accent for prices, discounts and ratings. Light, dark and system themes, with no flash of the wrong
  theme on load. Logo: _Ski Flake_.
- **NFR-4 Internationalisation-ready.** English in release 1. Every user-facing string lives in a message
  catalogue, so adding Slovak needs no component changes.
- **NFR-5 Security.**
  - Roles are enforced on the server for every page and every API call.
  - A user cannot grant themselves a role.
  - Passwords are hashed.
  - Error messages never leak internals in production.
- **NFR-6 Correctness of dates.** Dates are whole calendar days and must not shift by a day for users in
  any time zone.
- **NFR-7 Money.** Exact decimal arithmetic end to end. The price shown before booking equals the price saved.
- **NFR-8 Quality.**
  - Linting, type checking and automated tests on every change.
  - Unit tests for pricing, lifecycle and rating rules.
  - End-to-end tests for the main flow of each role.
- **NFR-9 Demo-ready.** The app can be deployed as a public demo with sample data, demo accounts for each
  role, and a regular reset of the data.

## 7. Release plan

|                                | Release 1 | Later                             |
| ------------------------------ | --------- | --------------------------------- |
| Catalogue, stores, fleet       | ✓         | Ski **photos**                    |
| Search, booking, pricing tiers | ✓         | Online payment, deposits          |
| Lifecycle, front desk          | ✓         | Automatic no-show handling        |
| Ratings                        | ✓         | Public comments with moderation   |
| Accounts and roles             | ✓         |                                   |
| English                        | ✓         | **Slovak**                        |
| Light and dark theme           | ✓         |                                   |
| Public demo deployment         | ✓         |                                   |
|                                |           | Boots, poles, helmets, snowboards |

## 8. Out of scope

- Payments, invoices, VAT.
- E-mail or SMS notifications. Staff reply to feedback from their own mail client.
- Pickup and return times, early pickup, and reasons for early or late returns.
- Blocking new bookings of a ski that is overdue for return. Staff handle the clash at the counter.
- Maps and geolocation.
- Social sign-in.

## 9. Glossary

| Term               | Meaning                                                                                       |
| ------------------ | --------------------------------------------------------------------------------------------- |
| **Brand**          | Ski manufacturer, e.g. Atomic.                                                                |
| **Model**          | A product line of a brand, e.g. Atomic Redster G9. It carries price, type, gender and level.  |
| **Ski**            | One physical pair: a model in a specific length, at a specific store, with an inventory code. |
| **Inventory code** | Staff-only identifier printed on the ski, e.g. `SK-0142`.                                     |
| **Store**          | A rental location with address, contacts and opening hours.                                   |
| **Front desk**     | The staff page for today's pickups and returns and the overdue ones.                          |
| **Rental rating**  | Feedback on the rental experience, attached to one reservation.                               |
| **Model rating**   | Feedback on a ski model, one per customer per model.                                          |
