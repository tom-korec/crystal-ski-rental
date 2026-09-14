import { describe, expect, it } from 'vitest';

import { BATCH_SIZE, cursorSchema, nextCursor, PAGE_SIZE, pageCount, pageSchema, skipForPage } from '~/lib/pagination';

describe('skipForPage', () => {
  it('skips nothing on the first page and a whole page for each one passed', () => {
    expect(skipForPage(1)).toBe(0);
    expect(skipForPage(3)).toBe(2 * PAGE_SIZE);
    expect(skipForPage(2, BATCH_SIZE)).toBe(BATCH_SIZE);
  });
});

describe('pageCount', () => {
  it.each([
    [0, 1],
    [1, 1],
    [PAGE_SIZE, 1],
    [PAGE_SIZE + 1, 2],
    [PAGE_SIZE * 3, 3],
  ])('%i items → %i pages', (total, pages) => {
    expect(pageCount(total)).toBe(pages);
  });
});

describe('nextCursor', () => {
  it('points past the batch just sent while more remain', () => {
    expect(nextCursor(0, BATCH_SIZE, 30)).toBe(BATCH_SIZE);
  });

  it('stops after the last batch, a single batch, or an empty list', () => {
    expect(nextCursor(24, 6, 30)).toBeNull();
    expect(nextCursor(0, 5, 5)).toBeNull();
    expect(nextCursor(0, 0, 0)).toBeNull();
  });
});

describe('paging inputs', () => {
  it('default to the first page and first batch', () => {
    expect(pageSchema.parse(undefined)).toBe(1);
    expect(cursorSchema.parse(undefined)).toBeUndefined();
  });

  it.each([0, -1, 1.5])('refuse page %d', (page) => {
    expect(pageSchema.safeParse(page).success).toBe(false);
  });
});
