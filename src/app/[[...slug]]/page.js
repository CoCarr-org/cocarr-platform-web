'use client'
import React from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import { useEffect } from 'react'
import Loader from '../_components/Loader'
import { RouteParamsProvider } from '../_helpers/RouteParamsContext'

// Import pages statically for static export
import LoginPage from '../_pages/login/page'
import ForgotPasswordPage from '../_pages/forgot-password/page'
import SetPasswordPage from '../_pages/set-password/page'
import DashboardPage from '../_pages/dashboard/page'
import DashboardLayout from '../_pages/dashboard/layout'
import RidesPage from '../_pages/dashboard/rides/page'
import VehiclesPage from '../_pages/dashboard/vehicles/page'
import AvailabilitySchedulePage from '../_pages/dashboard/availability-schedule/page'
import PaymentsPage from '../_pages/dashboard/payments/page'
import DuesPage from '../_pages/dashboard/dues/page'
import HostsPage from '../_pages/dashboard/hosts/page'
import OffersPage from '../_pages/dashboard/offers/page'
import UsersPage from '../_pages/dashboard/users/page'
import WalletPage from '../_pages/dashboard/wallet/page'
import MembershipPage from '../_pages/dashboard/membership/page'
import SettingsPreferencesPage from '../_pages/dashboard/settings/preferences/page'
import SettingsProtectionPlanPage from '../_pages/dashboard/settings/protection-plan/page'
import SettingsMembershipTypesPage from '../_pages/dashboard/settings/membership-types/page'
import SettingsCitiesPage from '../_pages/dashboard/settings/cities/page'
import SettingsBrandsPage from '../_pages/dashboard/settings/brands/page'
import SettingsPickupPointsPage from '../_pages/dashboard/settings/pickup-points/page'
import SupportPage from '../_pages/dashboard/support/page'
import ReportsPage from '../_pages/dashboard/reports/page'
import SystemHealthPage from '../_pages/dashboard/system-health/page'
// Admin Accounts and the permission editor are NOT imported here — see below.
import SettingsBusinessPage from '../_pages/dashboard/settings-business/page'
import SettingsPaymentsPage from '../_pages/dashboard/settings-payments/page'
import GeneralSettingsPage from '../_pages/dashboard/general-settings/page'
import SecuritySettingsPage from '../_pages/dashboard/security-settings/page'
import IntegrationsPage from '../_pages/dashboard/integrations/page'
import AuditPage from '../_pages/dashboard/audit/page'
import LiveActivityPage from '../_pages/dashboard/live-activity/page'
import UsersActivityPage from '../_pages/dashboard/users-activity/page'
import SystemAlertsPage from '../_pages/dashboard/system-alerts/page'
import OperationsTripsPage from '../_pages/dashboard/operations-trips/page'
import AdminActivityPage from '../_pages/dashboard/admin-activity/page'
import CustomerReportPage from '../_pages/dashboard/reports-customer/page'
import RefundRequestsPage from '../_pages/dashboard/finance-refund-requests/page'
import UsersVerificationPage from '../_pages/dashboard/users-verification/page'
import SettlementsPage from '../_pages/dashboard/finance-settlements/page'
import PoliciesPage from '../_pages/dashboard/policies/page'
import DamageClaimsPage from '../_pages/dashboard/operations-damages/page'
import UserDocumentsPage from '../_pages/dashboard/users-documents/page'
import VehicleRcPage from '../_pages/dashboard/vehicles-rc/page'
import HostBankAccountsPage from '../_pages/dashboard/finance-bank-accounts/page'
import WalletTransactionsPage from '../_pages/dashboard/finance-wallet-transactions/page'
import DriverReportPage from '../_pages/dashboard/reports-driver/page'
import CustomReportPage from '../_pages/dashboard/reports-custom/page'
import CampaignsPage from '../_pages/dashboard/marketing-campaigns/page'
import ReferralAnalyticsPage from '../_pages/dashboard/referral-analytics/page'
import ReferralCampaignsPage from '../_pages/dashboard/referral-campaigns/page'
import ReferralModerationPage from '../_pages/dashboard/referral-moderation/page'
import OperationalReportPage from '../_pages/dashboard/reports-operational/page'
import ExportCentrePage from '../_pages/dashboard/reports-exports/page'
import BackgroundJobsPage from '../_pages/dashboard/background-jobs/page'
import PushCampaignsPage from '../_pages/dashboard/push-campaigns/page'
import SettingsTaxPage from '../_pages/dashboard/settings-tax/page'
import SettingsMapsPage from '../_pages/dashboard/settings-maps/page'
import ResourceManager from '../_components/ResourceManager'
import Header from '../_components/Header'
import NotBuiltPage from '../_components/NotBuiltPage'
import { NAV_ROUTES, findRoute } from '../_helpers/navConfig'
import { useCanOpenRoute } from '../_helpers/permissions'
import NoAccess from '../_components/NoAccess'

