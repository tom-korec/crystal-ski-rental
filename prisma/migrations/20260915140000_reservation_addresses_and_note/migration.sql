-- A reservation keeps the addresses it was booked with, and an optional note for the store (FR-36).

-- AlterTable
ALTER TABLE "reservation" ADD COLUMN     "note" TEXT;

-- CreateTable
CREATE TABLE "reservation_address" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "kind" "AddressKind" NOT NULL,
    "recipient" TEXT,
    "companyId" TEXT,
    "vatId" TEXT,
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL,

    CONSTRAINT "reservation_address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "reservation_address_reservationId_kind_key" ON "reservation_address"("reservationId", "kind");

-- AddForeignKey
ALTER TABLE "reservation_address" ADD CONSTRAINT "reservation_address_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;


-- As on "customer_address": only an invoice address names a recipient and carries company numbers,
-- and it always names a recipient.
ALTER TABLE "reservation_address" ADD CONSTRAINT "reservation_address_invoice_fields" CHECK (
    ("kind" = 'INVOICE' AND "recipient" IS NOT NULL)
    OR ("kind" = 'MAILING' AND "recipient" IS NULL AND "companyId" IS NULL AND "vatId" IS NULL)
);
