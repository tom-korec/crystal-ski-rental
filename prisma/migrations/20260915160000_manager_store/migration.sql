-- A manager belongs to one store, where they may change skis and run the front desk (FR-64).

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "storeId" TEXT;

-- AddForeignKey
ALTER TABLE "user" ADD CONSTRAINT "user_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