// Dynamic route imports
import RideDetailPage from '../_pages/dashboard/rides/[id]/page'
import RideDetailLayout from '../_pages/dashboard/rides/[id]/layout'
import RidePaymentPage from '../_pages/dashboard/rides/[id]/payment/page'
import RideDuePage from '../_pages/dashboard/rides/[id]/due/page'
import RideStartPage from '../_pages/dashboard/rides/[id]/start-ride/page'
import RideEndPage from '../_pages/dashboard/rides/[id]/end-ride/page'

import VehicleDetailPage from '../_pages/dashboard/vehicles/[id]/page'
import VehicleDetailLayout from '../_pages/dashboard/vehicles/[id]/layout'
import VehicleReviewsPage from '../_pages/dashboard/vehicles/[id]/reviews/page'
import VehicleRidesPage from '../_pages/dashboard/vehicles/[id]/rides/page'

import HostDetailPage from '../_pages/dashboard/hosts/[id]/page'
import HostDetailLayout from '../_pages/dashboard/hosts/[id]/layout'
import HostPaymentPage from '../_pages/dashboard/hosts/[id]/payment/page'
import HostVehiclesPage from '../_pages/dashboard/hosts/[id]/vehicles/page'
import HostRidesPage from '../_pages/dashboard/hosts/[id]/rides/page'

import UserDetailPage from '../_pages/dashboard/users/[id]/page'
import UserManagementPage from '../_pages/dashboard/user-management/page'
import UserReferralsPage from '../_pages/dashboard/users-referrals/page'

import AvailabilityDetailPage from '../_pages/dashboard/availability-schedule/[id]/page'
import AvailabilityReviewsPage from '../_pages/dashboard/availability-schedule/[id]/reviews/page'
import AvailabilityRidesPage from '../_pages/dashboard/availability-schedule/[id]/rides/page'

export default function SPAHandler() {
  const pathname = usePathname()
  const router = useRouter()
  const authInfo = useSelector(state => state.auth)
  
  // Handle root redirect
  useEffect(() => {
    if (pathname === '/' || pathname === '' || !pathname) {
      if (authInfo.isLoggedIn) {
        router.replace('/dashboard/')
      } else {
        router.replace('/login/')
      }
    }
  }, [pathname, authInfo.isLoggedIn, router])

  // Show loading while redirecting
  if (!pathname || pathname === '/' || pathname === '') {
    return <Loader />
  }

  // Handle login page
  if (pathname === '/login' || pathname === '/login/') {
    return (
      <RouteParamsProvider>
        <LoginPage />
      </RouteParamsProvider>
    )
  }

  // Public password-recovery pages (no auth). Forgot-password requests the
  // email; set-password handles the oobCode link from that email / the boot
  // flow's first-time link.
  if (pathname === '/forgot-password' || pathname === '/forgot-password/') {
    return (
      <RouteParamsProvider>
        <ForgotPasswordPage />
      </RouteParamsProvider>
    )
  }

  if (pathname === '/set-password' || pathname === '/set-password/') {
    return (
      <RouteParamsProvider>
        <SetPasswordPage />
      </RouteParamsProvider>
    )
  }

  // Protect dashboard routes
  const isDashboardRoute = pathname && pathname.startsWith('/dashboard')
  
  if (isDashboardRoute && !authInfo.isLoggedIn) {
    return <LoginPage />
  }

  // Render appropriate dashboard route
  if (isDashboardRoute && authInfo.isLoggedIn) {
    return (
      <RouteParamsProvider>
        <DashboardRouter pathname={pathname} />
      </RouteParamsProvider>
    )
  }

  return (
    <div className="flex items-center justify-center h-screen">
      <div>404 - Page Not Found</div>
    </div>
  )
}


