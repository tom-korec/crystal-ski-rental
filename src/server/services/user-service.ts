import { randomUUID } from 'node:crypto';

import { hashPassword } from 'better-auth/crypto';

import { mayManageAccount, storeForRole } from '~/lib/account-rules';
import { PAGE_SIZE, pageCount, skipForPage } from '~/lib/pagination';
import type { Role } from '~/lib/roles';
import type { UserCreate, UserIdInput, UserListInput, UserUpdateInput } from '~/lib/user-schema';
import { accountIdsMatching } from '~/server/api/customer-search';
import { badRequest, conflict, forbidden, notFound, rethrowPrismaError } from '~/server/api/errors';
import { customerAddressSelect } from '~/server/api/selects';
import type { Clock } from './clock';
import type { Services } from './types';

import type { Prisma, PrismaClient } from '../../../generated/prisma/client';

// Account management by staff (FR-61…63). Every write is gated by the target's role in
// `~/lib/account-rules`, on top of the staff procedure.
//
// Accounts are written directly rather than through Better Auth's sign-up, which cannot set a role and
// would mint a session nobody needs. The user and credential-account rows are the same ones sign-up
// writes, so these accounts sign in normally.
//
// Accounts are soft-deleted: reservations must keep their customer (BR-33). The e-mail stays taken so
// the account can be restored.

const NOT_FOUND = 'Account not found.';
const STORE_REQUIRED = 'Choose the store this manager runs.';
const STORE_MISSING = 'That store no longer exists.';
const EMAIL_TAKEN = 'That e-mail address is already registered, possibly to a removed account.';

const userSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  store: { select: { id: true, name: true } },
  deletedAt: true,
  createdAt: true,
  termsAcceptedVersion: true,
  termsAcceptedAt: true,
  privacyAcceptedVersion: true,
} satisfies Prisma.UserSelect;

/** Who is acting, handed in by the procedure rather than read from a session. */
export interface AccountActor {
  id: string;
  role?: string | null;
}

/** The credential row Better Auth writes for an e-mail and password account. */
async function credentialAccount(userId: string, password: string) {
  return {
    id: randomUUID(),
    accountId: userId,
    providerId: 'credential',
    password: await hashPassword(password),
  };
}

export class UserService {
  private readonly db: PrismaClient;
  private readonly clock: Clock;

  constructor({ db, clock }: Services) {
    this.db = db;
    this.clock = clock;
  }

  /** Accounts in use, or only removed ones, which is where a restore starts. */
  async list(input: UserListInput) {
    const where: Prisma.UserWhereInput = {
      deletedAt: input.onlyDeleted ? { not: null } : null,
      role: input.role,
      id: input.search ? { in: await accountIdsMatching(this.db, input.search) } : undefined,
    };

    const total = await this.db.user.count({ where });
    const page = Math.min(input.page, pageCount(total));

    const items = await this.db.user.findMany({
      where,
      select: userSelect,
      orderBy: [{ name: 'asc' }, { id: 'asc' }],
      skip: skipForPage(page),
      take: PAGE_SIZE,
    });

    return { items, total, page };
  }

  /** Returns removed accounts too, so a reservation history still opens after the account is gone. */
  async byId({ id }: UserIdInput) {
    const user = await this.db.user.findUnique({
      where: { id },
      // Staff see a customer's addresses, e.g. to sort out an invoice (FR-6).
      select: { ...userSelect, addresses: { select: customerAddressSelect, orderBy: { kind: 'asc' } } },
    });

    if (!user) throw notFound(NOT_FOUND);

    return user;
  }

  async create(actor: AccountActor, input: UserCreate) {
    this.assertMayManage(actor.role, input.role);

    const storeId = storeForRole(input.role, input.storeId);
    if (input.role === 'MANAGER' && !storeId) throw badRequest(STORE_REQUIRED);

    const id = randomUUID();

    try {
      return await this.db.user.create({
        data: {
          id,
          name: input.name,
          email: input.email,
          // An account staff created counts as confirmed: nobody is waiting on a link to sign in (FR-9).
          emailVerified: true,
          role: input.role,
          storeId,
          accounts: { create: await credentialAccount(id, input.password) },
        },
        select: userSelect,
      });
    } catch (error) {
      rethrowPrismaError(error, { P2002: EMAIL_TAKEN, P2003: STORE_MISSING });
    }
  }

  async update(actor: AccountActor, { id, password, storeId: requestedStore, ...data }: UserUpdateInput) {
    // Lockout guard: an admin demoting themselves might leave nobody able to undo it.
    if (id === actor.id && data.role && data.role !== actor.role) {
      throw badRequest('You cannot change your own role.');
    }

    const existing = await this.db.user.findFirst({
      where: { id, deletedAt: null },
      select: { role: true, storeId: true },
    });

    if (!existing) throw notFound(NOT_FOUND);

    this.assertMayManage(actor.role, existing.role);
    if (data.role) this.assertMayManage(actor.role, data.role);

    // Only admins touch staff accounts, so only they ever send a store; a change of role settles it too.
    const role = data.role ?? existing.role;
    const storeId = storeForRole(role, requestedStore === undefined ? existing.storeId : requestedStore);
    if (role === 'MANAGER' && !storeId) throw badRequest(STORE_REQUIRED);

    // Hashing is slow by design, so it stays outside the transaction.
    const account = password ? await credentialAccount(id, password) : undefined;

    try {
      return await this.db.$transaction(async (tx) => {
        const user = await tx.user.update({ where: { id }, data: { ...data, storeId }, select: userSelect });

        if (account) {
          const updated = await tx.account.updateMany({
            where: { userId: id, providerId: 'credential' },
            data: { password: account.password },
          });

          if (updated.count === 0) await tx.account.create({ data: { ...account, userId: id } });

          // A password set by staff signs the account out everywhere.
          await tx.session.deleteMany({ where: { userId: id } });
        }

        return user;
      });
    } catch (error) {
      rethrowPrismaError(error, { P2002: EMAIL_TAKEN, P2003: STORE_MISSING, P2025: NOT_FOUND });
    }
  }

  /** Soft delete. Sessions are dropped so the sign-out is immediate, not at cookie expiry (BR-33). */
  async delete(actor: AccountActor, { id }: UserIdInput) {
    if (id === actor.id) throw conflict('You cannot delete your own account.');

    const target = await this.db.user.findUnique({ where: { id }, select: { role: true } });

    if (!target) throw notFound(NOT_FOUND);

    this.assertMayManage(actor.role, target.role);

    const [deleted] = await this.db.$transaction([
      this.db.user.updateMany({ where: { id, deletedAt: null }, data: { deletedAt: this.clock.now() } }),
      this.db.session.deleteMany({ where: { userId: id } }),
    ]);

    if (deleted.count === 0) throw notFound(NOT_FOUND);

    return { id };
  }

  /** Undo a removal (FR-63). The e-mail cannot collide, because a removed account keeps it. */
  async restore(actor: AccountActor, { id }: UserIdInput) {
    const user = await this.db.user.findUnique({ where: { id }, select: { role: true, deletedAt: true } });

    if (!user) throw notFound(NOT_FOUND);

    this.assertMayManage(actor.role, user.role);

    if (!user.deletedAt) throw conflict('That account has not been removed.');

    return this.db.user.update({ where: { id }, data: { deletedAt: null }, select: userSelect });
  }

  private assertMayManage(actorRole: string | null | undefined, targetRole: Role): void {
    if (!mayManageAccount(actorRole, targetRole)) {
      throw forbidden('Only an administrator can manage staff accounts.');
    }
  }
}
