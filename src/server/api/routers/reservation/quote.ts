import { reservationQuoteSchema } from '~/lib/reservation-schema';
import { publicProcedure } from '~/server/api/trpc';

/** Prices the reservation being put together (FR-33). Public, so a visitor sees the price before signing up. */
export const quote = publicProcedure
  .input(reservationQuoteSchema)
  .query(({ ctx, input }) => ctx.services.reservations.quote(input));
