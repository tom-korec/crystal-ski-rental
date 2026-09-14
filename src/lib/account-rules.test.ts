import { describe, expect, it } from 'vitest';

import { mayManageAccount } from '~/lib/account-rules';
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
