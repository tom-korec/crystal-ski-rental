import { TRPCError } from '@trpc/server';
import { APIError } from 'better-auth/api';

import type { PasswordResetInput, PasswordResetRequestInput, SignInInput, SignUpInput } from '~/lib/auth-schema';
import type { VerificationRequestInput } from '~/lib/auth-schema';
import { LEGAL_VERSIONS } from '~/lib/legal';
import type { PasswordChangeInput, ProfileUpdateInput } from '~/lib/profile-schema';
import { RESET_PASSWORD, VERIFY_EMAIL } from '~/lib/routes';
import { clientKey, type RateLimitRule, RATE_LIMITS } from '~/server/api/rate-limit';
import { auth } from '~/server/better-auth';
import type { Clock } from './clock';
import type { Mailer } from './mailer';
import type { RateLimiter } from './rate-limiter';
import type { Services } from './types';

import type { PrismaClient } from '../../../generated/prisma/client';

// Sign-in and sign-up go through tRPC so the forms share one typed API and one set of Zod schemas.
// Better Auth sets the session cookie on its own response, so it is copied onto the tRPC response.

const TOO_MANY_ATTEMPTS = 'Too many attempts. Please wait a few minutes and try again.';
const EMAIL_UNAVAILABLE = 'Password reset is unavailable right now. Please ask us to set a new password.';
const EMAIL_NOT_CONFIRMED = 'Confirm your e-mail address first.';
const CONFIRMATION_UNAVAILABLE = 'Confirmation e-mail is unavailable right now. Please ask us to confirm your account.';

/** The request a call arrived on: Better Auth reads the session cookie from it and sets new ones back. */
export interface AuthRequest {
  headers: Headers;
  /** Absent for calls from a server component, where there is no response to set cookies on. */
  resHeaders?: Headers;
}

function forwardCookies(from: Headers, to: Headers | undefined): void {
  if (!to) return;

  // `getSetCookie` keeps each cookie separate; reading the header as one string would join them with
  // commas and corrupt any cookie that carries an Expires date.
  for (const cookie of from.getSetCookie()) {
    to.append('set-cookie', cookie);
  }
}

function toTRPCError(error: unknown): TRPCError {
  if (!(error instanceof APIError)) {
    return new TRPCError({ code: 'INTERNAL_SERVER_ERROR', cause: error });
  }

  const code =
    error.statusCode === 401 || error.statusCode === 403
      ? 'UNAUTHORIZED'
      : error.statusCode === 400 || error.statusCode === 422
        ? 'BAD_REQUEST'
        : error.statusCode === 429
          ? 'TOO_MANY_REQUESTS'
          : 'INTERNAL_SERVER_ERROR';

  return new TRPCError({ code, message: error.body?.message, cause: error });
}

/** Better Auth refuses an unconfirmed account with this code, which the sign-in form answers with a resend (FR-9). */
function isUnconfirmedEmail(error: unknown): boolean {
  return error instanceof APIError && error.body?.code === 'EMAIL_NOT_VERIFIED';
}

export class AuthService {
  private readonly db: PrismaClient;
  private readonly clock: Clock;
  private readonly mailer: Mailer;
  private readonly rateLimiter: RateLimiter;

  constructor({ db, clock, mailer, rateLimiter }: Services) {
    this.db = db;
    this.clock = clock;
    this.mailer = mailer;
    this.rateLimiter = rateLimiter;
  }