// Maps navConfig's `page` key -> component. Only wired operations are listed;
// every removed placeholder was deleted with its nav entry.
// ── Root-only pages: present in the root build, absent from every other ──
//
// `process.env.NEXT_PUBLIC_PANEL` is inlined by Next at build time, so this
// comparison folds to a literal. On a non-root build webpack sees `if (false)`,
// drops the branch, and never follows the `require` — so the Admin Accounts and
// permission-editor screens, and everything they import, are not in that bundle
// at all.
//
// It has to be a statically analysable `if` around a bare `require`. A dynamic
// `import()` would emit a lazy chunk that is still served from
// admin.cocarr.com, which is deferred rather than removed, and an `await`ed
// import cannot be resolved during render anyway.
//
// The `console` alias is included because a build still carrying the old panel
// name is a root build; dropping these pages from it would silently break the
// super-admin site.
// The comparison MUST be written inline, here, in the `if` itself.
//
// Webpack collects `require()` dependencies while PARSING, and only skips a
// branch whose condition it can evaluate at that moment. DefinePlugin has
// already substituted a string literal for `process.env.NEXT_PUBLIC_PANEL`, so
// `"admin" === "root"` folds and the branch is dropped along with everything it
// requires.
//
// Hoisting this to `const IS_ROOT_PANEL = …` and testing that instead does NOT
// work — webpack does not propagate the constant that far, so it parses the
// require and pulls the module in regardless. Terser folds the dead branch
// afterwards, which removes the *call* but not the module: the build succeeds,
// the branch is unreachable, and the screens ship anyway. Verified by grepping
// both bundles for a string unique to these pages; the hoisted version had it
// in the admin bundle.
let SettingsAdminAccountsPage = null
let TeamsAccessPage = null
let SettingsRolesPage = null
if (process.env.NEXT_PUBLIC_PANEL === 'root' || process.env.NEXT_PUBLIC_PANEL === 'console') {
  // eslint-disable-next-line global-require
  const rootOnly = require('../_pages/rootOnly')
  SettingsAdminAccountsPage = rootOnly.SettingsAdminAccountsPage
  TeamsAccessPage = rootOnly.TeamsAccessPage
  SettingsRolesPage = rootOnly.SettingsRolesPage
}

// A null here is never rendered: `useCanOpenRoute` consults `panelHasModule` and
// returns NoAccess for these routes on a lower panel BEFORE any route lookup
// happens. This guard exists so that a future gap in that gate surfaces as a
// clear message rather than as `<null />` rendering an empty page.
// Shown only if something ever reaches a root-only route on a lower panel. It
// should be unreachable — the gate above returns NoAccess first — so it says
// where the screen lives rather than pretending to be a permission denial,
// which would send someone to ask for access they already have.
const RootOnlyElsewhere = () => (
  <div className='p-8'>
    <p className='font-semibold text-sm mb-1'>This screen is on the Root panel</p>
    <p className='text-[13px] text-[#757575] max-w-md'>
      Admin accounts and permissions are managed from root.cocarr.com. They are not
      part of this panel.
    </p>
  </div>
)

const rootOnlyRoute = (Component) => Component || RootOnlyElsewhere

