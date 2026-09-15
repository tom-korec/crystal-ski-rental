import type { SkiGender } from '../../../src/lib/catalog';
import type { ModelFile, SkiFile, StoreFile } from '../schema';
import { at, type Random } from './random';

export const SKIS_PER_STORE = 100;

/** The first skis at the first store carry the scripted scenarios, so generated bookings leave them alone. */
export const SCRIPTED_SKI_COUNT = 14;

/** Lengths a rental would stock, by who the model is made for. */
export const LENGTHS_BY_GENDER: Record<SkiGender, number[]> = {
  KID: [100, 110, 120, 130, 140],
  WOMAN: [149, 156, 163, 170],
  MAN: [163, 170, 177, 184],
  UNISEX: [156, 163, 170, 177],
};

export interface FleetSki {
  code: string;
  store: string;
  model: ModelFile[number];
  modelKey: string;
  lengthCm: number;
  outOfRental: boolean;
  /** Removed from the fleet; bookings must end before this day offset. */
  removedOnDay: number | null;
  /** Booked intervals, [start, end) in day offsets, for every reservation that is not cancelled. */
  busy: [number, number][];
}

export function keyOf(model: ModelFile[number]): string {
  return `${model.brand} ${model.name}`;
}

/**
 * About a hundred pairs per store. Each store stocks most models, beginner and intermediate ones in larger
 * numbers, and every kids' model. One pair per store is out of rental, and one pair at the last store was
 * retired after a few seasons of use.
 */
export function buildFleet(random: Random, stores: StoreFile, models: ModelFile): FleetSki[] {
  const skis: FleetSki[] = [];
  let sequence = 1;

  const weightOf = (model: ModelFile[number]) =>
    model.gender === 'KID' ? 3 : model.skillLevel === 'BEGINNER' ? 5 : model.skillLevel === 'INTERMEDIATE' ? 5 : 3;

  for (const [storeIndex, store] of stores.entries()) {
    const stocked = models.filter((model) => model.gender === 'KID' || random.chance(0.8));
    const weighted = stocked.map((model) => [model, weightOf(model)] as const);

    for (let index = 0; index < SKIS_PER_STORE; index++) {
      const model = random.weighted(weighted);
      skis.push({
        code: `SK-${String(sequence++).padStart(4, '0')}`,
        store: store.slug,
        model,
        modelKey: keyOf(model),
        lengthCm: random.pick(LENGTHS_BY_GENDER[model.gender]),
        outOfRental: false,
        removedOnDay: null,
        busy: [],
      });
    }

    const storeSkis = skis.filter((ski) => ski.store === store.slug);
    const firstGenerated = storeIndex === 0 ? SCRIPTED_SKI_COUNT : 0;
    const outOfRental = storeSkis.at(-2);
    if (outOfRental && storeSkis.indexOf(outOfRental) >= firstGenerated) outOfRental.outOfRental = true;
    if (storeIndex === stores.length - 1) {
      const retired = storeSkis.at(-1);
      if (retired) retired.removedOnDay = -15;
    }
  }

  scriptFirstSkis(skis, models);
  return skis;
}

/**
 * The scripted scenarios need particular pairs: the demo customer rents SK-0001's model again as SK-0002
 * (in another length), rents a second, different model with it (SK-0012), and books a kids' pair (SK-0013).
 */
function scriptFirstSkis(skis: FleetSki[], models: ModelFile): void {
  const byCode = (code: string) => {
    const ski = skis.find((candidate) => candidate.code === code);
    if (!ski) throw new Error(`Fleet too small for ${code}`);
    return ski;
  };
  const assign = (ski: FleetSki, model: ModelFile[number], lengthCm: number) => {
    ski.model = model;
    ski.modelKey = keyOf(model);
    ski.lengthCm = lengthCm;
  };
  const model = (key: string) => {
    const found = models.find((candidate) => keyOf(candidate) === key);
    if (!found) throw new Error(`Scripted model ${key} missing`);
    return found;
  };

  assign(byCode('SK-0001'), model('Atomic Redster G9'), 177);
  assign(byCode('SK-0002'), model('Atomic Redster G9'), 156);
  assign(byCode('SK-0012'), model('Salomon S/Max 8'), 163);
  assign(byCode('SK-0013'), model('Rossignol Experience Pro'), 130);
}

export function toSkiFile(skis: FleetSki[]): SkiFile {
  return skis.map((ski, index) => ({
    code: ski.code,
    model: ski.modelKey,
    lengthCm: ski.lengthCm,
    ...(ski.outOfRental ? { outOfRental: true } : {}),
    ...(ski.removedOnDay !== null ? { removedAt: at(ski.removedOnDay, 11) } : {}),
    // Delivered before the season, the first pairs first.
    createdAt: at(-89, 11, Math.min(59, Math.floor((index % SKIS_PER_STORE) / 2))),
  }));
}

/** Whether a pair is free on every day of [start, end). */
export function isFree(ski: FleetSki, start: number, end: number): boolean {
  if (ski.removedOnDay !== null && end > ski.removedOnDay - 5) return false;
  return ski.busy.every(([from, to]) => end <= from || start >= to);
}
