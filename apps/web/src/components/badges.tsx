import {
  OCCUPANCY_STATUS_LABELS,
  OWNER_ENTITY_TYPE_LABELS,
  PROPERTY_TYPE_LABELS,
  type OccupancyStatus,
  type OwnerEntityType,
  type PropertyType,
} from '@immo/shared';

export function EntityTypeBadge({ type }: { type: OwnerEntityType }) {
  const styles: Record<OwnerEntityType, string> = {
    INDIVIDUAL: 'bg-sky-50 text-sky-700',
    SCI: 'bg-violet-50 text-violet-700',
    COMPANY: 'bg-amber-50 text-amber-800',
    UNDIVIDED: 'bg-slate-100 text-slate-700',
  };
  return <span className={`badge ${styles[type]}`}>{OWNER_ENTITY_TYPE_LABELS[type]}</span>;
}

export function PropertyTypeBadge({ type }: { type: PropertyType }) {
  return <span className="badge bg-slate-100 text-slate-700">{PROPERTY_TYPE_LABELS[type]}</span>;
}

export function OccupancyBadge({ status }: { status: OccupancyStatus }) {
  const styles: Record<OccupancyStatus, string> = {
    VACANT: 'bg-emerald-50 text-emerald-700',
    OCCUPIED: 'bg-brand-50 text-brand-800',
    UNKNOWN: 'bg-slate-100 text-slate-600',
  };
  return <span className={`badge ${styles[status]}`}>{OCCUPANCY_STATUS_LABELS[status]}</span>;
}

export function ArchivedBadge() {
  return <span className="badge bg-amber-50 text-amber-800">Archivé</span>;
}
