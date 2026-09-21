import type { AddressRemoveInput, AddressSave } from '~/lib/address-schema';
import { customerAddressSelect } from '~/server/api/selects';
import type { Services } from './types';

import type { PrismaClient } from '../../../generated/prisma/client';

// A customer's own mailing and invoice addresses (FR-6). There is no id to pass: each customer has at
// most one address of each kind, so the kind is the address.

export class AddressService {
  private readonly db: PrismaClient;

  constructor({ db }: Services) {
    this.db = db;
  }

  async mine(userId: string) {
    const addresses = await this.db.customerAddress.findMany({ where: { userId }, select: customerAddressSelect });

    return {
      mailing: addresses.find((address) => address.kind === 'MAILING') ?? null,
      invoice: addresses.find((address) => address.kind === 'INVOICE') ?? null,
    };
  }

  /** Creates the address of that kind, or replaces it. */
  save(userId: string, { kind, address }: AddressSave) {
    return this.db.customerAddress.upsert({
      where: { userId_kind: { userId, kind } },
      create: { userId, kind, ...address },
      update: address,
      select: customerAddressSelect,
    });
  }

  /** Removing an address that is not there is not an error: the outcome is the same. */
  async remove(userId: string, { kind }: AddressRemoveInput) {
    await this.db.customerAddress.deleteMany({ where: { userId, kind } });
  }
}
