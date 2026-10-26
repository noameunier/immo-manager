'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  OCCUPANCY_STATUSES,
  OCCUPANCY_STATUS_LABELS,
  PROPERTY_TYPES,
  PROPERTY_TYPE_LABELS,
  createPropertySchema,
  type Building,
  type OwnerEntity,
  type Property,
} from '@immo/shared';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api';
import {
  FormAlert,
  FormSection,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/form-fields';

export function PropertyForm({
  entities,
  buildings,
  property,
  defaultEntityId,
  defaultBuildingId,
}: {
  entities: OwnerEntity[];
  buildings: Building[];
  property?: Property;
  defaultEntityId?: string;
  defaultBuildingId?: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [entityId, setEntityId] = useState(
    property?.entityId ?? defaultEntityId ?? entities[0]?.id ?? '',
  );
  const [buildingId, setBuildingId] = useState(
    property?.buildingId ?? defaultBuildingId ?? '',
  );

  const availableBuildings = useMemo(
    () => buildings.filter((building) => building.entityId === entityId),
    [buildings, entityId],
  );

  const isIndependent = buildingId === '';
  const isEdit = Boolean(property);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setGlobalError(null);

    const formData = new FormData(event.currentTarget);
    const values = {
      entityId,
      buildingId: buildingId === '' ? null : buildingId,
      name: String(formData.get('name') ?? ''),
      reference: String(formData.get('reference') ?? ''),
      type: String(formData.get('type') ?? ''),
      lotNumber: String(formData.get('lotNumber') ?? ''),
      floor: String(formData.get('floor') ?? ''),
      surfaceM2: String(formData.get('surfaceM2') ?? ''),
      rooms: String(formData.get('rooms') ?? ''),
      occupancyStatus: String(formData.get('occupancyStatus') ?? 'UNKNOWN'),
      description: String(formData.get('description') ?? ''),
      addressLine1: String(formData.get('addressLine1') ?? ''),
      addressLine2: String(formData.get('addressLine2') ?? ''),
      postalCode: String(formData.get('postalCode') ?? ''),
      city: String(formData.get('city') ?? ''),
      country: String(formData.get('country') ?? 'FR'),
    };

    const parsed = createPropertySchema.safeParse(values);
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
      const saved = await apiFetch<Property>(
        property ? `/properties/${property.id}` : '/properties',
        { method: property ? 'PATCH' : 'POST', body: parsed.data },
      );
      router.push(`/biens/${saved.id}`);
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

      <FormSection title="Rattachement">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="entityId">
              Entité propriétaire <span className="text-red-600">*</span>
            </label>
            <select
              id="entityId"
              className="field-input"
              value={entityId}
              onChange={(event) => {
                setEntityId(event.target.value);
                setBuildingId('');
              }}
              required
            >
              <option value="">Sélectionner une entité</option>
              {entities.map((entity) => (
                <option key={entity.id} value={entity.id}>
                  {entity.name}
                </option>
              ))}
            </select>
            {errors.entityId ? <p className="field-error">{errors.entityId}</p> : null}
          </div>

          <div>
            <label className="field-label" htmlFor="buildingId">
              Immeuble
            </label>
            <select
              id="buildingId"
              className="field-input"
              value={buildingId}
              onChange={(event) => setBuildingId(event.target.value)}
            >
              <option value="">Aucun — bien indépendant</option>
              {availableBuildings.map((building) => (
                <option key={building.id} value={building.id}>
                  {building.name} ({building.city})
                </option>
              ))}
            </select>
            <p className="field-hint">
              Laissez vide pour une maison, un garage ou un parking indépendant.
            </p>
          </div>
        </div>
      </FormSection>

      <FormSection title="Description du bien">
        <TextField
          label="Nom du bien"
          name="name"
          required
          defaultValue={property?.name}
          placeholder="Ex. Appartement 3B"
          error={errors.name}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Type de bien"
            name="type"
            required
            defaultValue={property?.type ?? 'APARTMENT'}
            error={errors.type}
            options={PROPERTY_TYPES.map((type) => ({
              value: type,
              label: PROPERTY_TYPE_LABELS[type],
            }))}
          />
          <SelectField
            label="Occupation"
            name="occupancyStatus"
            defaultValue={property?.occupancyStatus ?? 'UNKNOWN'}
            error={errors.occupancyStatus}
            options={OCCUPANCY_STATUSES.map((status) => ({
              value: status,
              label: OCCUPANCY_STATUS_LABELS[status],
            }))}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Numéro de lot"
            name="lotNumber"
            defaultValue={property?.lotNumber ?? ''}
            hint="Unique dans l’immeuble"
            error={errors.lotNumber}
          />
          <TextField
            label="Étage"
            name="floor"
            defaultValue={property?.floor ?? ''}
            error={errors.floor}
          />
          <TextField
            label="Référence"
            name="reference"
            defaultValue={property?.reference ?? ''}
            error={errors.reference}
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Surface (m²)"
            name="surfaceM2"
            type="number"
            min={0}
            step="0.01"
            defaultValue={property?.surfaceM2 ?? ''}
            error={errors.surfaceM2}
          />
          <TextField
            label="Nombre de pièces"
            name="rooms"
            type="number"
            min={0}
            defaultValue={property?.rooms ?? ''}
            error={errors.rooms}
          />
        </div>
        <TextareaField
          label="Description"
          name="description"
          defaultValue={property?.description ?? ''}
          error={errors.description}
        />
      </FormSection>

      <FormSection
        title="Adresse"
        description={
          isIndependent
            ? 'Obligatoire pour un bien indépendant (code postal et ville).'
            : 'Facultative pour un lot : l’adresse de l’immeuble s’applique par défaut.'
        }
      >
        <TextField
          label="Adresse"
          name="addressLine1"
          defaultValue={property?.addressLine1 ?? ''}
          error={errors.addressLine1}
        />
        <TextField
          label="Complément d’adresse"
          name="addressLine2"
          defaultValue={property?.addressLine2 ?? ''}
          error={errors.addressLine2}
        />
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Code postal"
            name="postalCode"
            required={isIndependent}
            defaultValue={property?.postalCode ?? ''}
            error={errors.postalCode}
          />
          <TextField
            label="Ville"
            name="city"
            required={isIndependent}
            defaultValue={property?.city ?? ''}
            error={errors.city}
          />
          <TextField
            label="Pays"
            name="country"
            defaultValue={property?.country ?? 'FR'}
            error={errors.country}
          />
        </div>
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
              : 'Créer le bien'}
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
