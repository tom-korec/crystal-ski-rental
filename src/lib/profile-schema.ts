import { z } from 'zod';

import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH, NAME_MAX_LENGTH } from '~/lib/auth-schema';

// The signed-in account changing itself (FR-4). No id and no role: there is nothing to address and
// nothing to escalate.

export const profileUpdateSchema = z.object({ name: z.string().trim().min(1).max(NAME_MAX_LENGTH) });

export const passwordChangeSchema = z.object({
  // No policy on the current password: the only question is whether it matches.
  currentPassword: z.string().min(1),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH),
});

/** The form adds a confirmation, since a mistyped new password would only surface at the next sign-in. */
export const passwordChangeFormSchema = passwordChangeSchema
  .extend({ confirmPassword: z.string().min(1) })
  .refine((values) => values.newPassword === values.confirmPassword, {
    path: ['confirmPassword'],
    message: 'The passwords do not match.',
  });

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type PasswordChangeFormInput = z.infer<typeof passwordChangeFormSchema>;
