-- CreateEnum
CREATE TYPE "Role" AS ENUM ('USER', 'MANAGER', 'ADMIN');

-- CreateEnum
CREATE TYPE "SkiType" AS ENUM ('PISTE', 'ALL_MOUNTAIN', 'FREERIDE', 'FREESTYLE');

-- CreateEnum
CREATE TYPE "SkiGender" AS ENUM ('MAN', 'WOMAN', 'KID', 'UNISEX');

-- CreateEnum
CREATE TYPE "SkillLevel" AS ENUM ('BEGINNER', 'INTERMEDIATE', 'EXPERT');

-- CreateEnum
CREATE TYPE "ReservationStatus" AS ENUM ('CREATED', 'ACTIVE', 'RETURNED', 'CANCELLED_BY_USER', 'CANCELLED_BY_STORE');

-- CreateTable
CREATE TABLE "user" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "emailVerified" BOOLEAN NOT NULL DEFAULT false,
    "image" TEXT,
    "role" "Role" NOT NULL DEFAULT 'USER',
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "user_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "session" (
    "id" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "token" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "userId" TEXT NOT NULL,

    CONSTRAINT "session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "account" (
    "id" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "providerId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "accessToken" TEXT,
    "refreshToken" TEXT,
    "idToken" TEXT,
    "accessTokenExpiresAt" TIMESTAMP(3),
    "refreshTokenExpiresAt" TIMESTAMP(3),
    "scope" TEXT,
    "password" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "verification" (
    "id" TEXT NOT NULL,
    "identifier" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "verification_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "brand" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "brand_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ski_model" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "type" "SkiType" NOT NULL,
    "gender" "SkiGender" NOT NULL,
    "skillLevel" "SkillLevel" NOT NULL,
    "pricePerDay" DECIMAL(10,2) NOT NULL,
    "avgRating" DECIMAL(3,2),
    "ratingCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ski_model_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "store" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "street" TEXT NOT NULL,
    "houseNumber" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "zipCode" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "openingHoursMonday" TEXT NOT NULL DEFAULT '',
    "openingHoursTuesday" TEXT NOT NULL DEFAULT '',
    "openingHoursWednesday" TEXT NOT NULL DEFAULT '',
    "openingHoursThursday" TEXT NOT NULL DEFAULT '',
    "openingHoursFriday" TEXT NOT NULL DEFAULT '',
    "openingHoursSaturday" TEXT NOT NULL DEFAULT '',
    "openingHoursSunday" TEXT NOT NULL DEFAULT '',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "store_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ski" (
    "id" TEXT NOT NULL,
    "inventoryCode" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "lengthCm" INTEGER NOT NULL,
    "isAvailable" BOOLEAN NOT NULL DEFAULT true,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ski_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation" (
    "id" TEXT NOT NULL,
    "skiId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "startDate" DATE NOT NULL,
    "endDate" DATE NOT NULL,
    "status" "ReservationStatus" NOT NULL DEFAULT 'CREATED',
    "pricePerDay" DECIMAL(10,2) NOT NULL,
    "rentalDays" INTEGER NOT NULL,
    "discountPercent" INTEGER NOT NULL,
    "totalPrice" DECIMAL(10,2) NOT NULL,
    "pickedUpAt" TIMESTAMP(3),
    "pickedUpById" TEXT,
    "returnedAt" TIMESTAMP(3),
    "returnedById" TEXT,
    "cancelledAt" TIMESTAMP(3),
    "cancelledById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "reservation_rating" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "score" INTEGER NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reservation_rating_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "model_rating" (
    "id" TEXT NOT NULL,
    "modelId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "windowStartedAt" TIMESTAMP(3) NOT NULL,
    "score" INTEGER NOT NULL,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "model_rating_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "user_email_key" ON "user"("email");

-- CreateIndex
CREATE UNIQUE INDEX "session_token_key" ON "session"("token");

-- CreateIndex
CREATE UNIQUE INDEX "brand_name_key" ON "brand"("name");

-- CreateIndex
CREATE INDEX "ski_model_pricePerDay_idx" ON "ski_model"("pricePerDay");

-- CreateIndex
CREATE INDEX "ski_model_avgRating_idx" ON "ski_model"("avgRating");

-- CreateIndex
CREATE UNIQUE INDEX "ski_model_brandId_name_key" ON "ski_model"("brandId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "store_name_key" ON "store"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ski_inventoryCode_key" ON "ski"("inventoryCode");

-- CreateIndex
CREATE INDEX "ski_deletedAt_isAvailable_idx" ON "ski"("deletedAt", "isAvailable");

-- CreateIndex
CREATE INDEX "ski_modelId_idx" ON "ski"("modelId");

-- CreateIndex
CREATE INDEX "ski_storeId_idx" ON "ski"("storeId");

-- CreateIndex
CREATE INDEX "ski_lengthCm_idx" ON "ski"("lengthCm");

-- CreateIndex
CREATE INDEX "reservation_skiId_status_startDate_idx" ON "reservation"("skiId", "status", "startDate");

-- CreateIndex
CREATE INDEX "reservation_userId_startDate_idx" ON "reservation"("userId", "startDate");

-- CreateIndex
CREATE INDEX "reservation_status_startDate_idx" ON "reservation"("status", "startDate");

-- CreateIndex
CREATE INDEX "reservation_status_endDate_idx" ON "reservation"("status", "endDate");

-- CreateIndex
CREATE UNIQUE INDEX "reservation_rating_reservationId_key" ON "reservation_rating"("reservationId");

-- CreateIndex
CREATE INDEX "model_rating_reservationId_idx" ON "model_rating"("reservationId");

-- CreateIndex
CREATE UNIQUE INDEX "model_rating_modelId_userId_key" ON "model_rating"("modelId", "userId");

-- AddForeignKey
ALTER TABLE "session" ADD CONSTRAINT "session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "account" ADD CONSTRAINT "account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ski_model" ADD CONSTRAINT "ski_model_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "brand"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ski" ADD CONSTRAINT "ski_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ski_model"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ski" ADD CONSTRAINT "ski_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_skiId_fkey" FOREIGN KEY ("skiId") REFERENCES "ski"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_pickedUpById_fkey" FOREIGN KEY ("pickedUpById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_returnedById_fkey" FOREIGN KEY ("returnedById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation" ADD CONSTRAINT "reservation_cancelledById_fkey" FOREIGN KEY ("cancelledById") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "reservation_rating" ADD CONSTRAINT "reservation_rating_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_rating" ADD CONSTRAINT "model_rating_modelId_fkey" FOREIGN KEY ("modelId") REFERENCES "ski_model"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_rating" ADD CONSTRAINT "model_rating_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "model_rating" ADD CONSTRAINT "model_rating_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
