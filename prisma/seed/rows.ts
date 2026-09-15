import type { SkiGender, SkillLevel, SkiType } from '../../src/lib/catalog';
import type { ReservationStatus } from '../../src/lib/reservation-lifecycle';

// The rows the seed writes, once the data files are resolved: ids assigned, offsets turned into dates
// and prices quoted. Checked by `invariants.ts` before anything touches the database.

export interface StoreRow {
  id: string;
  slug: string;
  name: string;
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  openingHours: (string | null)[];
  createdAt: Date;
}

export interface SpecialDayRow {
  id: string;
  storeId: string;
  date: Date;
  hours: string | null;
  name: string | null;
  createdAt: Date;
}

export interface BrandRow {
  id: string;
  name: string;
  createdAt: Date;
}

export interface ModelRow {
  id: string;
  brandId: string;
  name: string;
  type: SkiType;
  gender: SkiGender;
  skillLevel: SkillLevel;
  pricePerDay: string;
  createdAt: Date;
}

export interface UserRow {
  id: string;
  name: string;
  email: string;
  password: string;
  role: 'USER' | 'MANAGER' | 'ADMIN';
  storeId: string | null;
  createdAt: Date;
  deletedAt: Date | null;
  termsAcceptedVersion: string | null;
  termsAcceptedAt: Date | null;
  privacyAcceptedVersion: string | null;
  privacyAcceptedAt: Date | null;
}

export interface CustomerAddressRow {
  id: string;
  userId: string;
  kind: 'MAILING' | 'INVOICE';
  recipient: string | null;
  companyId: string | null;
  vatId: string | null;
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  country: string;
  createdAt: Date;
}

export interface SkiRow {
  id: string;
  inventoryCode: string;
  modelId: string;
  storeId: string;
  lengthCm: number;
  isAvailable: boolean;
  deletedAt: Date | null;
  createdAt: Date;
}

export interface ReservationItemRow {
  id: string;
  skiId: string;
  pricePerDay: string;
  totalPrice: string;
}

export interface ReservationRow {
  id: string;
  code: string;
  userId: string;
  storeId: string;
  startDate: Date;
  endDate: Date;
  status: ReservationStatus;
  items: ReservationItemRow[];
  note: string | null;
  rentalAgreementVersion: string;
  rentalAgreementAcceptedAt: Date;
  rentalDays: number;
  discountPercent: number;
  totalPrice: string;
  createdAt: Date;
  pickedUpAt: Date | null;
  pickedUpById: string | null;
  returnedAt: Date | null;
  returnedById: string | null;
  cancelledAt: Date | null;
  cancelledById: string | null;
}

export type ReservationAddressRow = Omit<CustomerAddressRow, 'userId' | 'createdAt'> & { reservationId: string };

export interface ReservationRatingRow {
  id: string;
  reservationId: string;
  score: number;
  note: string | null;
  createdAt: Date;
}

export interface ModelRatingRow {
  id: string;
  modelId: string;
  userId: string;
  reservationId: string;
  windowStartedAt: Date;
  score: number;
  comment: string | null;
  createdAt: Date;
}

export interface SeedData {
  stores: StoreRow[];
  specialDays: SpecialDayRow[];
  brands: BrandRow[];
  models: ModelRow[];
  users: UserRow[];
  addresses: CustomerAddressRow[];
  skis: SkiRow[];
  reservations: ReservationRow[];
  reservationAddresses: ReservationAddressRow[];
  reservationRatings: ReservationRatingRow[];
  modelRatings: ModelRatingRow[];
}
