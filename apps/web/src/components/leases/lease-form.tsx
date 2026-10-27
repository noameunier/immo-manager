'use client';

import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import {
  LEASE_TYPES,
  LEASE_TYPE_LABELS,
  createLeaseSchema,
  type Lease,
  type OwnerEntity,
  type Property,
  type Tenant,
} from '@immo/shared';
import { apiFetch, errorMessage, fieldErrors } from '@/lib/api';
import {
  FormAlert,
  FormSection,
  SelectField,
  TextField,
  TextareaField,
} from '@/components/form-fields';

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function LeaseForm({
  entities,
  properties,
  tenants,
  lease,
  defaultPropertyId,
  defaultTenantId,
}: {
  entities: OwnerEntity[];
  properties: Property[];
  tenants: Tenant[];
  lease?: Lease;
  defaultPropertyId?: string;
  defaultTenantId?: string;
}) {
  const router = useRouter();
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const initialProperty = properties.find(
    (property) => property.id === (lease?.propertyId ?? defaultPropertyId),
  );
  const [entityId, setEntityId] = useState(
    lease?.entityId ?? initialProperty?.entityId ?? entities[0]?.id ?? '',
  );
  const [propertyId, setPropertyId] = useState(lease?.propertyId ?? initialProperty?.id ?? '');

  const availableProperties = useMemo(
    () => properties.filter((property) => property.entityId === entityId),
    [properties, entityId],
  );

  const isEdit = Boolean(lease);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setErrors({});
    setGlobalError(null);

    const formData = new FormData(event.currentTarget);
    const values = {
      entityId,
      propertyId,
      tenantId: String(formData.get('tenantId') ?? ''),
      type: String(formData.get('type') ?? 'NUE'),
      startsOn: String(formData.get('startsOn') ?? ''),
      endsOn: String(formData.get('endsOn') ?? ''),
      rentAmount: String(formData.get('rentAmount') ?? ''),
      chargesAmount: String(formData.get('chargesAmount') ?? ''),
      depositAmount: String(formData.get('depositAmount') ?? ''),
      paymentDay: String(formData.get('paymentDay') ?? '1'),
      notes: String(formData.get('notes') ?? ''),
    };

    const parsed = createLeaseSchema.safeParse(values);
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
      const saved = await apiFetch<Lease>(lease ? `/leases/${lease.id}` : '/leases', {
        method: lease ? 'PATCH' : 'POST',
        body: parsed.data,
      });
      router.push(`/baux/${saved.id}`);
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

      <FormSection
        title="Parties du bail"
        description="Le bailleur est l’entité propriétaire du bien."
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="field-label" htmlFor="entityId">
              Entité bailleur <span className="text-red-600">*</span>
            </label>
            <select
              id="entityId"
              className="field-input"
              value={entityId}
              onChange={(event) => {
                setEntityId(event.target.value);
                setPropertyId('');
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
            <label className="field-label" htmlFor="propertyId">
              Bien loué <span className="text-red-600">*</span>
            </label>
            <select
              id="propertyId"
              className="field-input"
              value={propertyId}
              onChange={(event) => setPropertyId(event.target.value)}
              required
            >
              <option value="">Sélectionner un bien</option>
              {availableProperties.map((property) => (
                <option key={property.id} value={property.id}>
                  {property.name}
                  {property.city ? ` (${property.city})` : ''}
                </option>
              ))}
            </select>
            {errors.propertyId ? <p className="field-error">{errors.propertyId}</p> : null}
            {entityId && availableProperties.length === 0 ? (
              <p className="field-hint">
                Aucun bien actif pour cette entité : créez d’abord un bien.
              </p>
            ) : null}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField
            label="Locataire"
            name="tenantId"
            required
            defaultValue={lease?.tenantId ?? defaultTenantId ?? ''}
            error={errors.tenantId}
            placeholder="Sélectionner un locataire"
            options={tenants.map((tenant) => ({
              value: tenant.id,
              label: tenant.name,
            }))}
          />
          <SelectField
            label="Type de bail"
            name="type"
            required
            defaultValue={lease?.type ?? 'NUE'}
            error={errors.type}
            options={LEASE_TYPES.map((type) => ({
              value: type,
              label: LEASE_TYPE_LABELS[type],
            }))}
          />
        </div>
      </FormSection>

      <FormSection title="Durée">
        <div className="grid gap-4 sm:grid-cols-2">
          <TextField
            label="Date de début"
            name="startsOn"
            type="date"
            required
            defaultValue={lease?.startsOn ?? today()}
            error={errors.startsOn}
          />
          <TextField
            label="Date de fin"
            name="endsOn"
            type="date"
            defaultValue={lease?.endsOn ?? ''}
            hint="Laissez vide pour un bail sans terme."
            error={errors.endsOn}
          />
        </div>
      </FormSection>

      <FormSection
        title="Conditions financières"
        description="Montants mensuels en euros. Les charges s’ajoutent au loyer."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <TextField
            label="Loyer hors charges (€)"
            name="rentAmount"
            required
            defaultValue={lease?.rentAmount ?? ''}
            placeholder="850,00"
            error={errors.rentAmount}
          />
          <TextField
            label="Charges (€)"
            name="chargesAmount"
            defaultValue={lease?.chargesAmount ?? ''}
            placeholder="50,00"
            error={errors.chargesAmount}
          />
          <TextField
            label="Dépôt de garantie (€)"
            name="depositAmount"
            defaultValue={lease?.depositAmount ?? ''}
            placeholder="1 700,00"
            error={errors.depositAmount}
          />
        </div>
        <TextField
          label="Jour d’échéance du loyer"
          name="paymentDay"
          type="number"
          min={1}
          max={31}
          defaultValue={lease?.paymentDay ?? 1}
          hint="Entre 1 et 31."
          error={errors.paymentDay}
        />
      </FormSection>

      <FormSection title="Notes">
        <TextareaField
          label="Clauses ou remarques"
          name="notes"
          defaultValue={lease?.notes ?? ''}
          error={errors.notes}
        />
      </FormSection>

      <div className="flex flex-wrap gap-3">
        <button
          type="submit"
          className="btn-primary"
          disabled={submitting || entities.length === 0 || tenants.length === 0}
        >
          {submitting
            ? 'Enregistrement…'
            : isEdit
              ? 'Enregistrer les modifications'
              : 'Créer le bail'}
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