  /** Every sign-up is a customer: `role` is not accepted as input (FR-1). */
  async signUp(input: SignUpInput, request: AuthRequest) {
    const clientLimit = `sign-up:client:${clientKey(request.headers)}`;

    if (await this.rateLimiter.isLimited(clientLimit, RATE_LIMITS.signUpPerClient)) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: TOO_MANY_ATTEMPTS });
    }
    await this.rateLimiter.record(clientLimit, RATE_LIMITS.signUpPerClient);

    try {
      const { headers, response } = await auth.api.signUpEmail({
        body: { name: input.name, email: input.email, password: input.password, callbackURL: VERIFY_EMAIL },
        headers: request.headers,
        returnHeaders: true,
      });

      forwardCookies(headers, request.resHeaders);

      // The checkbox said yes; what was accepted is always the current version, whatever the client sent.
      // `updateMany` because a sign-up with an address that already has an account answers with a
      // generated user that was never written, and must stay indistinguishable from a new one.
      const now = this.clock.now();
      await this.db.user.updateMany({
        where: { id: response.user.id },
        data: {
          termsAcceptedVersion: LEGAL_VERSIONS.terms,
          termsAcceptedAt: now,
          privacyAcceptedVersion: LEGAL_VERSIONS.privacy,
          privacyAcceptedAt: now,
        },
      });

      // With confirmation on there is no session yet: the account waits for the link (FR-9).
      if (!response.token) return { status: 'confirmationPending' as const };

      return { status: 'signedIn' as const, id: response.user.id, role: response.user.role };
    } catch (error) {
      throw toTRPCError(error);
    }
  }

  async signIn(input: SignInInput, request: AuthRequest) {
    const clientLimit = `sign-in:client:${clientKey(request.headers)}`;
    const accountLimit = `sign-in:account:${input.email.toLowerCase()}`;

    if (
      (await this.rateLimiter.isLimited(clientLimit, RATE_LIMITS.signInPerClient)) ||
      (await this.rateLimiter.isLimited(accountLimit, RATE_LIMITS.signInPerAccount))
    ) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: TOO_MANY_ATTEMPTS });
    }

    try {
      const { headers, response } = await auth.api.signInEmail({
        body: { email: input.email, password: input.password },
        headers: request.headers,
        returnHeaders: true,
      });

      forwardCookies(headers, request.resHeaders);

      return { id: response.user.id, role: response.user.role };
    } catch (error) {
      // The password was right, so this is not a failed attempt: it must not count towards the limit.
      if (isUnconfirmedEmail(error)) {
        throw new TRPCError({ code: 'FORBIDDEN', message: EMAIL_NOT_CONFIRMED, cause: error });
      }

      const failure = toTRPCError(error);

      if (failure.code === 'UNAUTHORIZED') {
        await Promise.all([
          this.rateLimiter.record(clientLimit, RATE_LIMITS.signInPerClient),
          this.rateLimiter.record(accountLimit, RATE_LIMITS.signInPerAccount),
        ]);
      }

      throw failure;
    }
  }

  /**
   * Asks for a reset link (FR-8). The answer is the same whether or not the address has an account, so
   * it never reveals who is registered; seeded demo accounts get no link at all (they share one public
   * password), which the send policy enforces.
   */
  async requestPasswordReset(input: PasswordResetRequestInput, request: AuthRequest) {
    await this.limitByAddress('password-reset', input.email, request, {
      perClient: RATE_LIMITS.passwordResetPerClient,
      perAccount: RATE_LIMITS.passwordResetPerAccount,
    });

    if (!this.mailer.isConfigured) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: EMAIL_UNAVAILABLE });
    }

    try {
      await auth.api.requestPasswordReset({
        body: { email: input.email, redirectTo: RESET_PASSWORD },
        headers: request.headers,
      });
    } catch (error) {
      // An unknown address, a closed mailbox or a slow provider all look the same to the caller.
      console.error('Requesting a password reset failed:', error);
    }

    return { requested: true };
  }

  /**
   * Asks for a new confirmation link (FR-9). Like the reset, the answer is the same for an address with
   * no account, one already confirmed and one still waiting, so it reveals nothing.
   */
  async resendConfirmation(input: VerificationRequestInput, request: AuthRequest) {
    await this.limitByAddress('confirmation', input.email, request, {
      perClient: RATE_LIMITS.confirmationPerClient,
      perAccount: RATE_LIMITS.confirmationPerAccount,
    });

    if (!this.mailer.isConfigured) {
      throw new TRPCError({ code: 'PRECONDITION_FAILED', message: CONFIRMATION_UNAVAILABLE });
    }

    try {
      // Without the caller's headers Better Auth takes its anonymous path, which is constant-time and
      // says the same thing for every address.
      await auth.api.sendVerificationEmail({ body: { email: input.email, callbackURL: VERIFY_EMAIL } });
    } catch (error) {
      console.error('Sending a confirmation link failed:', error);
    }

    return { requested: true };
  }

  /** Sets a new password from the link's one-time token, which Better Auth checks and then spends. */
  async resetPassword(input: PasswordResetInput) {
    try {
      await auth.api.resetPassword({ body: { newPassword: input.password, token: input.token } });

      return { reset: true };
    } catch (error) {
      throw toTRPCError(error);
    }
  }

  /** A customer accepts the current Terms and Privacy policy, e.g. after they changed (FR-7). */
  async acceptLegal(userId: string) {
    const now = this.clock.now();

    await this.db.user.update({
      where: { id: userId },
      data: {
        termsAcceptedVersion: LEGAL_VERSIONS.terms,
        termsAcceptedAt: now,
        privacyAcceptedVersion: LEGAL_VERSIONS.privacy,
        privacyAcceptedAt: now,
      },
    });
  }

  /** Name only: the e-mail is the sign-in identifier and nothing verifies a new one (FR-4). */
  updateProfile(userId: string, input: ProfileUpdateInput) {
    return this.db.user.update({ where: { id: userId }, data: { name: input.name }, select: { id: true, name: true } });
  }

  /**
   * Better Auth checks the current password, revokes every other session and re-issues this one, so
   * the new cookie has to be forwarded or the caller would be signed out (FR-4).
   */
  async changePassword(input: PasswordChangeInput, request: AuthRequest) {
    try {
      const { headers } = await auth.api.changePassword({
        body: { currentPassword: input.currentPassword, newPassword: input.newPassword, revokeOtherSessions: true },
        headers: request.headers,
        returnHeaders: true,
      });

      forwardCookies(headers, request.resHeaders);

      return { success: true };
    } catch (error) {
      throw toTRPCError(error);
    }
  }

  async signOut(request: AuthRequest) {
    try {
      const { headers } = await auth.api.signOut({ headers: request.headers, returnHeaders: true });

      forwardCookies(headers, request.resHeaders);

      return { success: true };
    } catch (error) {
      throw toTRPCError(error);
    }
  }

  /** The two e-mail links are limited the same way: per client and per address, counted before sending. */
  private async limitByAddress(
    action: string,
    email: string,
    request: AuthRequest,
    rules: { perClient: RateLimitRule; perAccount: RateLimitRule },
  ) {
    const clientLimit = `${action}:client:${clientKey(request.headers)}`;
    const accountLimit = `${action}:account:${email.toLowerCase()}`;

    if (
      (await this.rateLimiter.isLimited(clientLimit, rules.perClient)) ||
      (await this.rateLimiter.isLimited(accountLimit, rules.perAccount))
    ) {
      throw new TRPCError({ code: 'TOO_MANY_REQUESTS', message: TOO_MANY_ATTEMPTS });
    }

    await Promise.all([
      this.rateLimiter.record(clientLimit, rules.perClient),
      this.rateLimiter.record(accountLimit, rules.perAccount),
    ]);
  }
}
