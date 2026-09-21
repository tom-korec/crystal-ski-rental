import { z } from 'zod';

/** Better Auth's own minimum. */
export const MIN_PASSWORD_LENGTH = 8;
export const MAX_PASSWORD_LENGTH = 128;
export const NAME_MAX_LENGTH = 100;

export const signInSchema = z.object({
  email: z.email(),
  // Deliberately not the sign-up policy: refusing a short password here would reveal the policy
  // instead of just saying the credentials are wrong.
  password: z.string().min(1),
});

export const signUpSchema = z.object({
  name: z.string().trim().min(1).max(NAME_MAX_LENGTH),
  email: z.email(),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
  /** The Terms and Privacy policy must be accepted to create an account (FR-7). */
  acceptLegal: z.boolean().refine((accepted) => accepted, 'Accept the terms and the privacy policy.'),
});

export type SignInInput = z.infer<typeof signInSchema>;
export type SignUpInput = z.infer<typeof signUpSchema>;

export const passwordResetRequestSchema = z.object({ email: z.email() });

/** Asking for a new confirmation link: the address is all we have, the account may not be signed in (FR-9). */
export const verificationRequestSchema = z.object({ email: z.email() });

export const passwordResetSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

export type PasswordResetRequestInput = z.infer<typeof passwordResetRequestSchema>;
export type VerificationRequestInput = z.infer<typeof verificationRequestSchema>;
export type PasswordResetInput = z.infer<typeof passwordResetSchema>;
