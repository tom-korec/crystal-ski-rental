-- Opening hours become structured (FR-12, BR-7): each weekday is intervals like "8:00-12:00;13:00-20:00"
-- and null means closed, so bookings can be checked against them. Special days override a weekday for
-- one date. Existing hours written for people ("8:00 – 16:30") are rewritten in the new form; anything
-- that does not fit it is kept as written for an admin to correct, and an empty day becomes closed.

-- AlterTable
ALTER TABLE "store" ALTER COLUMN "openingHoursMonday" DROP NOT NULL,
ALTER COLUMN "openingHoursMonday" DROP DEFAULT,
ALTER COLUMN "openingHoursTuesday" DROP NOT NULL,
ALTER COLUMN "openingHoursTuesday" DROP DEFAULT,
ALTER COLUMN "openingHoursWednesday" DROP NOT NULL,
ALTER COLUMN "openingHoursWednesday" DROP DEFAULT,
ALTER COLUMN "openingHoursThursday" DROP NOT NULL,
ALTER COLUMN "openingHoursThursday" DROP DEFAULT,
ALTER COLUMN "openingHoursFriday" DROP NOT NULL,
ALTER COLUMN "openingHoursFriday" DROP DEFAULT,
ALTER COLUMN "openingHoursSaturday" DROP NOT NULL,
ALTER COLUMN "openingHoursSaturday" DROP DEFAULT,
ALTER COLUMN "openingHoursSunday" DROP NOT NULL,
ALTER COLUMN "openingHoursSunday" DROP DEFAULT;

-- Rewrite the hours people typed into the structured form where they fit it.
UPDATE "store" SET "openingHoursMonday" = CASE
  WHEN btrim("openingHoursMonday") = '' THEN NULL
  WHEN regexp_replace(regexp_replace("openingHoursMonday", '\s+', '', 'g'), '[–—]', '-', 'g') ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9](;([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9])*$' THEN regexp_replace(regexp_replace("openingHoursMonday", '\s+', '', 'g'), '[–—]', '-', 'g')
  ELSE "openingHoursMonday"
END;
UPDATE "store" SET "openingHoursTuesday" = CASE
  WHEN btrim("openingHoursTuesday") = '' THEN NULL
  WHEN regexp_replace(regexp_replace("openingHoursTuesday", '\s+', '', 'g'), '[–—]', '-', 'g') ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9](;([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9])*$' THEN regexp_replace(regexp_replace("openingHoursTuesday", '\s+', '', 'g'), '[–—]', '-', 'g')
  ELSE "openingHoursTuesday"
END;
UPDATE "store" SET "openingHoursWednesday" = CASE
  WHEN btrim("openingHoursWednesday") = '' THEN NULL
  WHEN regexp_replace(regexp_replace("openingHoursWednesday", '\s+', '', 'g'), '[–—]', '-', 'g') ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9](;([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9])*$' THEN regexp_replace(regexp_replace("openingHoursWednesday", '\s+', '', 'g'), '[–—]', '-', 'g')
  ELSE "openingHoursWednesday"
END;
UPDATE "store" SET "openingHoursThursday" = CASE
  WHEN btrim("openingHoursThursday") = '' THEN NULL
  WHEN regexp_replace(regexp_replace("openingHoursThursday", '\s+', '', 'g'), '[–—]', '-', 'g') ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9](;([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9])*$' THEN regexp_replace(regexp_replace("openingHoursThursday", '\s+', '', 'g'), '[–—]', '-', 'g')
  ELSE "openingHoursThursday"
END;
UPDATE "store" SET "openingHoursFriday" = CASE
  WHEN btrim("openingHoursFriday") = '' THEN NULL
  WHEN regexp_replace(regexp_replace("openingHoursFriday", '\s+', '', 'g'), '[–—]', '-', 'g') ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9](;([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9])*$' THEN regexp_replace(regexp_replace("openingHoursFriday", '\s+', '', 'g'), '[–—]', '-', 'g')
  ELSE "openingHoursFriday"
END;
UPDATE "store" SET "openingHoursSaturday" = CASE
  WHEN btrim("openingHoursSaturday") = '' THEN NULL
  WHEN regexp_replace(regexp_replace("openingHoursSaturday", '\s+', '', 'g'), '[–—]', '-', 'g') ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9](;([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9])*$' THEN regexp_replace(regexp_replace("openingHoursSaturday", '\s+', '', 'g'), '[–—]', '-', 'g')
  ELSE "openingHoursSaturday"
END;
UPDATE "store" SET "openingHoursSunday" = CASE
  WHEN btrim("openingHoursSunday") = '' THEN NULL
  WHEN regexp_replace(regexp_replace("openingHoursSunday", '\s+', '', 'g'), '[–—]', '-', 'g') ~ '^([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9](;([01]?[0-9]|2[0-3]):[0-5][0-9]-([01]?[0-9]|2[0-4]):[0-5][0-9])*$' THEN regexp_replace(regexp_replace("openingHoursSunday", '\s+', '', 'g'), '[–—]', '-', 'g')
  ELSE "openingHoursSunday"
END;

-- CreateTable
CREATE TABLE "store_special_day" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "hours" TEXT,
    "name" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_special_day_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "store_special_day_storeId_date_key" ON "store_special_day"("storeId", "date");

-- AddForeignKey
ALTER TABLE "store_special_day" ADD CONSTRAINT "store_special_day_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

