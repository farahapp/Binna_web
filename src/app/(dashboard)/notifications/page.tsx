'use client'

import { useEffect, useState, useCallback } from 'react'
import {
  listNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  extractNotificationMessage,
  formatNotificationType,
  type Notification,
} from '@/lib/api/notifications'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatTimestamp(ts: string): string {
  const d = new Date(ts)
  return d.toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function getNotificationTitle(notification: Notification): string {
  const data = notification.data
  if (data && typeof data['title'] === 'string') return data['title']
  return formatNotificationType(notification.type)
}

function getNotificationBody(notification: Notification): string | null {
  const data = notification.data
  if (data && typeof data['body'] === 'string') return data['body']
  if (data && typeof data['message'] === 'string') return data['message']
  return null
}

// ─── Notification Item ────────────────────────────────────────────────────────

interface NotificationItemProps {
  notification: Notification
  onMarkRead: (id: string) => void
  markingId: string | null
}

function NotificationItem({ notification, onMarkRead, markingId }: NotificationItemProps) {
  const isUnread = notification.read_at === null
  const isMarking = markingId === notification.id
  const title = getNotificationTitle(notification)
  const body = getNotificationBody(notification)

  return (
    <div
      className={`flex items-start gap-4 p-4 rounded-lg border transition-colors ${
        isUnread
          ? 'bg-primary/5 border-primary/20'
          : 'bg-card border-border'
      }`}
    >
      {/* Unread indicator */}
      <div className="flex-shrink-0 mt-1">
        {isUnread ? (
          <span className="block w-2.5 h-2.5 rounded-full bg-primary" aria-label="غير مقروء" />
        ) : (
          <span className="block w-2.5 h-2.5 rounded-full bg-muted" aria-label="مقروء" />
        )}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${isUnread ? 'text-foreground' : 'text-muted-foreground'}`}>
          {title}
        </p>
        {body && (
          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{body}</p>
        )}
        <p className="text-xs text-muted-foreground mt-1">{formatTimestamp(notification.created_at)}</p>
      </div>

      {/* Mark as read */}
      {isUnread && (
        <button
          onClick={() => onMarkRead(notification.id)}
          disabled={isMarking}
          className="flex-shrink-0 text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="تحديد كمقروء"
        >
          {isMarking ? '...' : 'تحديد كمقروء'}
        </button>
      )}
    </div>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [unreadOnly, setUnreadOnly] = useState(false)
  const [markingId, setMarkingId] = useState<string | null>(null)
  const [markingAll, setMarkingAll] = useState(false)
  const [markAllError, setMarkAllError] = useState<string | null>(null)

  const fetchNotifications = useCallback(() => {
    setLoading(true)
    setError(null)
    listNotifications({
      page,
      unread_only: unreadOnly || undefined,
      per_page: 25,
    })
      .then((res) => {
        setNotifications(res.data)
        setLastPage(res.meta.last_page)
        setTotal(res.meta.total)
      })
      .catch((err: unknown) =>
        setError(extractNotificationMessage(err, 'فشل تحميل الإشعارات'))
      )
      .finally(() => setLoading(false))
  }, [page, unreadOnly])

  useEffect(() => {
    fetchNotifications()
  }, [fetchNotifications])

  const handleMarkRead = useCallback(
    (id: string) => {
      setMarkingId(id)
      markNotificationAsRead(id)
        .then(() => {
          setNotifications((prev) =>
            prev.map((n) =>
              n.id === id ? { ...n, read_at: new Date().toISOString() } : n
            )
          )
        })
        .catch((err: unknown) => {
          setError(extractNotificationMessage(err, 'فشل تحديد الإشعار كمقروء'))
        })
        .finally(() => setMarkingId(null))
    },
    []
  )

  const handleMarkAllRead = useCallback(() => {
    setMarkingAll(true)
    setMarkAllError(null)
    markAllNotificationsAsRead()
      .then(() => {
        const now = new Date().toISOString()
        setNotifications((prev) =>
          prev.map((n) => (n.read_at === null ? { ...n, read_at: now } : n))
        )
      })
      .catch((err: unknown) => {
        setMarkAllError(extractNotificationMessage(err, 'فشل تحديد جميع الإشعارات كمقروءة'))
      })
      .finally(() => setMarkingAll(false))
  }, [])

  const unreadCount = notifications.filter((n) => n.read_at === null).length

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">الإشعارات</h1>
          <p className="text-muted-foreground text-sm mt-1">
            إشعارات النظام الخاصة بك — {total} إشعار
          </p>
        </div>

        {/* Mark all as read */}
        {unreadCount > 0 && (
          <Button
            onClick={handleMarkAllRead}
            disabled={markingAll}
            variant="outline"
            size="sm"
          >
            {markingAll ? 'جارٍ التحديث...' : `تحديد الكل كمقروء (${unreadCount})`}
          </Button>
        )}
      </div>

      {/* Mark all error */}
      {markAllError && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-lg px-4 py-3 text-sm text-destructive">
          {markAllError}
        </div>
      )}

      {/* Filter */}
      <div className="flex items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer select-none">
          <input
            type="checkbox"
            checked={unreadOnly}
            onChange={(e) => {
              setUnreadOnly(e.target.checked)
              setPage(1)
            }}
            className="rounded border-border"
          />
          عرض غير المقروءة فقط
        </label>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Error */}
      {!loading && error && (
        <ErrorDisplay
          message={error}
          onRetry={fetchNotifications}
        />
      )}

      {/* Empty */}
      {!loading && !error && notifications.length === 0 && (
        <EmptyState
          message={
            unreadOnly
              ? 'لا توجد إشعارات غير مقروءة'
              : 'لا توجد إشعارات بعد'
          }
        />
      )}

      {/* Notifications list */}
      {!loading && !error && notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((notification) => (
            <NotificationItem
              key={notification.id}
              notification={notification}
              onMarkRead={handleMarkRead}
              markingId={markingId}
            />
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && !error && lastPage > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            السابق
          </Button>
          <span className="text-sm text-muted-foreground">
            صفحة {page} من {lastPage}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
            disabled={page >= lastPage}
          >
            التالي
          </Button>
        </div>
      )}
    </div>
  )
}
