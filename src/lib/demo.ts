/** The seeded demo accounts, offered on the landing page of the public demo. They are public on purpose. */
export const DEMO_ACCOUNTS = [
  { role: 'USER', email: 'customer@crystalskirental.test', password: 'Customer123!' },
  { role: 'MANAGER', email: 'manager@crystalskirental.test', password: 'Manager123!' },
  { role: 'ADMIN', email: 'admin@crystalskirental.test', password: 'Admin123!' },
] as const;
