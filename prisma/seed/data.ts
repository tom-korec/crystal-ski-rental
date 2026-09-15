import type { SkiGender, SkillLevel, SkiType } from '../../src/lib/catalog';
import type { Role } from '../../src/lib/roles';

// The hand-written half of the demo data: stores, catalogue and the accounts people sign in with.
// Everything is fictional. Phone numbers use a Slovak prefix no real number starts with, and e-mail
// addresses use the reserved `.test` domain.

export const DEMO_PASSWORDS = {
  admin: 'Admin123!',
  manager: 'Manager123!',
  customer: 'Customer123!',
} as const;

type WeekHours = [string, string, string, string, string, string, string];

export interface SeedStore {
  name: string;
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  phone: string;
  email: string;
  /** Monday first; an empty string means closed. */
  hours: WeekHours;
}

export const STORES: SeedStore[] = [
  {
    name: 'Jasná',
    street: 'Demänovská dolina',
    houseNumber: '72',
    city: 'Liptovský Mikuláš',
    zipCode: '03101',
    phone: '+421000000101',
    email: 'jasna@crystalskirental.test',
    hours: [
      '8:00 – 16:30',
      '8:00 – 16:30',
      '8:00 – 16:30',
      '8:00 – 16:30',
      '8:00 – 17:00',
      '7:30 – 17:00',
      '7:30 – 17:00',
    ],
  },
  {
    name: 'Tatranská Lomnica',
    street: 'Cesta Slobody',
    houseNumber: '12/A',
    city: 'Vysoké Tatry',
    zipCode: '05960',
    phone: '+421000000102',
    email: 'lomnica@crystalskirental.test',
    hours: [
      '8:00 – 16:00',
      '8:00 – 16:00',
      '8:00 – 16:00',
      '8:00 – 16:00',
      '8:00 – 16:00',
      '8:00 – 16:00',
      '8:00 – 16:00',
    ],
  },
  {
    name: 'Štrbské Pleso',
    street: 'Nábrežie',
    houseNumber: '1543/7',
    city: 'Vysoké Tatry',
    zipCode: '05985',
    phone: '+421000000103',
    email: 'pleso@crystalskirental.test',
    hours: ['', '8:30 – 16:00', '8:30 – 16:00', '8:30 – 16:00', '8:30 – 16:00', '8:00 – 16:30', '8:00 – 16:30'],
  },
  {
    name: 'Donovaly',
    street: 'Donovaly',
    houseNumber: '305',
    city: 'Donovaly',
    zipCode: '97639',
    phone: '+421000000104',
    email: 'donovaly@crystalskirental.test',
    hours: [
      '9:00 – 16:00',
      '9:00 – 16:00',
      '9:00 – 16:00',
      '9:00 – 16:00',
      '8:00 – 17:00',
      '8:00 – 17:00',
      '8:00 – 17:00',
    ],
  },
];

export interface SeedModel {
  brand: string;
  name: string;
  type: SkiType;
  gender: SkiGender;
  skillLevel: SkillLevel;
  pricePerDay: string;
}

