'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon, UserPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm } from 'react-hook-form';
import { z } from 'zod';

import { Field } from '~/components/common/field';
import { FormError } from '~/components/common/form-error';
import { SelectField } from '~/components/common/select-field';
import { Button } from '~/components/ui/button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '~/components/ui/dialog';
import { MAX_PASSWORD_LENGTH, MIN_PASSWORD_LENGTH } from '~/lib/auth-schema';
import { isAdmin, type Role, roleSchema } from '~/lib/roles';
import { userCreateSchema, userEditSchema } from '~/lib/user-schema';
import { api, type RouterOutputs } from '~/trpc/react';

type Account = RouterOutputs['user']['byId'];

/** Editing may leave the password empty, which keeps the current one. */
const accountEditFormSchema = userEditSchema.extend({
  role: roleSchema,
  password: z.union([z.literal(''), z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH)]),
});

type CreateInput = z.input<typeof userCreateSchema>;
type CreateOutput = z.output<typeof userCreateSchema>;
type EditValues = z.infer<typeof accountEditFormSchema>;

interface AccountDialogProps {
  actorRole?: string | null;
  /** Absent to create a new account. */
  account?: Account;
}

/**
 * Create or edit an account (FR-61). Only admins see the role control: managers run the customer roster,
 * and the server refuses them staff accounts regardless (FR-62).
 */
export function AccountDialog({ actorRole, account }: AccountDialogProps) {
  const t = useTranslations('accounts');
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {account ? (
        <DialogTrigger render={<Button variant="outline" data-testid="edit-account" />}>
          <PencilIcon aria-hidden />
          {t('edit')}
        </DialogTrigger>
      ) : (
        <DialogTrigger render={<Button data-testid="add-account" />}>
          <UserPlusIcon aria-hidden />
          {t('add')}
        </DialogTrigger>
      )}
      <DialogContent data-testid="account-dialog">
        {open ? (
          account ? (
            <EditAccountForm actorRole={actorRole} account={account} onDone={() => setOpen(false)} />
          ) : (
            <CreateAccountForm actorRole={actorRole} onDone={() => setOpen(false)} />
          )
        ) : null}
      </DialogContent>
    </Dialog>
  );
}

function RoleSelect({ value, onChange }: { value: Role | undefined; onChange: (role: Role) => void }) {
  const t = useTranslations('accounts');
  const tRoles = useTranslations('roles');

  return (
    <SelectField
      id="account-role"
      label={t('role')}
      placeholder={t('role')}
      options={roleSchema.options.map((role) => ({ value: role, label: tRoles(role) }))}
      value={value}
      onChange={(role) => onChange(role as Role)}
    />
  );
}

function CreateAccountForm({ actorRole, onDone }: { actorRole?: string | null; onDone: () => void }) {
  const t = useTranslations('accounts');
  const utils = api.useUtils();
  const form = useForm<CreateInput, unknown, CreateOutput>({
    resolver: zodResolver(userCreateSchema),
    defaultValues: { name: '', email: '', password: '', role: 'USER' },
  });
  const { errors } = form.formState;
  const create = api.user.create.useMutation({
    onSuccess: async () => {
      await utils.user.list.invalidate();
      onDone();
    },
  });

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit((values) => create.mutate(values))}>
      <DialogHeader>
        <DialogTitle>{t('addTitle')}</DialogTitle>
        <DialogDescription>{isAdmin(actorRole) ? t('addDescriptionAdmin') : t('addDescription')}</DialogDescription>
      </DialogHeader>
      <Field
        id="account-name"
        label={t('name')}
        autoComplete="off"
        error={errors.name && t('errors.name')}
        {...form.register('name')}
      />
      <Field
        id="account-email"
        label={t('email')}
        type="email"
        autoComplete="off"
        error={errors.email && t('errors.email')}
        {...form.register('email')}
      />
      <Field
        id="account-password"
        label={t('password')}
        type="password"
        autoComplete="new-password"
        hint={t('passwordHint', { min: MIN_PASSWORD_LENGTH })}
        error={errors.password && t('errors.password', { min: MIN_PASSWORD_LENGTH })}
        {...form.register('password')}
      />
      {isAdmin(actorRole) ? (
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => <RoleSelect value={field.value} onChange={field.onChange} />}
        />
      ) : null}
      <FormError message={create.error?.message} />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={create.isPending} data-testid="save-account">
          {create.isPending ? t('saving') : t('add')}
        </Button>
      </DialogFooter>
    </form>
  );
}

function EditAccountForm({
  actorRole,
  account,
  onDone,
}: {
  actorRole?: string | null;
  account: Account;
  onDone: () => void;
}) {
  const t = useTranslations('accounts');
  const utils = api.useUtils();
  const form = useForm<EditValues>({
    resolver: zodResolver(accountEditFormSchema),
    defaultValues: { id: account.id, name: account.name, email: account.email, role: account.role, password: '' },
  });
  const { errors } = form.formState;
  const update = api.user.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.user.byId.invalidate({ id: account.id }), utils.user.list.invalidate()]);
      onDone();
    },
  });

  function submit({ password, role, ...values }: EditValues) {
    update.mutate({
      ...values,
      // Only sent when they change, so a manager editing a customer never sends a role at all.
      ...(role !== account.role ? { role } : {}),
      ...(password ? { password } : {}),
    });
  }

  return (
    <form noValidate className="flex flex-col gap-4" onSubmit={form.handleSubmit(submit)}>
      <DialogHeader>
        <DialogTitle>{t('editTitle')}</DialogTitle>
        <DialogDescription>{t('editDescription')}</DialogDescription>
      </DialogHeader>
      <Field
        id="account-name"
        label={t('name')}
        autoComplete="off"
        error={errors.name && t('errors.name')}
        {...form.register('name')}
      />
      <Field
        id="account-email"
        label={t('email')}
        type="email"
        autoComplete="off"
        error={errors.email && t('errors.email')}
        {...form.register('email')}
      />
      {isAdmin(actorRole) ? (
        <Controller
          control={form.control}
          name="role"
          render={({ field }) => <RoleSelect value={field.value} onChange={field.onChange} />}
        />
      ) : null}
      <Field
        id="account-password"
        label={t('newPassword')}
        type="password"
        autoComplete="new-password"
        hint={t('newPasswordHint')}
        error={errors.password && t('errors.password', { min: MIN_PASSWORD_LENGTH })}
        {...form.register('password')}
      />
      <FormError message={update.error?.message} />
      <DialogFooter>
        <DialogClose render={<Button type="button" variant="outline" />}>{t('cancel')}</DialogClose>
        <Button type="submit" disabled={update.isPending} data-testid="save-account">
          {update.isPending ? t('saving') : t('save')}
        </Button>
      </DialogFooter>
    </form>
  );
}
