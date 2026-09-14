/** `3 skis`, `1 ski`. English only for now; message catalogues take over when the API is translated. */
export function countOf(count: number, singular: string, plural = `${singular}s`): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
