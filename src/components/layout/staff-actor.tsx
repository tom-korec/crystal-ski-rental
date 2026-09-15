'use client';

import { createContext, type ReactNode, useContext } from 'react';

import type { StaffActor } from '~/lib/account-rules';

const StaffActorContext = createContext<StaffActor | null>(null);

interface StaffActorProviderProps {
  actor: StaffActor;
  children: ReactNode;
}

/** The signed-in staff member's role and store, for screens that show only what they may change (FR-64). */
export function StaffActorProvider({ actor, children }: StaffActorProviderProps) {
  return <StaffActorContext value={actor}>{children}</StaffActorContext>;
}

/** Only inside the staff area. The server enforces the same rules; this only decides what is offered. */
export function useStaffActor(): StaffActor {
  const actor = useContext(StaffActorContext);
  if (!actor) throw new Error('useStaffActor needs a StaffActorProvider');
  return actor;
}
