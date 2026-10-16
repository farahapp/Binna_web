'use client'

import { useEffect, useState } from 'react'
import { listPostingRules, createPostingRule, extractApiError } from '@/lib/api/accounting'
import type { PostingRule, CreatePostingRulePayload, PaginationMeta } from '@/lib/api/accounting'

const TENANT_SLUG = process.env.NEXT_PUBLIC_TENANT_SLUG ?? ''

export default function PostingRulesPage() {
  // List
  const [rules, setRules] = useState<PostingRule[]>([])
  const [listMeta, setListMeta] = useState<PaginationMeta | null>(null)
  const [listPage, setListPage] = useState(1)
  const [listLoading, setListLoading] = useState(true)
  const [listError, setListError] = useState<string | null>(null)

  async function loadList(page: number) {
    setListLoading(true)
    setListError(null)
    try {
      const res = await listPostingRules(page)
      setRules(res.data)
      setListMeta(res.meta)
    } catch (err) {
      setListError(extractApiError(err, 'حدث خطأ أثناء تحميل قواعد الترحيل'))
    } finally {
      setListLoading(false)
    }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadList(listPage) }, [listPage])

  const [form, setForm] = useState<Omit<CreatePostingRulePayload, 'tenant_slug'>>({
    trigger_event: '',
    rule_name: '',
    debit_account_id: '',
    credit_account_id: '',
    amount_source: '',
    description: '',
  })

  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdRule, setCreatedRule] = useState<PostingRule | null>(null)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setCreatedRule(null)

    if (!form.trigger_event.trim()) {
      setError('حدث التشغيل مطلوب')
      return
    }
    if (!form.rule_name.trim()) {
      setError('اسم القاعدة مطلوب')
      return
    }

    setSubmitting(true)
    try {
      const payload: CreatePostingRulePayload = {
        tenant_slug: TENANT_SLUG,
        trigger_event: form.trigger_event.trim(),
        rule_name: form.rule_name.trim(),
        debit_account_id: form.debit_account_id?.trim() || null,
        credit_account_id: form.credit_account_id?.trim() || null,
        amount_source: form.amount_source?.trim() || null,
        description: form.description?.trim() || null,
      }

      const rule = await createPostingRule(payload)
      setCreatedRule(rule)

      // Reset form
      setForm({
        trigger_event: '',
        rule_name: '',
        debit_account_id: '',
        credit_account_id: '',
        amount_source: '',
        description: '',
      })
    } catch (err) {
      setError(extractApiError(err, 'حدث خطأ أثناء إنشاء قاعدة الترحيل'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground">قواعد الترحيل</h1>
        <p className="text-muted-foreground text-sm mt-1">
          تعريف قواعد الترحيل التلقائي للأحداث المحاسبية
        </p>
      </div>

      {/* Rules List */}
      <div className="bg-card border border-border rounded-lg overflow-hidden">
        <div className="p-4 border-b border-border flex items-center justify-between">
          <h2 className="text-base font-semibold text-foreground">قائمة قواعد الترحيل</h2>
          <button
            onClick={() => loadList(listPage)}
            disabled={listLoading}
            className="text-sm text-primary hover:underline disabled:opacity-50"
          >
            {listLoading ? 'جارٍ التحميل...' : '🔄 تحديث'}
          </button>
        </div>

        {listLoading && (
          <div className="p-8 text-center text-muted-foreground text-sm">جارٍ تحميل القواعد...</div>
        )}
        {!listLoading && listError && (
          <div className="p-4 text-sm text-destructive bg-destructive/5">{listError}</div>
        )}
        {!listLoading && !listError && rules.length === 0 && (
          <div className="p-8 text-center">
            <p className="text-muted-foreground text-sm">لا توجد قواعد ترحيل بعد</p>
          </div>
        )}
        {!listLoading && !listError && rules.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">اسم القاعدة</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">حدث التشغيل</th>
                  <th className="px-4 py-2.5 text-right font-medium text-muted-foreground">مصدر المبلغ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-muted/20">
                    <td className="px-4 py-2.5 font-medium text-foreground">{rule.rule_name}</td>
                    <td className="px-4 py-2.5 font-mono text-xs text-foreground" dir="ltr">{rule.trigger_event}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{rule.amount_source ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {listMeta && listMeta.last_page > 1 && (
          <div className="p-4 border-t border-border flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              صفحة {listMeta.current_page} من {listMeta.last_page} ({listMeta.total} قاعدة)
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setListPage((p) => Math.max(1, p - 1))}
                disabled={listMeta.current_page <= 1}
                className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-50"
              >
                السابق
              </button>
              <button
                onClick={() => setListPage((p) => Math.min(listMeta.last_page, p + 1))}
                disabled={listMeta.current_page >= listMeta.last_page}
                className="px-3 py-1 rounded border border-input hover:bg-accent disabled:opacity-50"
              >
                التالي
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Create Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {error && (
          <div className="rounded-md bg-destructive/10 border border-destructive/20 p-3 text-sm text-destructive">
            {error}
          </div>
        )}

        {createdRule && (
          <div className="rounded-md bg-green-50 border border-green-200 p-4 space-y-2">
            <p className="text-sm text-green-800 font-medium">✅ تم إنشاء قاعدة الترحيل بنجاح</p>
            <p className="text-xs text-green-700 font-mono" dir="ltr">{createdRule.id}</p>
            <p className="text-sm text-green-700">{createdRule.rule_name}</p>
          </div>
        )}

        <div className="bg-card border border-border rounded-lg p-6 space-y-4">
          <h2 className="text-base font-semibold text-foreground">بيانات القاعدة</h2>

          {/* Trigger Event */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              حدث التشغيل <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="trigger_event"
              value={form.trigger_event}
              onChange={handleChange}
              placeholder="مثال: invoice.issued أو payment.recorded"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
              required
            />
            <p className="text-xs text-muted-foreground mt-1">الحدث الذي يُشغّل هذه القاعدة تلقائياً</p>
          </div>

          {/* Rule Name */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              اسم القاعدة <span className="text-destructive">*</span>
            </label>
            <input
              type="text"
              name="rule_name"
              value={form.rule_name}
              onChange={handleChange}
              placeholder="مثال: ترحيل إيرادات الفاتورة"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              required
            />
          </div>

          {/* Debit Account */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              حساب المدين (UUID، اختياري)
            </label>
            <input
              type="text"
              name="debit_account_id"
              value={form.debit_account_id ?? ''}
              onChange={handleChange}
              placeholder="UUID الحساب المدين"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>

          {/* Credit Account */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              حساب الدائن (UUID، اختياري)
            </label>
            <input
              type="text"
              name="credit_account_id"
              value={form.credit_account_id ?? ''}
              onChange={handleChange}
              placeholder="UUID الحساب الدائن"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>

          {/* Amount Source */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              مصدر المبلغ (اختياري)
            </label>
            <input
              type="text"
              name="amount_source"
              value={form.amount_source ?? ''}
              onChange={handleChange}
              placeholder="مثال: total_amount أو net_amount"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              dir="ltr"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">
              الوصف (اختياري)
            </label>
            <textarea
              name="description"
              value={form.description ?? ''}
              onChange={handleChange}
              rows={3}
              placeholder="وصف تفصيلي للقاعدة ومتى تُطبَّق"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={() =>
              setForm({
                trigger_event: '',
                rule_name: '',
                debit_account_id: '',
                credit_account_id: '',
                amount_source: '',
                description: '',
              })
            }
            className="inline-flex items-center justify-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
          >
            مسح
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center justify-center rounded-md bg-primary text-primary-foreground px-4 py-2 text-sm font-medium hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'جارٍ الحفظ...' : 'إنشاء القاعدة'}
          </button>
        </div>
      </form>
    </div>
  )
}
