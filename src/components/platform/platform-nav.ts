export type PlatformNavItem = {
  href: string
  label: string
  /** Laravel permission required to show the link. Null = always visible for authenticated operators. */
  permission: string | null
  section: 'operations' | 'entities' | 'iam' | 'account'
  /** Exact path match only (do not treat children as active). */
  exact?: boolean
}

export const PLATFORM_NAV_ITEMS: PlatformNavItem[] = [
  {
    href: '/platform',
    label: 'لوحة المنصة',
    permission: null,
    section: 'operations',
    exact: true,
  },
  {
    href: '/platform/tenants/contractors',
    label: 'المقاولون',
    permission: 'platform.tenants.view',
    section: 'entities',
  },
  {
    href: '/platform/tenants/consultants',
    label: 'الاستشاريون',
    permission: 'platform.tenants.view',
    section: 'entities',
  },
  {
    href: '/platform/tenants/owners',
    label: 'الملاك',
    permission: 'platform.tenants.view',
    section: 'entities',
  },
  {
    href: '/platform/tenants',
    label: 'جميع الجهات',
    permission: 'platform.tenants.view',
    section: 'entities',
    exact: true,
  },
  {
    href: '/platform/registration-requests',
    label: 'طلبات التسجيل',
    permission: 'platform.tenant_registrations.view',
    section: 'operations',
  },
  {
    href: '/platform/registration-representatives',
    label: 'المندوبون',
    permission: 'platform.registration_representatives.view',
    section: 'operations',
  },
  {
    href: '/platform/users',
    label: 'مستخدمو المنصة',
    permission: 'platform.users.view',
    section: 'iam',
  },
  {
    href: '/platform/roles',
    label: 'الأدوار',
    permission: 'platform.roles.view',
    section: 'iam',
  },
  {
    href: '/platform/permissions',
    label: 'الصلاحيات',
    permission: 'platform.permissions.view',
    section: 'iam',
  },
  {
    href: '/platform/audit',
    label: 'سجل التدقيق',
    permission: 'platform.audit.view',
    section: 'operations',
  },
  {
    href: '/integrations/whatsapp',
    label: '💬 إدارة WhatsApp',
    permission: 'platform.integrations.whatsapp.view',
    section: 'operations',
  },
  {
    href: '/platform/change-password',
    label: 'تغيير كلمة المرور',
    permission: null,
    section: 'account',
  },
]

export const PLATFORM_NAV_SECTIONS: Array<{ id: PlatformNavItem['section']; label: string }> = [
  { id: 'operations', label: 'التشغيل' },
  { id: 'entities', label: 'دليل الجهات' },
  { id: 'iam', label: 'هوية المنصة' },
  { id: 'account', label: 'الحساب' },
]

export function isPlatformNavActive(pathname: string, href: string, item?: PlatformNavItem): boolean {
  if (href === '/platform' || item?.exact) {
    return pathname === href
  }
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function filterPlatformNav(
  permissions: string[] | undefined,
): PlatformNavItem[] {
  const granted = new Set(permissions ?? [])
  return PLATFORM_NAV_ITEMS.filter((navItem) => navItem.permission === null || granted.has(navItem.permission))
}
