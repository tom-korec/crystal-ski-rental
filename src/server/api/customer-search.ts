import type { PrismaClient } from '../../../generated/prisma/client';

/**
 * Accounts whose name or e-mail contains the text, ignoring case and accents, so "novak" finds "Novák"
 * (FR-61, FR-65). Prisma's `contains` cannot ignore accents, hence the one raw query; `unaccent` comes
 * from the migration of that name.
 */
export async function accountIdsMatching(db: PrismaClient, text: string): Promise<string[]> {
  // LIKE's own wildcards in the text are matched literally.
  const pattern = `%${text.replace(/[\\%_]/g, (character) => `\\${character}`)}%`;

  const rows = await db.$queryRaw<{ id: string }[]>`
    SELECT id FROM "user"
    WHERE unaccent(name) ILIKE unaccent(${pattern}) OR email ILIKE ${pattern}`;

  return rows.map((row) => row.id);
}
