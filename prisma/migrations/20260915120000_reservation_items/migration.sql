-- A reservation holds one or more skis from one store (FR-33, BR-6). Each ski becomes a
-- reservation item with its own price snapshot, and the no-overlap guarantee moves to the items.
-- Existing reservations keep their data: each becomes a reservation with one item.

-- The items, filled from the reservations as they are today.
CREATE TABLE "reservation_item" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "skiId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "holdsDates" BOOLEAN NOT NULL DEFAULT true,
    "pricePerDay" DECIMAL(10,2) NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,

    CONSTRAINT "reservation_item_pkey" PRIMARY KEY ("id")
);

INSERT INTO "reservation_item" ("id", "reservationId", "skiId", "startDate", "endDate", "holdsDates", "pricePerDay", "totalPrice")
SELECT gen_random_uuid()::text, "id", "skiId", "startDate", "endDate", "status" IN ('CREATED', 'ACTIVE'), "pricePerDay", "totalPrice"
FROM "reservation";

-- The store moves up to the reservation. A ski cannot change store while it has open reservations
-- (BR-30), so its current store is the one every reservation was made at.
ALTER TABLE "reservation" ADD COLUMN "storeId" TEXT;
UPDATE "reservation" AS r SET "storeId" = s."storeId" FROM "ski" AS s WHERE s."id" = r."skiId";
ALTER TABLE "reservation" ALTER COLUMN "storeId" SET NOT NULL;

ALTER TABLE "reservation" DROP CONSTRAINT "reservation_no_overlap";
ALTER TABLE "reservation" DROP CONSTRAINT "reservation_skiId_fkey";
DROP INDEX "reservation_skiId_status_startDate_idx";
DROP INDEX "reservation_status_endDate_idx";
DROP INDEX "reservation_status_startDate_idx";
ALTER TABLE "reservation" DROP COLUMN "pricePerDay", DROP COLUMN "skiId";

CREATE INDEX "reservation_item_skiId_holdsDates_startDate_idx" ON "reservation_item"("skiId", "holdsDates", "startDate");
CREATE UNIQUE INDEX "reservation_item_reservationId_skiId_key" ON "reservation_item"("reservationId", "skiId");
CREATE INDEX "reservation_storeId_status_startDate_idx" ON "reservation"("storeId", "status", "startDate");
CREATE INDEX "reservation_storeId_status_endDate_idx" ON "reservation"("storeId", "status", "endDate");

ALTER TABLE "reservation" ADD CONSTRAINT "reservation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "reservation_item" ADD CONSTRAINT "reservation_item_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "reservation_item" ADD CONSTRAINT "reservation_item_skiId_fkey" FOREIGN KEY ("skiId") REFERENCES "ski"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- A ski can never be in two CREATED or ACTIVE reservations that share a day (BR-20). The routers
-- check first only to name the clash; this constraint is what makes the rule true. Returned and
-- cancelled reservations hold no dates, which is what frees the rest of an early return (BR-15).
ALTER TABLE "reservation_item"
  ADD CONSTRAINT "reservation_item_no_overlap"
  EXCLUDE USING gist (
    "skiId" WITH =,
    daterange("startDate", "endDate", '[)') WITH &&
  )
  WHERE ("holdsDates");

-- Items follow their reservation's status. Reservations only ever change status after they are
-- created, so an update trigger is enough; new items are inserted holding their dates.
CREATE FUNCTION "reservation_item_follow_status"() RETURNS trigger AS $$
BEGIN
  UPDATE "reservation_item"
  SET "holdsDates" = NEW."status" IN ('CREATED', 'ACTIVE')
  WHERE "reservationId" = NEW."id";
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER "reservation_item_follow_status"
  AFTER UPDATE OF "status" ON "reservation"
  FOR EACH ROW
  WHEN (OLD."status" IS DISTINCT FROM NEW."status")
  EXECUTE FUNCTION "reservation_item_follow_status"();
