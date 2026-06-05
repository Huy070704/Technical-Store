import { useEffect, useState, type FormEvent } from 'react';
import type { AuthUser } from '@/types/auth';
import MaterialIcon from '../shared/MaterialIcon';

type AccountFormModalProps = {
  account: AuthUser | null;
  roles: { id: string; name: string; slug: string }[];
  saving?: boolean;
  onClose: () => void;
  onSubmit: (payload: { name: string; phone: string; roleSlug: string }) => void;
};

type FormState = {
  name: string;
  phone: string;
  roleSlug: string;
};

const emptyForm: FormState = {
  name: '',
  phone: '',
  roleSlug: '',
};

const AccountFormModal = ({
  account,
  roles,
  saving = false,
  onClose,
  onSubmit,
}: AccountFormModalProps) => {
  const [form, setForm] = useState<FormState>(emptyForm);

  useEffect(() => {
    if (!account) {
      setForm(emptyForm);
      return;
    }

    const currentRoleSlug = typeof account.role === 'string' ? account.role : account.role?.slug || account.role?.name || '';

    setForm({
      name: account.name || '',
      phone: account.phone || '',
      roleSlug: currentRoleSlug,
    });
  }, [account]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit({
      name: form.name.trim(),
      phone: form.phone.trim(),
      roleSlug: form.roleSlug,
    });
  };

  const updateForm = (field: keyof FormState, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const currentRoleName = account
    ? typeof account.role === 'string'
      ? account.role
      : account.role?.name
    : '';

  const isTargetAdmin = typeof account?.role === 'string'
    ? account.role.toLowerCase() === 'admin'
    : account?.role?.slug === 'admin' || account?.role?.name?.toLowerCase() === 'admin';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-md animate-fade-in">
      <div className="w-full max-w-lg rounded-lg bg-bg-card shadow-xl border border-slate-border/50">
        <div className="flex items-center justify-between border-b border-slate-border/50 px-lg py-md">
          <div>
            <h2 className="text-headline-sm font-bold text-on-surface">
              Edit Account
            </h2>
            <p className="text-body-sm text-secondary">Modify account profile and system permissions.</p>
          </div>
          <button
            aria-label="Close account form"
            className="rounded p-xs text-secondary transition-colors hover:bg-bg-soft hover:text-on-surface"
            onClick={onClose}
            type="button"
          >
            <MaterialIcon name="close" />
          </button>
        </div>

        <form className="space-y-md p-lg" onSubmit={handleSubmit}>
          <div className="space-y-md">
            <label className="block space-y-xs">
              <span className="text-label-md text-on-surface font-medium">Email (Read-only)</span>
              <input
                className="w-full rounded-lg border border-slate-border/50 bg-surface-container-low px-md py-sm text-body-sm text-secondary cursor-not-allowed opacity-70"
                disabled
                value={account?.email || ''}
              />
            </label>

            <label className="block space-y-xs">
              <span className="text-label-md text-on-surface font-medium">Full Name</span>
              <input
                className="w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                required
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
              />
            </label>

            <label className="block space-y-xs">
              <span className="text-label-md text-on-surface font-medium">Phone Number</span>
              <input
                className="w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                value={form.phone}
                onChange={(event) => updateForm('phone', event.target.value)}
              />
            </label>

            <label className="block space-y-xs">
              <span className="text-label-md text-on-surface font-medium">System Role</span>
              {isTargetAdmin ? (
                <div className="w-full rounded-lg border border-slate-border/50 bg-surface-container-low px-md py-sm text-body-sm text-secondary cursor-not-allowed opacity-70">
                  {currentRoleName} (Cannot change Admin role)
                </div>
              ) : (
                <select
                  className="w-full rounded-lg border border-slate-border bg-surface-container-low px-md py-sm text-body-sm focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20 text-on-surface"
                  value={form.roleSlug}
                  onChange={(event) => updateForm('roleSlug', event.target.value)}
                >
                  <option value="" disabled>Select a role</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.slug}>
                      {role.name.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
            </label>
          </div>

          <div className="flex items-center justify-end gap-md border-t border-slate-border/50 pt-md">
            <button
              className="rounded-lg px-lg py-sm text-label-md text-secondary transition-colors hover:bg-bg-soft"
              onClick={onClose}
              type="button"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              className="flex items-center gap-xs rounded-lg bg-primary px-lg py-sm text-label-md text-on-primary transition-colors hover:bg-primary-hover disabled:opacity-50"
              type="submit"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AccountFormModal;
