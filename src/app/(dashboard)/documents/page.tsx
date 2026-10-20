'use client'

/**
 * G-02 — /documents — Document Management (CAP-130 / TASK-002C / TASK-002D)
 *
 * TASK-002C (Metadata Layer) — CLOSED 2026-10-06
 * TASK-002D (Storage Integration) — CLOSED 2026-10-09
 *
 * Integrates with:
 *   GET    /api/v1/documents              — list documents
 *   POST   /api/v1/documents              — create document
 *   GET    /api/v1/documents/{id}         — get document
 *   GET    /api/v1/documents/{id}/download — download file
 *   GET    /api/v1/document-categories    — list categories
 *
 * Backend authority: all validation, authorization, tenant isolation,
 * and file storage enforced by Laravel 12 REST API.
 */

import { useEffect, useState, useCallback } from 'react'
import { apiClient } from '@/lib/api/client'
import { LoadingSpinner } from '@/components/ui/loading'
import { ErrorDisplay, EmptyState } from '@/components/ui/error'
import { Button } from '@/components/ui/button'

// ─── Types ────────────────────────────────────────────────────────────────────

interface DocumentCategory {
  id: number | string
  name: string
  slug?: string
}

interface Document {
  id: number | string
  title: string
  description?: string | null
  category_id?: number | string | null
  category?: DocumentCategory | null
  file_name?: string | null
  file_size?: number | null
  mime_type?: string | null
  created_at: string
  updated_at?: string
  [key: string]: unknown
}

interface PaginatedDocuments {
  data: Document[]
  meta: {
    current_page: number
    last_page: number
    per_page: number
    total: number
  }
}