const PAGE_COMPONENTS = {
  // Dashboard
  DashboardOverview: DashboardPage,
  LiveActivity: LiveActivityPage,
  SystemAlerts: SystemAlertsPage,
  // User management
  UserManagement: UserManagementPage,
  Users: UsersPage,
  UsersVerification: UsersVerificationPage,
  UserDocuments: UserDocumentsPage,
  UserReferrals: UserReferralsPage,
  Wallet: WalletPage,
  // Hosts
  Hosts: HostsPage,
  HostBankAccounts: HostBankAccountsPage,
  // Vehicles
  Vehicles: VehiclesPage,
  VehicleRc: VehicleRcPage,
  AvailabilitySchedule: AvailabilitySchedulePage,
  // Bookings
  Rides: RidesPage,
  Trips: OperationsTripsPage,
  DamageClaims: DamageClaimsPage,
  // Finance
  UserDocuments: UserDocumentsPage,
  VehicleRc: VehicleRcPage,
  HostBankAccounts: HostBankAccountsPage,
  WalletTransactions: WalletTransactionsPage,
  DriverReport: DriverReportPage,
  CustomReport: CustomReportPage,
  Campaigns: CampaignsPage,
  OperationalReport: OperationalReportPage,
  ExportCentre: ExportCentrePage,
  BackgroundJobs: BackgroundJobsPage,
  PushCampaigns: PushCampaignsPage,
  SettingsTax: SettingsTaxPage,
  SettingsMaps: SettingsMapsPage,
  Payments: PaymentsPage,
  Dues: DuesPage,
  RefundRequests: RefundRequestsPage,
  Settlements: SettlementsPage,
  // Marketing
  Offers: OffersPage,
  Membership: MembershipPage,
  Campaigns: CampaignsPage,
  PushCampaigns: PushCampaignsPage,
  ReferralModeration: ReferralModerationPage,
  ReferralCampaigns: ReferralCampaignsPage,
  ReferralAnalytics: ReferralAnalyticsPage,
  // Support
  Support: SupportPage,
  // Reports
  Reports: ReportsPage,
  CustomerReport: CustomerReportPage,
  DriverReport: DriverReportPage,
  OperationalReport: OperationalReportPage,
  CustomReport: CustomReportPage,
  ExportCentre: ExportCentrePage,
  // Administration
  SettingsAdminAccounts: rootOnlyRoute(SettingsAdminAccountsPage),
  TeamsAccess: rootOnlyRoute(TeamsAccessPage),
  SettingsRoles: rootOnlyRoute(SettingsRolesPage),
  AdminActivityLogs: AdminActivityPage,
  LoginHistory: UsersActivityPage,
  Audit: AuditPage,
  // Settings
  GeneralSettings: GeneralSettingsPage,
  SettingsBusiness: SettingsBusinessPage,
  SettingsPayments: SettingsPaymentsPage,
  SettingsMaps: SettingsMapsPage,
  SettingsTax: SettingsTaxPage,
  SecuritySettings: SecuritySettingsPage,
  SettingsPreferences: SettingsPreferencesPage,
  Policies: PoliciesPage,
  Integrations: IntegrationsPage,
  // Master data
  SettingsCities: SettingsCitiesPage,
  SettingsBrands: SettingsBrandsPage,
  SettingsPickupPoints: SettingsPickupPointsPage,
  SettingsProtectionPlan: SettingsProtectionPlanPage,
  SettingsMembershipTypes: SettingsMembershipTypesPage,
  // System
  SystemHealth: SystemHealthPage,
  BackgroundJobs: BackgroundJobsPage,
}

