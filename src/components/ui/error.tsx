interface ErrorDisplayProps {
  message: string
  onRetry?: () => void
}

export function ErrorDisplay({ message, onRetry }: ErrorDisplayProps) {
  return (
    <div className="p-4 bg-destructive/10 border border-destructive/20 rounded-md space-y-2">
      <p className="text-sm text-destructive font-medium">حدث خطأ</p>
      <p className="text-sm text-destructive/80">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm text-primary hover:underline"
        >
          إعادة المحاولة
        </button>
      )}
    </div>
  )
}

export function EmptyState({ message = 'لا توجد بيانات' }: { message?: string }) {
  return (
    <div className="flex flex-col items-center justify-center h-48 gap-2">
      <p className="text-muted-foreground text-sm">{message}</p>
    </div>
  )
}
