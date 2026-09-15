'use client';

import { zodResolver } from '@hookform/resolvers/zod';
import { PencilIcon, UserPlusIcon } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useState } from 'react';
import { Controller, useForm, useWatch } from 'react-hook-form';
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

/** A manager runs one store (FR-64); the form asks for it before the server has to. */
function requireManagerStore(values: { role?: Role; storeId?: string | null }, ctx: z.RefinementCtx): void {
  if (values.role === 'MANAGER' && !values.storeId) {
    ctx.addIssue({ code: 'custom', path: ['storeId'], message: 'Choose a store.' });
  }
}

const accountCreateFormSchema = userCreateSchema.superRefine(requireManagerStore);

/** Editing may leave the password empty, which keeps the current one. */
const accountEditFormSchema = userEditSchema
  .extend({
    role: roleSchema,
    storeId: z.uuid().nullish(),
    password: z.union([z.literal(''), z.string().min(MIN_PASSWORD_LENGTH).max(MAX_PASSWORD_LENGTH)]),
  })
  .superRefine(requireManagerStore);

type CreateInput = z.input<typeof accountCreateFormSchema>;
type CreateOutput = z.output<typeof accountCreateFormSchema>;
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

interface StoreSelectProps {
  value: string | null | undefined;
  onChange: (storeId: string) => void;
  error?: boolean;
}

function StoreSelect({ value, onChange, error }: StoreSelectProps) {
  const t = useTranslations('accounts');
  const stores = api.store.list.useQuery();

  return (
    <SelectField
      id="account-store"
      label={t('store')}
      placeholder={t('selectStore')}
      options={(stores.data ?? []).map((store) => ({ value: store.id, label: store.name }))}
      value={value ?? undefined}
      onChange={onChange}
      disabled={stores.isPending}
      hint={t('storeHint')}
      error={error ? t('errors.store') : undefined}
    />
  );
}

function CreateAccountForm({ actorRole, onDone }: { actorRole?: string | null; onDone: () => void }) {
  const t = useTranslations('accounts');
  const utils = api.useUtils();
  const form = useForm<CreateInput, unknown, CreateOutput>({
    resolver: zodResolver(accountCreateFormSchema),
    defaultValues: { name: '', email: '', password: '', role: 'USER' },
  });
  const { errors } = form.formState;
  const createRole = useWatch({ control: form.control, name: 'role' });
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
      {createRole === 'MANAGER' ? (
        <Controller
          control={form.control}
          name="storeId"
          render={({ field }) => (
            <StoreSelect value={field.value} onChange={field.onChange} error={Boolean(errors.storeId)} />
          )}
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
    defaultValues: {
      id: account.id,
      name: account.name,
      email: account.email,
      role: account.role,
      storeId: account.store?.id ?? null,
      password: '',
    },
  });
  const { errors } = form.formState;
  const editRole = useWatch({ control: form.control, name: 'role' });
  const update = api.user.update.useMutation({
    onSuccess: async () => {
      await Promise.all([utils.user.byId.invalidate({ id: account.id }), utils.user.list.invalidate()]);
      onDone();
    },
  });

  function submit({ password, role, storeId, ...values }: EditValues) {
    update.mutate({
      ...values,
      // Only sent when they change, so a manager editing a customer never sends a role or store at all.
      ...(role !== account.role ? { role } : {}),
      ...(role === 'MANAGER' && storeId !== account.store?.id ? { storeId } : {}),
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
      {isAdmin(actorRole) && editRole === 'MANAGER' ? (
        <Controller
          control={form.control}
          name="storeId"
          render={({ field }) => (
            <StoreSelect value={field.value} onChange={field.onChange} error={Boolean(errors.storeId)} />
          )}
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
