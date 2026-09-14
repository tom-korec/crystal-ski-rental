// Where the app is reachable, for Better Auth's base URL and trusted origins. Pure, so it can be tested
// without a deployment.

export interface DeploymentEnv {
  BETTER_AUTH_URL?: string;
  VERCEL_ENV?: string;
  /** The deployment's own host, unique per preview, without the protocol. */
  VERCEL_URL?: string;
  /** The branch's stable preview host. */
  VERCEL_BRANCH_URL?: string;
  /** The production domain. */
  VERCEL_PROJECT_PRODUCTION_URL?: string;
}

const LOCAL_URL = 'http://localhost:3000';

const https = (host: string | undefined) => (host ? `https://${host}` : undefined);

/** An explicit `BETTER_AUTH_URL` wins; on Vercel production uses its domain and a preview its own host. */
export function appUrl(env: DeploymentEnv): string {
  if (env.BETTER_AUTH_URL) return env.BETTER_AUTH_URL;

  if (env.VERCEL_ENV === 'production') {
    return https(env.VERCEL_PROJECT_PRODUCTION_URL) ?? https(env.VERCEL_URL) ?? LOCAL_URL;
  }

  return https(env.VERCEL_URL) ?? LOCAL_URL;
}

/**
 * Every origin a browser may reach this deployment from. A preview is opened both on its unique host and
 * on the branch host, and sign-in is refused from any origin not listed.
 */
export function trustedOrigins(env: DeploymentEnv): string[] {
  const origins = [
    appUrl(env),
    https(env.VERCEL_URL),
    https(env.VERCEL_BRANCH_URL),
    https(env.VERCEL_PROJECT_PRODUCTION_URL),
  ];

  return [...new Set(origins.filter((origin): origin is string => origin !== undefined))];
}
