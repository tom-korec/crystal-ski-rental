/** mulberry32: small, fast and reproducible, so the generator writes the same files every run. */
export function createRandom(seed: number) {
  let state = seed >>> 0;

  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4_294_967_296;
  };

  const int = (min: number, max: number) => min + Math.floor(next() * (max - min + 1));

  return {
    next,
    int,
    chance: (probability: number) => next() < probability,
    pick<T>(items: readonly T[]): T {
      const item = items[int(0, items.length - 1)];
      if (item === undefined) throw new Error('pick() from an empty list');
      return item;
    },
    /** An item chosen with probability proportional to its weight. */
    weighted<T>(items: readonly (readonly [T, number])[]): T {
      const total = items.reduce((sum, [, weight]) => sum + weight, 0);
      let roll = next() * total;
      for (const [item, weight] of items) {
        roll -= weight;
        if (roll < 0) return item;
      }
      const last = items.at(-1);
      if (!last) throw new Error('weighted() from an empty list');
      return last[0];
    },
    shuffle<T>(items: readonly T[]): T[] {
      const copy = [...items];
      for (let index = copy.length - 1; index > 0; index--) {
        const other = int(0, index);
        [copy[index], copy[other]] = [copy[other] as T, copy[index] as T];
      }
      return copy;
    },
  };
}

export type Random = ReturnType<typeof createRandom>;

/** `"-12 09:30"`: a day offset and a UTC time, the moment format of the data files. */
export function at(day: number, hour: number, minute = 0): string {
  return `${day} ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

/** Minutes since midnight of day 0, so generated moments can be compared. */
export function minutesOf(value: string): number {
  const match = /^(-?\d+) (\d{2}):(\d{2})$/.exec(value);
  if (!match) throw new Error(`Only day-and-time moments compare: ${value}`);
  return Number(match[1]) * 1440 + Number(match[2]) * 60 + Number(match[3]);
}

/** A moment between two others (inclusive), rounded to five minutes, as a day-and-time string. */
export function between(random: Random, from: number, to: number): string {
  const minutes = Math.floor(random.int(Math.ceil(from / 5), Math.floor(to / 5)) * 5);
  const day = Math.floor(minutes / 1440);
  const inDay = minutes - day * 1440;
  return at(day, Math.floor(inDay / 60), inDay % 60);
}
