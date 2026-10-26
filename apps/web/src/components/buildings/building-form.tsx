'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import {
  createBuildingSchema,
  type Building,
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

export function BuildingForm({
  entities,
  building,
  defaultEntityId,
}: {
  entities: OwnerEntity[];
  building?: Building;
  defaultEntityId?: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isEdit = Boolean(building);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setGlobalError(null);

    const formData = new FormData(event.currentTarget);
    const values = Object.fromEntries(
      [
        'entityId',
        'name',
        'reference',
        'addressLine1',
        'addressLine2',
        'postalCode',
        'city',
        'country',
        'constructionYear',
        'notes',
      ].map((field) => [field, String(formData.get(field) ?? '')]),
    );

    const parsed = createBuildingSchema.safeParse(values);
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
      const saved = await apiFetch<Building>(
        building ? `/buildings/${building.id}` : '/buildings',
        { method: building ? 'PATCH' : 'POST', body: parsed.data },
      );
      router.push(`/immeubles/${saved.id}`);
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

      {entities.length === 0 ? (
        <FormAlert>
          Vous devez d’abord créer une entité propriétaire avant d’ajouter un immeuble.
        </FormAlert>
      ) : null}

      <FormSection title="Rattachement">
        <SelectField
          label="Entité propriétaire"
          name="entityId"
          required
          defaultValue={building?.entityId ?? defaultEntityId ?? ''}
          placeholder="Sélectionner une entité"
          disabled={entities.length === 0}
          error={errors.entityId}
          options={entities.map((entity) => ({ value: entity.id, label: entity.name }))}
        />
        <TextField
          label="Nom de l’immeuble"
          name="name"
          required
          defaultValue={building?.name}
          placeholder="Ex. Immeuble Bellecour"
          error={errors.name}
        />
        <TextField
          label="Référence interne"
          name="reference"
          defaultValue={building?.reference ?? ''}
          error={errors.reference}
        />
      </FormSection>

      <FormSection title="Adresse">
        <TextField
          label="Adresse"
          name="addressLine1"
          required
          defaultValue={building?.addressLine1}
          error={errors.addressLine1}
        />
        <TextField
          label="Complément d’adresse"
          name="addressLine2"
          defaultValue={building?.addressLine2 ?? ''}
          error={errors.addressLine2}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Code postal"
            name="postalCode"
            required
            defaultValue={building?.postalCode}
            error={errors.postalCode}
          />
          <TextField
            label="Ville"
            name="city"
            required
            defaultValue={building?.city}
            error={errors.city}
          />
          <TextField
            label="Pays"
            name="country"
            defaultValue={building?.country ?? 'FR'}
            error={errors.country}
          />
        </div>
      </FormSection>

      <FormSection title="Caractéristiques">
        <TextField
          label="Année de construction"
          name="constructionYear"
          type="number"
          min={1000}
          max={new Date().getFullYear() + 5}
          defaultValue={building?.constructionYear ?? ''}
          error={errors.constructionYear}
        />
        <TextareaField
          label="Notes"
          name="notes"
          defaultValue={building?.notes ?? ''}
          error={errors.notes}
        />
      </FormSection>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || entities.length === 0}
        >
          {submitting
            ? 'Enregistrement…'
            : isEdit
              ? 'Enregistrer les modifications'
              : 'Créer l’immeuble'}
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
