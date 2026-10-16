/**
 * BINAA2 — Notifications API Client
 *
 * WEB-001F — Network Web Experience V1 — Notifications Page
 *
 * Backend authority: all validation, authorization, and tenant isolation
 * enforced by Laravel 12 REST API (NotificationController).
 *
 * Verified backend endpoints (from NotificationController.php):
 *   GET    /api/v1/notifications              — list (paginated, unread_only filter)
 *   PATCH  /api/v1/notifications/{id}/read    — mark single as read
 *   PATCH  /api/v1/notifications/read-all     — mark all as read
 *   GET    /api/v1/notifications/unread-count — unread count
 *
 * Authentication: Sanctum SPA Cookie (withCredentials: true).
 * Tenant context: X-Tenant header sent automatically by apiClient interceptor.
 */

import { apiClient } from '@/lib/api/client'

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Notification {
  id: string
  tenant_slug: string
  notifiable_id: string
  notifiable_type: string
  type: string
  channel: string
  data: Record<string, unknown>
  status: string
  read_at: string | null
  created_at: string
  updated_at: string
}

export interface NotificationMeta {
  current_page: number
  last_page: number
  per_page: number
  total: number
}

export interface NotificationsResponse {
  data: Notification[]
  meta: NotificationMeta
}

export interface NotificationFilters {
  unread_only?: boolean
  per_page?: number
  page?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

export function extractNotificationMessage(
  error: unknown,
  fallback = 'حدث خطأ غير متوقع'
): string {
  if (
    error &&
    typeof error === 'object' &&
    'response' in error &&
    error.response &&
    typeof error.response === 'object'
  ) {
    const res = error.response as {
      data?: { message?: string; error?: string; errors?: Record<string, string[]> }
    }
    if (res.data?.message) return res.data.message
    if (res.data?.error) return res.data.error
    if (res.data?.errors) {
      const firstKey = Object.keys(res.data.errors)[0]
      if (firstKey) return res.data.errors[firstKey][0]
    }
  }
  if (error instanceof Error) return error.message
  return fallback
}

/**
 * Format a notification type string into a human-readable Arabic label.
 * Falls back to the raw type if no mapping exists.
 */
export function formatNotificationType(type: string): string {
  const labels: Record<string, string> = {
    'approval.granted': 'تمت الموافقة',
    'approval.rejected': 'تم الرفض',
    'approval.requested': 'طلب موافقة',
    'tender.invitation': 'دعوة مناقصة',
    'tender.awarded': 'ترسية مناقصة',
    'tender.closed': 'إغلاق مناقصة',
    'bid.received': 'عرض سعر جديد',
    'bid.updated': 'تحديث عرض سعر',
    'network.profile.verified': 'تم التحقق من الملف الشخصي',
    'network.profile.rejected': 'رُفض الملف الشخصي',
  }
  return labels[type] ?? type
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * GET /api/v1/notifications
 * List notifications for the authenticated user within the current tenant.
 * Supports pagination and unread_only filter.
 */
export async function listNotifications(
  filters: NotificationFilters = {}
): Promise<NotificationsResponse> {
  const params: Record<string, string | number | boolean> = {}
  if (filters.unread_only) params['unread_only'] = 1
  if (filters.per_page) params['per_page'] = filters.per_page
  if (filters.page) params['page'] = filters.page

  const response = await apiClient.get<NotificationsResponse>('/v1/notifications', { params })
  return response.data
}

/**
 * PATCH /api/v1/notifications/{id}/read
 * Mark a single notification as read.
 * Tenant isolation enforced by backend.
 */
export async function markNotificationAsRead(id: string): Promise<Notification> {
  const response = await apiClient.patch<{ data: Notification }>(
    `/v1/notifications/${id}/read`
  )
  return response.data.data
}

/**
 * PATCH /api/v1/notifications/read-all
 * Mark all unread notifications as read for the authenticated user.
 */
export async function markAllNotificationsAsRead(): Promise<{ marked_count: number }> {
  const response = await apiClient.patch<{ marked_count: number }>(
    '/v1/notifications/read-all'
  )
  return response.data
}

// NOTE: Unread count is derived client-side from listNotifications() results.
// No dedicated /unread-count endpoint exists in the backend (api.php v1).
