import { describe, expect, it } from 'vitest';

import { mayChangeSkisAt, mayManageAccount, storeForRole } from '~/lib/account-rules';
import type { Role } from '~/lib/roles';

describe('mayManageAccount', () => {
  it.each([
    ['ADMIN', 'USER', true],
    ['ADMIN', 'MANAGER', true],
    ['ADMIN', 'ADMIN', true],
    ['MANAGER', 'USER', true],
    ['MANAGER', 'MANAGER', false],
    ['MANAGER', 'ADMIN', false],
    ['USER', 'USER', true],
    [undefined, 'MANAGER', false],
  ] satisfies [string | undefined, Role, boolean][])('%s acting on %s → %s', (actor, target, expected) => {
    expect(mayManageAccount(actor, target)).toBe(expected);
  });
});

describe('mayChangeSkisAt', () => {
  const JASNA = 'store-jasna';
  const DONOVALY = 'store-donovaly';

  it.each([
    ['an admin, anywhere', { role: 'ADMIN', storeId: null }, DONOVALY, true],
    ['a manager, at their own store', { role: 'MANAGER', storeId: JASNA }, JASNA, true],
    ['a manager, at another store', { role: 'MANAGER', storeId: JASNA }, DONOVALY, false],
    ['a manager without a store', { role: 'MANAGER', storeId: null }, JASNA, false],
    ['a customer', { role: 'USER', storeId: JASNA }, JASNA, false],
  ])('%s → %s', (_case, actor, storeId, expected) => {
    expect(mayChangeSkisAt(actor, storeId)).toBe(expected);
  });
});

describe('storeForRole', () => {
  it('keeps a manager’s store and clears everyone else’s', () => {
    expect(storeForRole('MANAGER', 'store-jasna')).toBe('store-jasna');
    expect(storeForRole('MANAGER', undefined)).toBeNull();
    expect(storeForRole('ADMIN', 'store-jasna')).toBeNull();
    expect(storeForRole('USER', 'store-jasna')).toBeNull();
  });
});
