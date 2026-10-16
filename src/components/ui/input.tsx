/**
 * Input — P0 Design Baseline
 *
 * Thin wrapper around <input> that applies the .form-input utility class
 * from globals.css. Avoids repeating the same long className string
 * across every form in the application.
 *
 * Usage:
 *   <Input name="name" placeholder="الاسم" value={...} onChange={...} />
 *   <Input as="textarea" name="notes" rows={3} />
 */

import * as React from 'react'
import { cn } from '@/lib/utils'

// ── Input ──────────────────────────────────────────────────────────────────

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  className?: string
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, ...props }, ref) => (
    <input
      ref={ref}
      className={cn('form-input', className)}
      {...props}
    />
  )
)
Input.displayName = 'Input'

// ── Textarea ───────────────────────────────────────────────────────────────

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  className?: string
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => (
    <textarea
      ref={ref}
      className={cn('form-input resize-none', className)}
      {...props}
    />
  )
)
Textarea.displayName = 'Textarea'
