import type { IdInput } from '~/lib/id-schema';
import type { SkiModelCreateInput, SkiModelListInput, SkiModelUpdateInput } from '~/lib/ski-model-schema';
import { conflict, rethrowPrismaError } from '~/server/api/errors';
import { countOf } from '~/server/api/plural';
import { plainSkiModel, skiModelSelect } from '~/server/api/selects';
import type { Services } from './types';

import type { PrismaClient } from '../../../generated/prisma/client';

// Readable by anyone (the public search filters, fleet forms), writable by admins (FR-11). The model
// carries the price, so a price change applies to every ski of the model from the next booking on;
// existing reservations keep their snapshot (BR-5).

const NAME_TAKEN = 'This brand already has a model with that name.';
const NOT_FOUND = 'Ski model not found.';
const BRAND_MISSING = 'The selected brand no longer exists.';

export class SkiModelService {
  private readonly db: PrismaClient;

  constructor({ db }: Services) {
    this.db = db;
  }

  async list({ brandId }: SkiModelListInput) {
    const rows = await this.db.skiModel.findMany({
      where: { brandId },
      // Soft-deleted skis are counted too: the foreign key restricts on them as well.
      select: { ...skiModelSelect, _count: { select: { skis: true } } },
      orderBy: [{ brand: { name: 'asc' } }, { name: 'asc' }],
    });

    return rows.map(({ _count, ...row }) => ({ ...plainSkiModel(row), skiCount: _count.skis }));
  }

  async create(input: SkiModelCreateInput) {
    try {
      return plainSkiModel(await this.db.skiModel.create({ data: input, select: skiModelSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN, P2003: BRAND_MISSING });
    }
  }

  async update({ id, ...data }: SkiModelUpdateInput) {
    try {
      return plainSkiModel(await this.db.skiModel.update({ where: { id }, data, select: skiModelSelect }));
    } catch (error) {
      rethrowPrismaError(error, { P2002: NAME_TAKEN, P2003: BRAND_MISSING, P2025: NOT_FOUND });
    }
  }

  async delete({ id }: IdInput) {
    const skis = await this.db.ski.count({ where: { modelId: id } });

    if (skis > 0) {
      throw conflict(`This model is still used by ${countOf(skis, 'ski')}, including removed ones.`);
    }

    try {
      await this.db.skiModel.delete({ where: { id } });
    } catch (error) {
      rethrowPrismaError(error, { P2003: 'This model is still used by skis.', P2025: NOT_FOUND });
    }

    return { id };
  }
}
