-- Customers accept the Terms and Privacy policy, and each booking the Rental agreement; the versions and
-- times are kept (FR-7, FR-37). Existing accounts and bookings have none, and customers are asked at sign-in.

-- AlterTable
ALTER TABLE "reservation" ADD COLUMN     "rentalAgreementAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "rentalAgreementVersion" TEXT;

-- AlterTable
ALTER TABLE "user" ADD COLUMN     "privacyAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "privacyAcceptedVersion" TEXT,
ADD COLUMN     "termsAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "termsAcceptedVersion" TEXT;