export const MODELS: SeedModel[] = [
  { brand: 'Atomic', name: 'Redster G9', type: 'PISTE', gender: 'UNISEX', skillLevel: 'EXPERT', pricePerDay: '42.00' },
  { brand: 'Rossignol', name: 'Nova 6', type: 'PISTE', gender: 'WOMAN', skillLevel: 'BEGINNER', pricePerDay: '24.00' },
  {
    brand: 'Head',
    name: 'Kore 93',
    type: 'FREERIDE',
    gender: 'UNISEX',
    skillLevel: 'INTERMEDIATE',
    pricePerDay: '36.00',
  },
  {
    brand: 'Salomon',
    name: 'S/Max 8',
    type: 'PISTE',
    gender: 'UNISEX',
    skillLevel: 'INTERMEDIATE',
    pricePerDay: '29.00',
  },
  {
    brand: 'Atomic',
    name: 'Maverick 88',
    type: 'ALL_MOUNTAIN',
    gender: 'MAN',
    skillLevel: 'INTERMEDIATE',
    pricePerDay: '34.00',
  },
  {
    brand: 'Elan',
    name: 'Ripstick 88 W',
    type: 'FREERIDE',
    gender: 'WOMAN',
    skillLevel: 'INTERMEDIATE',
    pricePerDay: '35.00',
  },
  {
    brand: 'Fischer',
    name: 'RC4 The Curv',
    type: 'PISTE',
    gender: 'UNISEX',
    skillLevel: 'EXPERT',
    pricePerDay: '44.00',
  },
  {
    brand: 'K2',
    name: 'Poacher',
    type: 'FREESTYLE',
    gender: 'UNISEX',
    skillLevel: 'INTERMEDIATE',
    pricePerDay: '30.00',
  },
  {
    brand: 'Rossignol',
    name: 'Experience 86',
    type: 'ALL_MOUNTAIN',
    gender: 'MAN',
    skillLevel: 'INTERMEDIATE',
    pricePerDay: '32.00',
  },
  {
    brand: 'Salomon',
    name: 'QST Lumen 99',
    type: 'FREERIDE',
    gender: 'WOMAN',
    skillLevel: 'EXPERT',
    pricePerDay: '39.00',
  },
  { brand: 'Völkl', name: 'Deacon 76', type: 'PISTE', gender: 'MAN', skillLevel: 'INTERMEDIATE', pricePerDay: '33.00' },
  {
    brand: 'Elan',
    name: 'Wingman 78 C',
    type: 'ALL_MOUNTAIN',
    gender: 'UNISEX',
    skillLevel: 'BEGINNER',
    pricePerDay: '22.00',
  },
  {
    brand: 'Head',
    name: 'Supershape e-Rally',
    type: 'PISTE',
    gender: 'MAN',
    skillLevel: 'EXPERT',
    pricePerDay: '45.00',
  },
  { brand: 'Fischer', name: 'Ranger 102', type: 'FREERIDE', gender: 'MAN', skillLevel: 'EXPERT', pricePerDay: '38.00' },
  {
    brand: 'K2',
    name: 'Mindbender 90C',
    type: 'ALL_MOUNTAIN',
    gender: 'MAN',
    skillLevel: 'INTERMEDIATE',
    pricePerDay: '31.00',
  },
  { brand: 'Atomic', name: 'Redster J4', type: 'PISTE', gender: 'KID', skillLevel: 'BEGINNER', pricePerDay: '16.00' },
  {
    brand: 'Rossignol',
    name: 'Experience Pro',
    type: 'ALL_MOUNTAIN',
    gender: 'KID',
    skillLevel: 'BEGINNER',
    pricePerDay: '15.00',
  },
];

/** Lengths a rental would stock, by who the model is made for. */
export const LENGTHS_BY_GENDER: Record<SkiGender, number[]> = {
  KID: [100, 110, 120, 130, 140],
  WOMAN: [149, 156, 163, 170],
  MAN: [163, 170, 177, 184],
  UNISEX: [156, 163, 170, 177],
};

export interface SeedAccount {
  key: string;
  name: string;
  email: string;
  role: Role;
  password: string;
  removed?: boolean;
  /** A manager's own store, by name (FR-64). */
  store?: string;
}

/** The accounts the README and the end-to-end tests sign in with. */
export const DEMO_ACCOUNTS: SeedAccount[] = [
  {
    key: 'admin',
    name: 'Martina Kováčová',
    email: 'admin@crystalskirental.test',
    role: 'ADMIN',
    password: DEMO_PASSWORDS.admin,
  },
  {
    key: 'manager',
    name: 'Peter Hudák',
    email: 'manager@crystalskirental.test',
    role: 'MANAGER',
    store: 'Jasná',
    password: DEMO_PASSWORDS.manager,
  },
  {
    key: 'customer',
    name: 'Jan Novák',
    email: 'customer@crystalskirental.test',
    role: 'USER',
    password: DEMO_PASSWORDS.customer,
  },
];

