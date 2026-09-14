-- A ski can never hold two CREATED or ACTIVE reservations that share a day (BR-20).
--
-- The routers check for a clash before inserting, but only to produce a message that names the
-- ski: the check and the insert are two statements, and two concurrent bookings can both pass it.
-- This constraint is what makes the rule true.
--
-- Written by hand because Prisma cannot express exclusion constraints. `prisma migrate dev` leaves
-- it alone, but `prisma db push` never creates it, so use migrations for any database that matters.

-- gist has `&&` for ranges but no `=` for text; btree_gist adds it, so one index covers both.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "reservation"
  ADD CONSTRAINT "reservation_no_overlap"
  EXCLUDE USING gist (
    "skiId" WITH =,
    -- '[)': start inclusive, end exclusive, matching the rest of the app.
    daterange("startDate", "endDate", '[)') WITH &&
  )
  -- Cancelled and returned reservations hold no dates. Excluding RETURNED is what frees the rest of
  -- an early return (BR-15).
  WHERE (status IN ('CREATED', 'ACTIVE'));
