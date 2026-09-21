import { createTRPCRouter } from '~/server/api/trpc';
import { acceptLegal } from './accept-legal';
import { changePassword } from './change-password';
import { requestPasswordReset } from './request-password-reset';
import { resendConfirmation } from './resend-confirmation';
import { resetPassword } from './reset-password';
import { session } from './session';
import { signIn } from './sign-in';
import { signOut } from './sign-out';
import { signUp } from './sign-up';
import { updateProfile } from './update-profile';

export const authRouter = createTRPCRouter({
  acceptLegal,
  changePassword,
  requestPasswordReset,
  resendConfirmation,
  resetPassword,
  session,
  signIn,
  signOut,
  signUp,
  updateProfile,
});
