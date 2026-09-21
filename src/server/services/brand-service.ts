import type { BrandCreateInput, BrandUpdateInput } from '~/lib/brand-schema';
import type { IdInput } from '~/lib/id-schema';
import { conflict, rethrowPrismaError } from '~/server/api/errors';
import { countOf } from '~/server/api/plural';
import type { Services } from './types';

import type { PrismaClient } from '../../../generated/prisma/client';

// Readable by anyone (the public search filters), writable by admins (FR-10). Hard-deleted, and
// refused while a model still uses it (FR-13).

const NAME_TAKEN = 'A brand with that name already exists.';
const NOT_FOUND = 'Brand not found.';

const brandSelect = { id: true, name: true } as const;

export class BrandService {
  private readonly db: PrismaClient;

  constructor({ db }: Services) {
    this.db = db;
  }

  list() {
    return this.db.brand.findMany({
      select: { ...brandSelect, _count: { select: { models: true } } },
      orderBy: { name: 'asc' },
    });
  }

  async create(input: BrandCreateInput) {
    try {
      return await this.db.brand.create({ data: input, select: brandSelect });
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN });
    }
  }

  async update({ id, ...data }: BrandUpdateInput) {
    try {
      return await this.db.brand.update({ where: { id }, data, select: brandSelect });
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN, P2025: NOT_FOUND });
    }
  }

  async delete({ id }: IdInput) {
    const models = await this.db.skiModel.count({ where: { brandId: id } });

    if (models > 0) {
      throw conflict(`This brand still has ${countOf(models, 'model')}. Delete or reassign the models first.`);
    }

    try {
      await this.db.brand.delete({ where: { id } });
    } catch (error) {
      // The count above gives the better message; this closes the race behind it.
      rethrowPrismaError(error, { P2003: 'This brand still has models.', P2025: NOT_FOUND });
    }

    return { id };
  }
}
