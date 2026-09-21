import { frontDeskSchema } from '~/lib/reservation-schema';
import { staffProcedure } from '~/server/api/trpc';

/** The front desk of one store: what is due and what is overdue (FR-50). */
export const frontDesk = staffProcedure
  .input(frontDeskSchema)
  .query(({ ctx, input }) => ctx.services.reservations.frontDesk(input));
