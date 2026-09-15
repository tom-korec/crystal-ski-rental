// The example legal documents (FR-7, FR-37). Each has a version, the date it took effect: acceptance is
// stored with the version, so a new version is asked for again.

export const LEGAL_DOCUMENTS = ['terms', 'privacy', 'rentalAgreement'] as const;
export type LegalDocument = (typeof LEGAL_DOCUMENTS)[number];

export const LEGAL_VERSIONS: Record<LegalDocument, string> = {
  terms: '2026-09-16',
  privacy: '2026-09-16',
  rentalAgreement: '2026-09-16',
};

export interface LegalAcceptance {
  termsAcceptedVersion?: string | null;
  privacyAcceptedVersion?: string | null;
}

/** A customer may use the app once they have accepted the current Terms and Privacy policy. */
export function hasAcceptedCurrentTerms(user: LegalAcceptance): boolean {
  return user.termsAcceptedVersion === LEGAL_VERSIONS.terms && user.privacyAcceptedVersion === LEGAL_VERSIONS.privacy;
}
