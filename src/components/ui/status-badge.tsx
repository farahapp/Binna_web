/**
 * StatusBadge — P0 Design Baseline
 *
 * Unified status badge for all modules.
 * Uses CSS utility classes from globals.css (.status-badge .status-{key}).
 *
 * Usage:
 *   <StatusBadge status="draft" />
 *   <StatusBadge status="active" label="نشط" />
 */

export type StatusKey =
  | 'draft'
  | 'pending'
  | 'active'
  | 'approved'
  | 'completed'
  | 'closed'
  | 'cancelled'
  | 'rejected'
  | 'inactive'
  | 'issued'
  | 'paid'
  | 'confirmed'

const STATUS_LABELS: Record<StatusKey, string> = {
  draft:     'مسودة',
  pending:   'قيد الانتظار',
  active:    'نشط',
  approved:  'معتمد',
  completed: 'مكتمل',
  closed:    'مغلق',
  cancelled: 'ملغى',
  rejected:  'مرفوض',
  inactive:  'غير نشط',
  issued:    'صادر',
  paid:      'مدفوع',
  confirmed: 'مؤكد',
}

/**
 * Normalize a raw status string to a known StatusKey.
 * Handles uppercase variants (DRAFT → draft) and unknown values.
 */
export function normalizeStatus(raw: string): StatusKey {
  const lower = raw.toLowerCase() as StatusKey
  return lower in STATUS_LABELS ? lower : 'inactive'
}

interface StatusBadgeProps {
  /** Raw status string — normalized automatically */
  status: string
  /** Override the display label */
  label?: string
  className?: string
}

export function StatusBadge({ status, label, className = '' }: StatusBadgeProps) {
  const key = normalizeStatus(status)
  const displayLabel = label ?? STATUS_LABELS[key]

  return (
    <span className={`status-badge status-${key} ${className}`}>
      {displayLabel}
    </span>
  )
}