// Every route in navConfig, resolved to a component (or the not-built shell).
const ListPage = ({ entry }) => (
  <div className='max-w-7xl mx-auto'>
    <Header title={entry.label} RightContent={() => null} />
    {entry.list.note && <p className='text-xs text-[#757575] px-1 pt-3'>{entry.list.note}</p>}
    <ResourceManager
      endpoint={entry.list.endpoint}
      extraQuery={entry.list.extraQuery || ''}
      readOnly={!!entry.list.readOnly}
      createLabel={entry.list.createLabel || '+ Add'}
      searchPlaceholder={`Search ${entry.label.toLowerCase()}`}
      emptyText='Nothing here yet.'
      columns={entry.list.columns || []}
      fields={entry.list.fields || []}
      // Which platform API backs this list — omit for the core API, 'workspace'
      // for cocarr-workspace-api. Set on Workspace-panel list configs.
      api={entry.list.api}
      // Resolved by NAV_ROUTES as `page.module || group.module`, so a list
      // inherits the right module even when it sits in another group's section.
      module={entry.module}
    />
  </div>
)

// page > list > not-built shell, in that order.
const NAV_ROUTE_MAP = NAV_ROUTES.reduce((acc, r) => {
  const Component = r.page ? PAGE_COMPONENTS[r.page] : null
  if (Component) acc[r.route] = Component
  else if (r.list) acc[r.route] = () => <ListPage entry={r} />
  else acc[r.route] = () => <NotBuiltPage title={r.label} moduleLabel={r.moduleLabel} />
  return acc
}, {})

