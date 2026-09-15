-- Every reservation gets a short code the customer quotes at the counter (FR-45): six symbols from
-- capital letters and digits without O, I, 0 and 1. Existing reservations are given one here.

ALTER TABLE "reservation" ADD COLUMN "code" TEXT;

DO $$
DECLARE
  alphabet CONSTANT TEXT := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  reservation_id TEXT;
  candidate TEXT;
BEGIN
  FOR reservation_id IN SELECT "id" FROM "reservation" WHERE "code" IS NULL LOOP
    LOOP
      SELECT string_agg(substr(alphabet, 1 + floor(random() * 32)::int, 1), '')
      INTO candidate
      FROM generate_series(1, 6);

      EXIT WHEN NOT EXISTS (SELECT 1 FROM "reservation" WHERE "code" = candidate);
    END LOOP;

    UPDATE "reservation" SET "code" = candidate WHERE "id" = reservation_id;
  END LOOP;
END $$;

ALTER TABLE "reservation" ALTER COLUMN "code" SET NOT NULL;

CREATE UNIQUE INDEX "reservation_code_key" ON "reservation"("code");
