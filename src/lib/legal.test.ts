import { describe, expect, it } from 'vitest';

import { hasAcceptedCurrentTerms, LEGAL_VERSIONS } from '~/lib/legal';

describe('hasAcceptedCurrentTerms', () => {
  it('needs both current versions', () => {
    const current = { termsAcceptedVersion: LEGAL_VERSIONS.terms, privacyAcceptedVersion: LEGAL_VERSIONS.privacy };
    expect(hasAcceptedCurrentTerms(current)).toBe(true);
    expect(hasAcceptedCurrentTerms({ ...current, privacyAcceptedVersion: null })).toBe(false);
    expect(hasAcceptedCurrentTerms({ ...current, termsAcceptedVersion: '2020-01-01' })).toBe(false);
    expect(hasAcceptedCurrentTerms({})).toBe(false);
  });
});