interface CreateDocumentPayload {
  title: string
  description?: string
  category_id?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function extractMessage(error: unknown, fallback: string): string {
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

function formatDate(d: string): string {
  return new Date(d).toLocaleDateString('ar-SA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  })
}

function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const INITIAL_FORM: CreateDocumentPayload = {
  title: '',
  description: '',
  category_id: '',
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const [documents, setDocuments] = useState<Document[]>([])
  const [categories, setCategories] = useState<DocumentCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [page, setPage] = useState(1)
  const [lastPage, setLastPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [categoryFilter, setCategoryFilter] = useState('')

  // Create form
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<CreateDocumentPayload>(INITIAL_FORM)
  const [formError, setFormError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // Download
  const [downloadingId, setDownloadingId] = useState<string | number | null>(null)

  const fetchDocuments = useCallback(() => {
    setLoading(true)
    setError(null)
    const params: Record<string, string | number> = { page }
    if (categoryFilter) params['category_id'] = categoryFilter
    apiClient
      .get<PaginatedDocuments | Document[]>('/v1/documents', { params })
      .then((res) => {
        // Handle both paginated {data, meta} and plain array responses
        const raw = res.data
        if (Array.isArray(raw)) {
          setDocuments(raw as Document[])
          setLastPage(1)
          setTotal((raw as Document[]).length)
        } else {
          const paginated = raw as PaginatedDocuments
          setDocuments(paginated.data ?? [])
          setLastPage(paginated.meta?.last_page ?? 1)
          setTotal(paginated.meta?.total ?? 0)
        }
      })
      .catch((err: unknown) => setError(extractMessage(err, 'فشل تحميل قائمة الوثائق')))
      .finally(() => setLoading(false))
  }, [page, categoryFilter])

  useEffect(() => {
    fetchDocuments()
  }, [fetchDocuments])

  useEffect(() => {
    apiClient
      .get<{ data: DocumentCategory[] }>('/v1/document-categories')
      .then((res) => setCategories(res.data.data ?? []))
      .catch(() => {/* non-critical */})
  }, [])

  function handleFormChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setFormError(null)
    setSuccessMsg(null)

    if (!form.title.trim()) {
      setFormError('عنوان الوثيقة مطلوب')
      return
    }

    setSubmitting(true)
    try {
      await apiClient.post('/v1/documents', {
        title: form.title.trim(),
        description: form.description?.trim() || undefined,
        category_id: form.category_id || undefined,
      })
      setSuccessMsg('تم إنشاء الوثيقة بنجاح')
      setForm(INITIAL_FORM)
      setShowForm(false)
      fetchDocuments()
    } catch (err: unknown) {
      setFormError(extractMessage(err, 'فشل إنشاء الوثيقة'))
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDownload(doc: Document) {
    setDownloadingId(doc.id)
    try {
      const res = await apiClient.get(`/v1/documents/${doc.id}/download`, {
        responseType: 'blob',
      })
      const url = window.URL.createObjectURL(new Blob([res.data as BlobPart]))
      const link = document.createElement('a')
      link.href = url
      link.setAttribute('download', doc.file_name ?? `document-${doc.id}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
    } catch (err: unknown) {
      alert(extractMessage(err, 'فشل تنزيل الملف'))
    } finally {
      setDownloadingId(null)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-foreground">إدارة الوثائق</h1>
          <p className="text-muted-foreground text-sm mt-1">
            رفع وإدارة وثائق المشاريع والعمليات
          </p>
        </div>
        <Button
          onClick={() => {
            setShowForm((v) => !v)
            setFormError(null)
            setSuccessMsg(null)
          }}
        >
          {showForm ? 'إلغاء' : '+ وثيقة جديدة'}
        </Button>
      </div>

      {/* Success */}
      {successMsg && (
        <div className="p-3 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
          {successMsg}
        </div>
      )}

      {/* Create Form */}
      {showForm && (
        <div className="bg-card border border-border rounded-lg p-5 space-y-4">
          <h2 className="text-base font-semibold text-foreground">إضافة وثيقة جديدة</h2>
          {formError && <ErrorDisplay message={formError} />}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Title */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">
                  عنوان الوثيقة <span className="text-destructive">*</span>
                </label>
                <input
                  name="title"
                  value={form.title}
                  onChange={handleFormChange}
                  placeholder="أدخل عنوان الوثيقة"
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>

              {/* Category */}
              <div className="space-y-1">
                <label className="text-sm font-medium text-foreground">التصنيف</label>
                <select
                  name="category_id"
                  value={form.category_id}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary/30"
                >
                  <option value="">— بدون تصنيف —</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={String(cat.id)}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1">
              <label className="text-sm font-medium text-foreground">الوصف</label>
              <textarea
                name="description"
                value={form.description}
                onChange={handleFormChange}
                rows={2}
                placeholder="وصف اختياري للوثيقة"
                className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 resize-none"
              />
            </div>

            <div className="flex gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? 'جارٍ الحفظ...' : 'حفظ الوثيقة'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setShowForm(false)
                  setFormError(null)
                }}
              >
                إلغاء
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* Filters */}
      {categories.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <span className="text-sm text-muted-foreground">تصفية:</span>
          <button
            onClick={() => { setCategoryFilter(''); setPage(1) }}
            className={`px-3 py-1 text-xs rounded-full border transition-colors ${
              !categoryFilter
                ? 'bg-primary text-primary-foreground border-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            الكل
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              onClick={() => { setCategoryFilter(String(cat.id)); setPage(1) }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors ${
                categoryFilter === String(cat.id)
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingSpinner message="جارٍ تحميل الوثائق..." />
      ) : error ? (
        <ErrorDisplay message={error} onRetry={fetchDocuments} />
      ) : documents.length === 0 ? (
        <EmptyState message="لا توجد وثائق مسجلة. أضف وثيقة جديدة للبدء." />
      ) : (
        <div className="space-y-4">
          {/* Count */}
          <p className="text-sm text-muted-foreground">
            {total} وثيقة
          </p>

          {/* Documents list */}
          <div className="space-y-2">
            {documents.map((doc) => (
              <div
                key={doc.id}
                className="bg-card border border-border rounded-lg p-4 flex items-start justify-between gap-4"
              >
                <div className="flex items-start gap-3 min-w-0">
                  <span className="text-2xl flex-shrink-0">
                    {doc.mime_type?.startsWith('image/') ? '🖼️' :
                     doc.mime_type === 'application/pdf' ? '📄' :
                     doc.file_name ? '📎' : '📝'}
                  </span>
                  <div className="min-w-0">
                    <p className="font-medium text-foreground text-sm truncate">{doc.title}</p>
                    {doc.description && (
                      <p className="text-xs text-muted-foreground mt-0.5 line-clamp-1">
                        {doc.description}
                      </p>
                    )}
                    <div className="flex items-center gap-3 mt-1 flex-wrap">
                      {doc.category && (
                        <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full">
                          {doc.category.name}
                        </span>
                      )}
                      {doc.file_name && (
                        <span className="text-xs text-muted-foreground">{doc.file_name}</span>
                      )}
                      {doc.file_size && (
                        <span className="text-xs text-muted-foreground">
                          {formatFileSize(doc.file_size)}
                        </span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(doc.created_at)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Download */}
                {doc.file_name && (
                  <button
                    onClick={() => handleDownload(doc)}
                    disabled={downloadingId === doc.id}
                    className="flex-shrink-0 text-xs text-primary hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingId === doc.id ? '...' : '⬇️ تنزيل'}
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Pagination */}
          {lastPage > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                ← السابق
              </button>
              <span className="text-sm text-muted-foreground">
                {page} / {lastPage}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={page === lastPage}
                className="px-3 py-1.5 text-sm border border-border rounded-md hover:bg-accent disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                التالي →
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
