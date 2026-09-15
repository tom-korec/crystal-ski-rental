import type { CustomerFile, StoreFile } from '../schema';
import { COMPANIES, FEMALE_FIRST_NAMES, MALE_FIRST_NAMES, PLACES, STREETS, SURNAMES } from './names';
import type { Random } from './random';

export const CUSTOMER_COUNT = 100;
export const RESERVATION_COUNT = 1000;
export const CUSTOMER_PASSWORD = 'Customer123!';

export interface GenCustomer {
  name: string;
  email: string;
  gender: 'MAN' | 'WOMAN';
  /** Where most of their rentals are. */
  home: string;
  /** How many reservations they end up with, scripted ones included. */
  quota: number;
  /** Only the scripted reservations: the demo customer's history must stay exactly as the tests expect. */
  onlyScripted: boolean;
  /** Removed a while ago; every booking ends well before. */
  removedOnDay: number | null;
  mailing?: NonNullable<CustomerFile[number]['mailing']>;
  invoice?: NonNullable<CustomerFile[number]['invoice']>;
}

function emailPart(name: string): string {
  return name
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();
}

/**
 * A hundred customers. Half come once or twice; the other half come back, some of them all season, and
 * share the rest of the thousand reservations between them. The scripted customers come first.
 */
export function buildCustomers(random: Random, stores: StoreFile): GenCustomer[] {
  const jasna = stores[0]?.slug ?? '';
  const customers: GenCustomer[] = [
    {
      name: 'Jan Novák',
      email: 'customer@crystalskirental.test',
      gender: 'MAN',
      home: jasna,
      quota: 6,
      onlyScripted: true,
      removedOnDay: null,
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
    },
    scripted('Zuzana Horváthová', 'WOMAN', jasna),
    scripted('Michal Baláž', 'MAN', jasna),
    scripted('Katarína Tóthová', 'WOMAN', jasna),
    scripted('Martin Varga', 'MAN', jasna),
    { ...scripted('Tomáš Král', 'MAN', stores[1]?.slug ?? jasna), removedOnDay: -12 },
  ];

  const taken = new Set(customers.map((customer) => customer.name));
  while (customers.length < CUSTOMER_COUNT) {
    const gender = random.chance(0.5) ? 'MAN' : 'WOMAN';
    const [male, female] = random.pick(SURNAMES);
    const name = `${random.pick(gender === 'MAN' ? MALE_FIRST_NAMES : FEMALE_FIRST_NAMES)} ${gender === 'MAN' ? male : female}`;
    if (taken.has(name)) continue;
    taken.add(name);
    customers.push({ ...scripted(name, gender, random.pick(stores).slug), ...addressesFor(random, name) });
  }

  assignQuotas(random, customers);
  return customers;
}

function scripted(name: string, gender: 'MAN' | 'WOMAN', home: string): GenCustomer {
  const [first = '', ...rest] = name.split(' ');
  return {
    name,
    email: `${emailPart(first)}.${emailPart(rest.join('.'))}@example.test`,
    gender,
    home,
    quota: 1,
    onlyScripted: false,
    removedOnDay: null,
  };
}

function addressesFor(random: Random, name: string): Pick<GenCustomer, 'mailing' | 'invoice'> {
  if (!random.chance(0.7)) return {};

  const place = random.pick(PLACES);
  const mailing = {
    street: random.pick(STREETS),
    houseNumber: String(random.int(1, 120)),
    city: place.city,
    zipCode: place.zipCode,
    country: place.country,
  };
  if (!random.chance(0.15)) return { mailing };

  const company = random.chance(0.7);
  return {
    mailing,
    invoice: {
      ...mailing,
      recipient: company ? random.pick(COMPANIES) : name,
      ...(company ? { companyId: String(random.int(10_000_000, 99_999_999)) } : {}),
      ...(company && place.country === 'SK' ? { vatId: `SK20${random.int(10_000_000, 99_999_999)}` } : {}),
    },
  };
}

/** Half the customers book once or twice; the rest share what is left, unevenly, as regulars do. */
function assignQuotas(random: Random, customers: GenCustomer[]): void {
  const occasionalNames = new Set(['Michal Baláž', 'Katarína Tóthová', 'Martin Varga', 'Tomáš Král']);
  // Zuzana has two scripted reservations and is a regular; the demo customer's history is fixed.
  const pool = random.shuffle(
    customers.filter(
      (customer) =>
        !customer.onlyScripted && !occasionalNames.has(customer.name) && customer.name !== 'Zuzana Horváthová',
    ),
  );
  const occasional = [
    ...customers.filter((customer) => occasionalNames.has(customer.name)),
    ...pool.slice(0, CUSTOMER_COUNT / 2 - occasionalNames.size),
  ];
  for (const customer of occasional) customer.quota = random.int(1, 2);

  const regulars = customers.filter((customer) => !occasional.includes(customer) && !customer.onlyScripted);
  const fixed = customers.reduce(
    (sum, customer) => sum + (occasional.includes(customer) || customer.onlyScripted ? customer.quota : 0),
    0,
  );
  const weights = regulars.map(() => 0.3 + random.next() ** 2 * 3);
  const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
  const remaining = RESERVATION_COUNT - fixed;

  let assigned = 0;
  for (const [index, customer] of regulars.entries()) {
    customer.quota = Math.max(3, Math.round((remaining * (weights[index] ?? 1)) / totalWeight));
    assigned += customer.quota;
  }
  // Rounding leaves a few reservations over or under; the busiest regulars absorb the difference.
  const byQuota = [...regulars].sort((a, b) => b.quota - a.quota);
  for (let difference = remaining - assigned, index = 0; difference !== 0; index = (index + 1) % byQuota.length) {
    const customer = byQuota[index];
    if (!customer) break;
    if (difference > 0) {
      customer.quota++;
      difference--;
    } else if (customer.quota > 3) {
      customer.quota--;
      difference++;
    }
  }
}