export const OTHER_STAFF: SeedAccount[] = [
  {
    key: 'lucia',
    name: 'Lucia Šimková',
    email: 'lucia.simkova@crystalskirental.test',
    role: 'MANAGER',
    store: 'Donovaly',
    password: DEMO_PASSWORDS.manager,
  },
];

export const CUSTOMER_NAMES = [
  'Zuzana Horváthová',
  'Michal Baláž',
  'Katarína Tóthová',
  'Martin Varga',
  'Veronika Kollárová',
  'Tomáš Král',
  'Simona Lukáčová',
  'Marek Polák',
  'Barbora Nagyová',
  'Juraj Molnár',
  'Andrea Gregorová',
  'Filip Kováč',
  'Petra Oravcová',
  'Samuel Mráz',
];

export interface SeedMailingAddress {
  street: string;
  houseNumber: string;
  city: string;
  zipCode: string;
  country: string;
}

export interface SeedInvoiceAddress extends SeedMailingAddress {
  recipient: string;
  companyId?: string;
  vatId?: string;
}

/** The demo customer rents privately but has invoices made out to their company (FR-6). */
export const DEMO_CUSTOMER_ADDRESSES: { mailing: SeedMailingAddress; invoice: SeedInvoiceAddress } = {
  mailing: { street: 'Karadžičova', houseNumber: '14', city: 'Bratislava', zipCode: '811 09', country: 'SK' },
  invoice: {
    recipient: 'Novák Consulting s.r.o.',
    companyId: '12 345 678',
    vatId: 'SK2020123456',
    street: 'Mlynské nivy',
    houseNumber: '1543/7',
    city: 'Bratislava',
    zipCode: '821 09',
    country: 'SK',
  },
};

/** Handed out to generated customers in turn. Guests come from abroad too. */
export const MAILING_ADDRESSES: SeedMailingAddress[] = [
  { street: 'Hlavná', houseNumber: '12/A', city: 'Košice', zipCode: '040 01', country: 'SK' },
  { street: 'Štefánikova', houseNumber: '31', city: 'Žilina', zipCode: '010 01', country: 'SK' },
  { street: 'Námestie SNP', houseNumber: '5', city: 'Banská Bystrica', zipCode: '974 01', country: 'SK' },
  { street: 'Vinohradská', houseNumber: '88', city: 'Praha', zipCode: '120 00', country: 'CZ' },
  { street: 'Popradská', houseNumber: '2', city: 'Poprad', zipCode: '058 01', country: 'SK' },
  { street: 'ul. Krupówki', houseNumber: '40', city: 'Zakopane', zipCode: '34-500', country: 'PL' },
  { street: 'Nitrianska', houseNumber: '17', city: 'Trnava', zipCode: '917 01', country: 'SK' },
  { street: 'Andrássy út', houseNumber: '60', city: 'Budapest', zipCode: '1062', country: 'HU' },
];

/** A generated customer whose invoices go to their employer. */
export const COMPANY_INVOICE: Omit<SeedInvoiceAddress, keyof SeedMailingAddress> = {
  recipient: 'Tatra Outdoor a.s.',
  companyId: '87654321',
  vatId: 'SK2021987654',
};

/** Generated customers whose accounts have been removed, to show the restore flow. */
export const REMOVED_CUSTOMERS = new Set(['Tomáš Král']);

export const RENTAL_NOTES = [
  'Quick pickup, the skis were waxed and ready.',
  'Friendly staff who helped me pick the right length.',
  'Had to wait a while at the counter on Saturday morning.',
  'Easy return, no questions asked.',
  'The boot fitting advice was really helpful.',
  null,
  null,
];

export const MODEL_COMMENTS = [
  'Grippy on hard snow and very stable at speed.',
  'Forgiving and easy to turn, great for learning.',
  'Floats nicely in fresh snow, a bit heavy on the lift.',
  'Playful in the park, holds an edge better than expected.',
  'Too stiff for my level, would pick something softer next time.',
  null,
  null,
];
