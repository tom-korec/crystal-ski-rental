-- CreateEnum
CREATE TYPE "AddressKind" AS ENUM ('MAILING', 'INVOICE');

-- CreateTable
CREATE TABLE "customer_address" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "kind" "AddressKind" NOT NULL,
    "recipient" TEXT,
    "companyId" TEXT,
    "vatId" TEXT,
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "country" TEXT NOT NULL DEFAULT 'SK',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_address_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_address_userId_kind_key" ON "customer_address"("userId", "kind");

-- AddForeignKey
ALTER TABLE "customer_address" ADD CONSTRAINT "customer_address_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Only an invoice address is made out to someone and carries company numbers, and it always names a
-- recipient (FR-6). Prisma cannot express check constraints, so this lives only here.
ALTER TABLE "customer_address" ADD CONSTRAINT "customer_address_invoice_fields" CHECK (
    ("kind" = 'INVOICE' AND "recipient" IS NOT NULL)
    OR ("kind" = 'MAILING' AND "recipient" IS NULL AND "companyId" IS NULL AND "vatId" IS NULL)
);
