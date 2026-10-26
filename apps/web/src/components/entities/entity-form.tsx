'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  OWNER_ENTITY_TYPES,
  OWNER_ENTITY_TYPE_LABELS,
  createOwnerEntitySchema,
  type OwnerEntity,
} from '@immo/shared';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api';
import {
  FormAlert,
  FormSection,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/form-fields';

export function EntityForm({ entity }: { entity?: OwnerEntity }) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(entity);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setGlobalError(null);

    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      [
        'type',
        'name',
        'legalName',
        'siren',
        'siret',
        'vatNumber',
        'email',
        'phone',
        'addressLine1',
        'addressLine2',
        'postalCode',
        'city',
        'country',
        'notes',
      ].map((field) => [field, String(formData.get(field) ?? '')]),
    );

    const parsed = createOwnerEntitySchema.safeParse(values);
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
      const saved = await apiFetch<OwnerEntity>(
        entity ? `/owner-entities/${entity.id}` : '/owner-entities',
        { method: entity ? 'PATCH' : 'POST', body: parsed.data },
      );
      router.push(`/entites/${saved.id}`);
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

      <FormSection title="Identification">
        <SelectField
          label="Type d’entité"
          name="type"
          required
          defaultValue={entity?.type ?? 'INDIVIDUAL'}
          error={errors.type}
          options={OWNER_ENTITY_TYPES.map((type) => ({
            value: type,
            label: OWNER_ENTITY_TYPE_LABELS[type],
          }))}
        />
        <TextField
          label="Nom usuel"
          name="name"
          required
          defaultValue={entity?.name}
          hint="Le nom que vous utilisez au quotidien (ex. « SCI Bellecour »)."
          error={errors.name}
        />
        <TextField
          label="Raison sociale"
          name="legalName"
          defaultValue={entity?.legalName ?? ''}
          hint="Nom légal complet, si différent du nom usuel."
          error={errors.legalName}
        />
      </FormSection>

      <FormSection
        title="Informations légales"
        description="Facultatif. Le SIREN et le SIRET sont vérifiés par leur somme de contrôle."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="SIREN"
            name="siren"
            defaultValue={entity?.siren ?? ''}
            placeholder="9 chiffres"
            error={errors.siren}
          />
          <TextField
            label="SIRET"
            name="siret"
            defaultValue={entity?.siret ?? ''}
            placeholder="14 chiffres"
            error={errors.siret}
          />
        </div>
        <TextField
          label="Numéro de TVA intracommunautaire"
          name="vatNumber"
          defaultValue={entity?.vatNumber ?? ''}
          placeholder="FR12345678901"
          error={errors.vatNumber}
        />
      </FormSection>

      <FormSection title="Contact">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Email"
            name="email"
            type="email"
            defaultValue={entity?.email ?? ''}
            error={errors.email}
          />
          <TextField
            label="Téléphone"
            name="phone"
            type="tel"
            defaultValue={entity?.phone ?? ''}
            error={errors.phone}
          />
        </div>
      </FormSection>

      <FormSection title="Adresse">
        <TextField
          label="Adresse"
          name="addressLine1"
          defaultValue={entity?.addressLine1 ?? ''}
          error={errors.addressLine1}
        />
        <TextField
          label="Complément d’adresse"
          name="addressLine2"
          defaultValue={entity?.addressLine2 ?? ''}
          error={errors.addressLine2}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Code postal"
            name="postalCode"
            defaultValue={entity?.postalCode ?? ''}
            error={errors.postalCode}
          />
          <TextField label="Ville" name="city" defaultValue={entity?.city ?? ''} error={errors.city} />
          <TextField
            label="Pays"
            name="country"
            defaultValue={entity?.country ?? 'FR'}
            hint="Code à 2 lettres"
            error={errors.country}
          />
        </div>
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          label="Notes internes"
          name="notes"
          defaultValue={entity?.notes ?? ''}
          error={errors.notes}
        />
      </FormSection>

      <div className="flex flex-wrap gap-3">
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting ? 'Enregistrement…' : isEdit ? 'Enregistrer les modifications' : 'Créer l’entité'}
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
