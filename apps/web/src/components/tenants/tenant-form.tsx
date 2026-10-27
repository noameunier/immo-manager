'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { TENANT_TYPES, TENANT_TYPE_LABELS, createTenantSchema, type Tenant } from '@immo/shared';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api';
import {
  FormAlert,
  FormSection,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/form-fields';

export function TenantForm({ tenant }: { tenant?: Tenant }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(tenant);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setGlobalError(null);

    const formData = new FormData(event.currentTarget);
    const values = {
      type: String(formData.get('type') ?? 'INDIVIDUAL'),
      name: String(formData.get('name') ?? ''),
      email: String(formData.get('email') ?? ''),
      phone: String(formData.get('phone') ?? ''),
      addressLine1: String(formData.get('addressLine1') ?? ''),
      addressLine2: String(formData.get('addressLine2') ?? ''),
      postalCode: String(formData.get('postalCode') ?? ''),
      city: String(formData.get('city') ?? ''),
      country: String(formData.get('country') ?? 'FR'),
      notes: String(formData.get('notes') ?? ''),
    };

    const parsed = createTenantSchema.safeParse(values);
    if (!parsed.success) {
      setErrors(
        Object.fromEntries(
          parsed.error.issues.map((issue) => [issue.path.join('.'), issue.message]),
        ),
      );
      return;
    }

    setSubmitting(true);
    try {
      const saved = await apiFetch<Tenant>(tenant ? `/tenants/${tenant.id}` : '/tenants', {
        method: tenant ? 'PATCH' : 'POST',
        body: parsed.data,
      });
      router.push(`/locataires/${saved.id}`);
      router.refresh();
    } catch (error) {
      setErrors(fieldErrors(error));
      setGlobalError(errorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-8" noValidate>
      {globalError ? <FormAlert>{globalError}</FormAlert> : null}

      <FormSection title="Identité">
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type de locataire"
            name="type"
            required
            defaultValue={tenant?.type ?? 'INDIVIDUAL'}
            error={errors.type}
            options={TENANT_TYPES.map((type) => ({
              value: type,
              label: TENANT_TYPE_LABELS[type],
            }))}
          />
          <TextField
            label="Nom complet ou raison sociale"
            name="name"
            required
            defaultValue={tenant?.name}
            placeholder="Ex. Camille Dupont ou SARL Dupont"
            error={errors.name}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Adresse email"
            name="email"
            type="email"
            defaultValue={tenant?.email ?? ''}
            error={errors.email}
          />
          <TextField
            label="Téléphone"
            name="phone"
            type="tel"
            defaultValue={tenant?.phone ?? ''}
            error={errors.phone}
          />
        </div>
      </FormSection>

      <FormSection
        title="Adresse"
        description="Facultative, utile pour les courriers et états des lieux."
      >
        <TextField
          label="Adresse"
          name="addressLine1"
          defaultValue={tenant?.addressLine1 ?? ''}
          error={errors.addressLine1}
        />
        <TextField
          label="Complément d’adresse"
          name="addressLine2"
          defaultValue={tenant?.addressLine2 ?? ''}
          error={errors.addressLine2}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Code postal"
            name="postalCode"
            defaultValue={tenant?.postalCode ?? ''}
            error={errors.postalCode}
          />
          <TextField
            label="Ville"
            name="city"
            defaultValue={tenant?.city ?? ''}
            error={errors.city}
          />
          <TextField
            label="Pays"
            name="country"
            defaultValue={tenant?.country ?? 'FR'}
            error={errors.country}
          />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          label="Notes internes"
          name="notes"
          defaultValue={tenant?.notes ?? ''}
          error={errors.notes}
        />
      </FormSection>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting
            ? 'Enregistrement…'
            : isEdit
              ? 'Enregistrer les modifications'
              : 'Créer le locataire'}
        </button>
        <button
          type="button"
          className="btn-secondary"
          onClick={() => router.back()}
          disabled={submitting}
        >
          Annuler
        </button>
      </div>
    </form>
  );
}