function DashboardRouter({ pathname }) {
  // Clean pathname by removing trailing slash
  const cleanPath = pathname.replace(/\/$/, '') || '/dashboard'

  // May this admin open this route? `null` means "not a nav route, or the
  // profile hasn't loaded" — both mean don't block, because the server is the
  // real gate and guessing here would lock people out of dynamic pages.
  //
  // This must come BEFORE the route lookups below: without it a denied path
  // falls through to Dashboard, which reads as the panel misbehaving rather
  // than as a permissions problem, and hides the problem from the one person
  // who would report it.
  const canOpen = useCanOpenRoute()
  const allowed = canOpen(cleanPath)
  if (allowed === false) {
    const entry = findRoute(cleanPath)
    return (
      <DashboardLayout>
        <NoAccess section={entry?.label} />
      </DashboardLayout>
    )
  }
  
  // Helper function to match dynamic routes
  const matchDynamicRoute = (path, pattern) => {
    const pathSegments = path.split('/').filter(Boolean)
    const patternSegments = pattern.split('/').filter(Boolean)
    
    if (pathSegments.length !== patternSegments.length) return null
    
    const params = {}
    for (let i = 0; i < patternSegments.length; i++) {
      if (patternSegments[i].startsWith('[') && patternSegments[i].endsWith(']')) {
        const paramName = patternSegments[i].slice(1, -1)
        params[paramName] = pathSegments[i]
      } else if (patternSegments[i] !== pathSegments[i]) {
        return null
      }
    }
    return params
  }
  
  // Routes retired from the NAV but kept reachable by URL.
  //
  // The Dashboard group collapsed to a single page, so these are no longer menu
  // entries — their content belongs in dashboard blocks. They stay resolvable
  // because removing a route from navConfig also removes it from
  // NAV_ROUTE_MAP, and the catch-all would then drop existing links and
  // bookmarks on Dashboard: that looks like the page vanished rather than
  // moved. Delete these two lines once the blocks land.
  const RETIRED_ROUTES = {
    // Roles & Permissions merged into Teams & Access. Kept resolvable so an
    // existing bookmark lands on the real permission editor instead of 404ing
    // — or worse, on the legacy matrix whose edits do nothing.
    '/dashboard/admin-roles': rootOnlyRoute(TeamsAccessPage),
    '/dashboard/live-activity': LiveActivityPage,
    '/dashboard/alerts': SystemAlertsPage,
  }

  // navConfig is the single source of truth for every static route.
  const NavComponent = NAV_ROUTE_MAP[cleanPath] || RETIRED_ROUTES[cleanPath]
  if (NavComponent) {
    return (
      <DashboardLayout>
        <NavComponent />
      </DashboardLayout>
    )
  }

  // Handle dynamic routes
  // Rides dynamic routes
  if (cleanPath.match(/^\/dashboard\/rides\/[^\/]+$/)) {
    return (
      <DashboardLayout>
        <RideDetailLayout>
          <RideDetailPage />
        </RideDetailLayout>
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/rides\/[^\/]+\/payment$/)) {
    return (
      <DashboardLayout>
        <RideDetailLayout>
          <RidePaymentPage />
        </RideDetailLayout>
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/rides\/[^\/]+\/due$/)) {
    return (
      <DashboardLayout>
        <RideDetailLayout>
          <RideDuePage />
        </RideDetailLayout>
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/rides\/[^\/]+\/start-ride$/)) {
    return (
      <DashboardLayout>
        <RideDetailLayout>
          <RideStartPage />
        </RideDetailLayout>
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/rides\/[^\/]+\/end-ride$/)) {
    return (
      <DashboardLayout>
        <RideDetailLayout>
          <RideEndPage />
        </RideDetailLayout>
      </DashboardLayout>
    )
  }

  // Vehicles dynamic routes
  if (cleanPath.match(/^\/dashboard\/vehicles\/[^\/]+$/)) {
    return (
      <DashboardLayout>
        <VehicleDetailLayout>
          <VehicleDetailPage />
        </VehicleDetailLayout>
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/vehicles\/[^\/]+\/reviews$/)) {
    return (
      <DashboardLayout>
        <VehicleDetailLayout>
          <VehicleReviewsPage />
        </VehicleDetailLayout>
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/vehicles\/[^\/]+\/rides$/)) {
    return (
      <DashboardLayout>
        <VehicleDetailLayout>
          <VehicleRidesPage />
        </VehicleDetailLayout>
      </DashboardLayout>
    )
  }

  // Hosts dynamic routes
  if (cleanPath.match(/^\/dashboard\/hosts\/[^\/]+$/)) {
    return (
      <DashboardLayout>
        <HostDetailLayout>
          <HostDetailPage />
        </HostDetailLayout>
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/hosts\/[^\/]+\/payment$/)) {
    return (
      <DashboardLayout>
        <HostDetailLayout>
          <HostPaymentPage />
        </HostDetailLayout>
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/hosts\/[^\/]+\/vehicles$/)) {
    return (
      <DashboardLayout>
        <HostDetailLayout>
          <HostVehiclesPage />
        </HostDetailLayout>
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/hosts\/[^\/]+\/rides$/)) {
    return (
      <DashboardLayout>
        <HostDetailLayout>
          <HostRidesPage />
        </HostDetailLayout>
      </DashboardLayout>
    )
  }

  // Users dynamic routes.
  //
  // This pattern also matches the nav's own /dashboard/users/verification and
  // /dashboard/users/documents. That is safe ONLY because NAV_ROUTE_MAP is
  // consulted before this block — a named page under /dashboard/users must be
  // declared in navConfig, or it will be treated as a user id and 404.
  if (cleanPath.match(/^\/dashboard\/users\/[^\/]+$/)) {
    return (
      <DashboardLayout>
        <UserDetailPage />
      </DashboardLayout>
    )
  }

  // Availability schedule dynamic routes
  if (cleanPath.match(/^\/dashboard\/availability-schedule\/[^\/]+$/)) {
    return (
      <DashboardLayout>
        <AvailabilityDetailPage />
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/availability-schedule\/[^\/]+\/reviews$/)) {
    return (
      <DashboardLayout>
        <AvailabilityReviewsPage />
      </DashboardLayout>
    )
  }
  
  if (cleanPath.match(/^\/dashboard\/availability-schedule\/[^\/]+\/rides$/)) {
    return (
      <DashboardLayout>
        <AvailabilityRidesPage />
      </DashboardLayout>
    )
  }

  // Default to dashboard home if route not found
  return (
    <DashboardLayout>
      <DashboardPage />
    </DashboardLayout>
  )
}


