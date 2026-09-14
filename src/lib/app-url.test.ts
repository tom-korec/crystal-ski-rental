import { describe, expect, it } from 'vitest';

import { appUrl, trustedOrigins } from '~/lib/app-url';

describe('appUrl', () => {
  it('uses BETTER_AUTH_URL when it is set', () => {
    expect(appUrl({ BETTER_AUTH_URL: 'http://localhost:3100', VERCEL_URL: 'x.vercel.app' })).toBe(
      'http://localhost:3100',
    );
  });

  it('uses the production domain in production', () => {
    expect(
      appUrl({
        VERCEL_ENV: 'production',
        VERCEL_URL: 'crystal-abc123.vercel.app',
        VERCEL_PROJECT_PRODUCTION_URL: 'crystal-ski-rental.vercel.app',
      }),
    ).toBe('https://crystal-ski-rental.vercel.app');
  });

  it('uses the deployment host on a preview', () => {
    expect(appUrl({ VERCEL_ENV: 'preview', VERCEL_URL: 'crystal-git-feature-abc.vercel.app' })).toBe(
      'https://crystal-git-feature-abc.vercel.app',
    );
  });

  it('falls back to the local development server', () => {
    expect(appUrl({})).toBe('http://localhost:3000');
  });
});

describe('trustedOrigins', () => {
  it('trusts both hosts a preview is opened on', () => {
    expect(
      trustedOrigins({
        VERCEL_ENV: 'preview',
        VERCEL_URL: 'crystal-abc123.vercel.app',
        VERCEL_BRANCH_URL: 'crystal-git-feature.vercel.app',
      }),
    ).toEqual(['https://crystal-abc123.vercel.app', 'https://crystal-git-feature.vercel.app']);
  });

  it('lists each origin once', () => {
    expect(trustedOrigins({ BETTER_AUTH_URL: 'http://localhost:3000' })).toEqual(['http://localhost:3000']);
  });
});
