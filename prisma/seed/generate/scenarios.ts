import type { GenReservation } from './bookings';

/**
 * The scripted scenarios the demo and the end-to-end tests rely on, all at the first store (Jasná), on
 * the first fourteen pairs. Moments are fixed relative to seeding, including the few that must be within
 * the last hour.
 */
export function scriptedReservations(store: string, manager: string): GenReservation[] {
  const jan = 'customer@crystalskirental.test';

  return [
    // The demo customer: a rental rated long ago, a newer rental of the same model with a second model
    // that may reopen that rating, a rental returned today and still inside its edit window, one out now,
    // a family booking coming up and one cancelled.
    {
      store,
      code: 'MS8LSQ',
      customer: jan,
      skis: ['SK-0001'],
      start: -30,
      end: -26,
      status: 'RETURNED',
      createdAt: '-41 19:12',
      pickedUp: { at: '-30 09:10', by: manager },
      returned: { at: '-27 15:40', by: manager },
      rating: { score: 5, note: 'The skis were ready when I arrived and the staff were lovely.', at: '-27 18:40' },
      modelRatings: [
        {
          model: 'Atomic Redster G9',
          score: 4,
          comment: 'Very stable on hard snow, but tiring by the afternoon.',
          at: '-27 18:40',
        },
      ],
    },
    {
      store,
      code: 'ZYWHER',
      customer: jan,
      skis: ['SK-0002', 'SK-0012'],
      start: -9,
      end: -6,
      status: 'RETURNED',
      createdAt: '-20 20:05',
      pickedUp: { at: '-9 08:50', by: manager },
      returned: { at: '-7 16:10', by: manager },
    },
    {
      store,
      code: 'QBFNFL',
      customer: jan,
      skis: ['SK-0003'],
      start: -3,
      end: 1,
      status: 'RETURNED',
      createdAt: '-15 21:30',
      pickedUp: { at: '-3 09:30', by: manager },
      returned: { at: '40m', by: manager },
      rating: { score: 4, note: 'Early return was no problem.', at: '20m' },
      modelRatings: [{ model: '', score: 5, at: '20m' }],
    },
    {
      store,
      code: 'CBVDXB',
      customer: jan,
      skis: ['SK-0004'],
      start: -1,
      end: 3,
      status: 'ACTIVE',
      createdAt: '-12 18:00',
      pickedUp: { at: '-1 09:15', by: manager },
    },
    {
      store,
      code: '68EK95',
      customer: jan,
      skis: ['SK-0005', 'SK-0013'],
      start: 7,
      end: 12,
      status: 'CREATED',
      createdAt: '-2 20:45',
      note: 'One pair is for my daughter, she is 150 cm tall. We arrive around 9:30.',
    },
    {
      store,
      code: 'G5JEHH',
      customer: jan,
      skis: ['SK-0006'],
      start: 14,
      end: 16,
      status: 'CANCELLED_BY_USER',
      createdAt: '-10 19:00',
      cancelled: { at: '-3 08:20', by: jan },
    },

    // The Jasná front desk has something in every list, including a pickup of two pairs with a note.
    {
      store,
      code: 'PK7TWD',
      customer: 'zuzana.horvathova@example.test',
      skis: ['SK-0007', 'SK-0014'],
      start: 0,
      end: 3,
      status: 'CREATED',
      createdAt: '-6 17:30',
      note: 'Could you check the bindings are set for a beginner?',
    },
    {
      store,
      code: 'VR3MPX',
      customer: 'michal.balaz@example.test',
      skis: ['SK-0008'],
      start: -2,
      end: 2,
      status: 'CREATED',
      createdAt: '-14 12:00',
    },
    {
      store,
      code: 'HT4KQA',
      customer: 'katarina.tothova@example.test',
      skis: ['SK-0009'],
      start: -4,
      end: 1,
      status: 'ACTIVE',
      createdAt: '-20 10:00',
      pickedUp: { at: '-4 10:05', by: manager },
    },
    {
      store,
      code: 'NW8DZE',
      customer: 'martin.varga@example.test',
      skis: ['SK-0010'],
      start: -6,
      end: -1,
      status: 'ACTIVE',
      createdAt: '-25 09:00',
      pickedUp: { at: '-6 08:40', by: manager },
    },
    {
      store,
      code: 'JC6YBU',
      customer: 'zuzana.horvathova@example.test',
      skis: ['SK-0011'],
      start: -8,
      end: -5,
      status: 'CANCELLED_BY_STORE',
      createdAt: '-18 14:00',
      cancelled: { at: '-8 16:30', by: manager },
    },
  ];
}
