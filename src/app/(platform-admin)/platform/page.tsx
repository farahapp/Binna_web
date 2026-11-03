'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

/**
 * /platform → redirect to /platform/tenants (the main platform admin page).
 */
export default function PlatformRootPage() {
  const router = useRouter()
  useEffect(() => {
    router.replace('/platform/tenants')
  }, [router])
  return null
}
