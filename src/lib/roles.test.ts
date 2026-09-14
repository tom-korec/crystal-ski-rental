import { describe, expect, it } from 'vitest';

import { Role } from '../../generated/prisma/enums';

import { isAdmin, isCustomer, isStaff, roleSchema } from '~/lib/roles';

// The role arrives from the session as a plain string, so what matters most is that anything that
// is not exactly a known role never grants access.
const NOT_ROLES = [undefined, null, '', 'user', 'manager', 'admin', 'SUPERADMIN', 'ADMINISTRATOR'];

describe('isCustomer', () => {
  it('admits only customers', () => {
    expect(isCustomer('USER')).toBe(true);
    expect(isCustomer('MANAGER')).toBe(false);
    expect(isCustomer('ADMIN')).toBe(false);
  });

  it.each(NOT_ROLES)('refuses %j', (role) => {
    expect(isCustomer(role)).toBe(false);
  });
});

describe('isStaff', () => {
  it('admits managers and admins', () => {
    expect(isStaff('MANAGER')).toBe(true);
    expect(isStaff('ADMIN')).toBe(true);
  });

  it('refuses customers', () => {
    expect(isStaff('USER')).toBe(false);
  });

  it.each(NOT_ROLES)('refuses %j', (role) => {
    expect(isStaff(role)).toBe(false);
  });
});

describe('isAdmin', () => {
  it('admits only admins', () => {
    expect(isAdmin('ADMIN')).toBe(true);
    expect(isAdmin('MANAGER')).toBe(false);
    expect(isAdmin('USER')).toBe(false);
  });

  it.each(NOT_ROLES)('refuses %j', (role) => {
    expect(isAdmin(role)).toBe(false);
  });
});

describe('roleSchema', () => {
  it('matches the roles in the database', () => {
    expect(roleSchema.options).toEqual(Object.values(Role));
  });
});
