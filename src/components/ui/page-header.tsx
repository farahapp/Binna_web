/**
 * PageHeader — P0 Design Baseline
 *
 * Standard page header pattern used across all 49 pages.
 * Extracts the repeated header structure into a single component.
 *
 * Usage:
 *   <PageHeader title="المشاريع" description="قائمة جميع المشاريع">
 *     <Button>إضافة مشروع</Button>
 *   </PageHeader>
 */

import React from 'react'

interface PageHeaderProps {
  title: string
  description?: string
  children?: React.ReactNode
}

export function PageHeader({ title, description, children }: PageHeaderProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-foreground">{title}</h1>
        {description && (
          <p className="text-muted-foreground text-sm mt-1">{description}</p>
        )}
      </div>
      {children && (
        <div className="flex items-center gap-2 flex-shrink-0">
          {children}
        </div>
      )}
    </div>
  )
}
