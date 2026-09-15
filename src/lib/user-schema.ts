import { z } from 'zod';

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, NAME_MAX_LENGTH } from '~/lib/auth-schema';
import { pageSchema } from '~/lib/pagination';
import { roleSchema } from '~/lib/roles';

// Staff managing other people's accounts. `auth-schema` covers visitors signing themselves up, and
// `profile-schema` the signed-in account changing itself.

export const USER_SEARCH_MAX_LENGTH = 100;

/** Opaque, not a UUID: Better Auth generates user ids. */
export const userIdSchema = z.object({ id: z.string().min(1) });

const nameSchema = z.string().trim().min(1).max(NAME_MAX_LENGTH);
const passwordSchema = z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH);

export const userCreateSchema = z.object({
  name: nameSchema,
  email: z.email(),
  password: passwordSchema,
  role: roleSchema.default('USER'),
  /** A manager's own store (FR-64). Ignored for other roles. */
  storeId: z.uuid().nullish(),
});

/** Optional fields mean "fields this request changes"; an omitted password is left alone. */
export const userUpdateSchema = z.object({
  id: z.string().min(1),
  name: nameSchema.optional(),
  email: z.email().optional(),
  role: roleSchema.optional(),
  storeId: z.uuid().nullish(),
  password: passwordSchema.optional(),
});

/** The edit form always submits name and e-mail; role and password have their own controls. */
export const userEditSchema = z.object({ id: z.string().min(1), name: nameSchema, email: z.email() });

/** `search` matches name or e-mail, since staff have whichever the customer gave them. */
export const userListSchema = z
  .object({
    search: z.string().trim().min(1).max(USER_SEARCH_MAX_LENGTH).optional(),
    role: roleSchema.optional(),
    onlyDeleted: z.boolean().optional(),
    page: pageSchema,
  })
  .prefault({});

export type UserCreateInput = z.input<typeof userCreateSchema>;
export type UserUpdateInput = z.infer<typeof userUpdateSchema>;
export type UserEditInput = z.infer<typeof userEditSchema>;
export type UserListInput = z.infer<typeof userListSchema>;
