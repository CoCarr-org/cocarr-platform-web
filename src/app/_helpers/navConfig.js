// Single source of truth for the admin panel's navigation.
//
// Both the sidebar (Sidebar.jsx) and the catch-all router ([[...slug]]/page.js)
// read this, so a page can never exist in one and not the other.
//
// Every nav group maps to a backend RBAC module (COCARR-BACKEND
// src/utils/adminPermissions.js). `module` on the group is the default; a page
// may override it with its own `module` when that operation is governed by a
// different permission (e.g. "Teams & Access" under Administration uses `roles`).
// This is the module -> operation level the RBAC matrix (Role x Module x CRUD)
// grants against.
//
// A page renders one of two ways, in priority order:
//   page:  component key resolved in [[...slug]]/page.js
//   list:  config rendered by ResourceManager (a real endpoint behind it)
// There is no third "not built" shell — every placeholder / unwired screen was
// removed. Add a page here only when a real, wired operation backs it.

const DISPUTE_STATUS = [
  { value: 'open', name: 'Open' }, { value: 'investigating', name: 'Investigating' },
  { value: 'resolved', name: 'Resolved' }, { value: 'rejected', name: 'Rejected' },
]

export const NAV_MODULES = [
  {
    // ── ONE page, no children ──
    // The dashboard is composed per team by the backend
    // (dashboardSummaryService), so there is nothing to navigate between: an
    // Operations user and a Finance user open the same route and get different
    // content. A group whose only child is itself renders as an expandable menu
    // containing one item, which is just friction.
    //
    // Live Activity and Alerts are NOT deleted — their components remain and
    // their routes stay in the router's staticRouteMap, so existing links keep
    // working. They belong in the dashboard as blocks.
    key: 'dashboard', label: 'Dashboard', icon: 'apps', module: 'dashboard',
    pages: [
      { label: 'Dashboard', route: '/dashboard', page: 'DashboardOverview' },
    ],
  },
  {
    key: 'users', label: 'User Management', icon: 'people', module: 'users',
    pages: [
      { label: 'Overview',               route: '/dashboard/user-management',  page: 'UserManagement' },
      { label: 'Customers',              route: '/dashboard/users',            page: 'Users' },
      { label: 'KYC Verification Queue', route: '/dashboard/users/verification', page: 'UsersVerification' },
      { label: 'KYC & Documents',        route: '/dashboard/users/documents',  page: 'UserDocuments' },
      { label: 'Referrals',              route: '/dashboard/users/referrals',  page: 'UserReferrals' },
      { label: 'Wallets',                route: '/dashboard/wallet',           page: 'Wallet' },
    ],
  },
  {
    key: 'hosts', label: 'Hosts', icon: 'people', module: 'hosts',
    pages: [
      { label: 'Hosts / Partners',    route: '/dashboard/hosts',                  page: 'Hosts' },
      { label: 'Host Bank Accounts',  route: '/dashboard/finance/bank-accounts',  page: 'HostBankAccounts', module: 'payouts' },
    ],
  },
  {
    key: 'vehicles', label: 'Vehicles', icon: 'car', module: 'vehicles',
    pages: [
      { label: 'Vehicles',           route: '/dashboard/vehicles',              page: 'Vehicles' },
      { label: 'Vehicle RC Details', route: '/dashboard/vehicles/rc',           page: 'VehicleRc' },
      { label: 'Scheduling',         route: '/dashboard/availability-schedule', page: 'AvailabilitySchedule' },
    ],
  },
  {
    key: 'bookings', label: 'Bookings', icon: 'car', module: 'bookings',
    pages: [
      { label: 'Bookings',      route: '/dashboard/rides',              page: 'Rides' },
      // "Trips" = journeys that actually ran, i.e. finished bookings.
      { label: 'Trips',         route: '/dashboard/operations/trips',   page: 'Trips' },
      { label: 'Damage Claims', route: '/dashboard/operations/damages', page: 'DamageClaims' },
      {
        label: 'Complaints', route: '/dashboard/support/complaints',
        list: {
          endpoint: '/admin/disputes', createLabel: '+ Log Complaint',
          note: 'Booking-linked complaints and disputes, with a monetary outcome. General queries belong in Support Tickets.',
          columns: [
            { key: 'bookingId', label: 'Booking' }, { key: 'category', label: 'Category' },
            { key: 'status', label: 'Status' }, { key: 'amountClaimed', label: 'Claimed' },
            { key: 'createdAt', label: 'Raised' },
          ],
          fields: [
            { key: 'bookingId', label: 'Booking ID', type: 'text', required: true },
            { key: 'category', label: 'Category', type: 'text' },
            { key: 'description', label: 'Description', type: 'textarea' },
            { key: 'amountClaimed', label: 'Amount claimed', type: 'number' },
            { key: 'amountAwarded', label: 'Amount awarded', type: 'number' },
            { key: 'status', label: 'Status', type: 'select', options: DISPUTE_STATUS },
            { key: 'resolution', label: 'Resolution', type: 'textarea' },
          ],
        },
      },
    ],
  },
  {
    key: 'finance', label: 'Finance', icon: 'cash', module: 'payments',
    pages: [
      { label: 'Transactions', route: '/dashboard/payments',            page: 'Payments' },
      { label: 'Dues',         route: '/dashboard/dues',                page: 'Dues' },
      { label: 'Refunds',      route: '/dashboard/finance/refunds',     page: 'RefundRequests' },
      { label: 'Settlements',  route: '/dashboard/finance/settlements', page: 'Settlements', module: 'payouts' },
      {
        label: 'Invoices', route: '/dashboard/finance/invoices', module: 'payouts',
        list: {
          endpoint: '/admin/invoices', readOnly: true,
          note: 'Host invoice records generated from settlements.',
          columns: [
            { key: 'invoiceNumber', label: 'Invoice' }, { key: 'hostId', label: 'Host' },
            { key: 'totalAmount', label: 'Amount' }, { key: 'status', label: 'Status' },
            { key: 'createdAt', label: 'Issued' },
          ],
        },
      },
    ],
  },
  {
    key: 'marketing', label: 'Marketing', icon: 'cash', module: 'marketing',
    pages: [
      { label: 'Coupons',            route: '/dashboard/offers',                       page: 'Offers' },
      { label: 'Promotions',         route: '/dashboard/membership',                   page: 'Membership' },
      { label: 'Email/SMS Campaigns', route: '/dashboard/marketing/campaigns',         page: 'Campaigns' },
      { label: 'Push Notifications', route: '/dashboard/marketing/push',               page: 'PushCampaigns' },
      { label: 'Referral Program',   route: '/dashboard/marketing/referrals',          page: 'ReferralModeration' },
      { label: 'Referral Campaigns', route: '/dashboard/marketing/referral-campaigns', page: 'ReferralCampaigns' },
      { label: 'Referral Analytics', route: '/dashboard/marketing/referral-analytics', page: 'ReferralAnalytics' },
    ],
  },
  {
    key: 'support', label: 'Support', icon: 'docs', module: 'support',
    pages: [
      { label: 'Support Tickets', route: '/dashboard/support', page: 'Support' },
      {
        label: 'Feedback', route: '/dashboard/support/feedback',
        list: {
          endpoint: '/admin/feedback', readOnly: true,
          note: 'Rider and host reviews merged into one feed.',
          columns: [
            { key: 'source', label: 'Source' }, { key: 'totalRating', label: 'Rating' },
            { key: 'comment', label: 'Comment' }, { key: 'createdAt', label: 'When' },
          ],
        },
      },
    ],
  },
  {
    key: 'reports', label: 'Reports', icon: 'apps', module: 'reports',
    pages: [
      { label: 'Business Reports',    route: '/dashboard/reports',             page: 'Reports' },
      { label: 'Customer Reports',    route: '/dashboard/reports/customer',    page: 'CustomerReport' },
      { label: 'Driver Reports',      route: '/dashboard/reports/driver',      page: 'DriverReport', module: 'hosts' },
      { label: 'Performance Reports', route: '/dashboard/reports/performance', page: 'OperationalReport' },
      { label: 'Custom Reports',      route: '/dashboard/reports/custom',      page: 'CustomReport' },
      { label: 'Export Centre',       route: '/dashboard/reports/exports',     page: 'ExportCentre' },
    ],
  },
  {
    key: 'administration', label: 'Administration', icon: 'settings', module: 'adminAccounts',
    pages: [
      { label: 'Admin Accounts',      route: '/dashboard/admin-accounts', page: 'SettingsAdminAccounts' },
      // ── ONE permission screen, not two ──
      // "Teams & Access" and "Roles & Permissions" were separate entries for
      // two different systems: the team/level grid, which is what
      // requirePermission actually enforces, and the legacy role×module matrix,
      // which CLAUDE.md notes nothing reads. Two screens for one job, only one
      // of which did anything — an admin could edit the decorative one and
      // reasonably conclude permissions were broken.
      //
      // Merged into the real one, under the name people look for. The old
      // /dashboard/admin-roles route still resolves (see the router) so
      // bookmarks land here rather than 404ing.
      { label: 'Roles & Permissions', route: '/dashboard/teams-access', page: 'TeamsAccess', module: 'roles' },
      { label: 'Admin Activity Logs', route: '/dashboard/admin-activity', page: 'AdminActivityLogs', module: 'auditLogs' },
      { label: 'Login History',       route: '/dashboard/admin-logins',   page: 'LoginHistory', module: 'security' },
      { label: 'Audit Logs',          route: '/dashboard/audit',          page: 'Audit', module: 'auditLogs' },
    ],
  },
  {
    key: 'settings', label: 'Settings', icon: 'settings', module: 'settings',
    pages: [
      { label: 'General',          route: '/dashboard/general-settings',   page: 'GeneralSettings' },
      { label: 'Company Profile',  route: '/dashboard/settings-business',  page: 'SettingsBusiness' },
      { label: 'Payment Gateways', route: '/dashboard/settings-payments',  page: 'SettingsPayments' },
      { label: 'Maps',             route: '/dashboard/settings-maps',      page: 'SettingsMaps' },
      { label: 'Tax',              route: '/dashboard/settings-tax',       page: 'SettingsTax' },
      { label: 'Authentication',   route: '/dashboard/security-settings',  page: 'SecuritySettings', module: 'security' },
      { label: 'Fees & Charges',   route: '/dashboard/settings/preferences', page: 'SettingsPreferences' },
      { label: 'Policies',         route: '/dashboard/policies',           page: 'Policies' },
      { label: 'Integrations',     route: '/dashboard/integrations',       page: 'Integrations', module: 'integrations' },
    ],
  },
  {
    key: 'masterData', label: 'Master Data', icon: 'docs', module: 'settings',
    pages: [
      { label: 'Service Areas',    route: '/dashboard/settings/cities',          page: 'SettingsCities' },
      { label: 'Vehicle Brands',   route: '/dashboard/settings/brands',          page: 'SettingsBrands', module: 'vehicles' },
      { label: 'Pickup Points',    route: '/dashboard/settings/pickup-points',   page: 'SettingsPickupPoints', module: 'vehicles' },
      { label: 'Protection Plans', route: '/dashboard/settings/protection-plan', page: 'SettingsProtectionPlan' },
      { label: 'Membership Types', route: '/dashboard/settings/membership-types', page: 'SettingsMembershipTypes', module: 'marketing' },
    ],
  },
  {
    key: 'system', label: 'System', icon: 'settings', module: 'systemHealth',
    pages: [
      { label: 'System Health',   route: '/dashboard/system-health',    page: 'SystemHealth' },
      { label: 'Background Jobs', route: '/dashboard/developer/queue',  page: 'BackgroundJobs' },
    ],
  },
]

// Flat route -> page metadata, used by the router.
export const NAV_ROUTES = NAV_MODULES.flatMap((m) =>
  m.pages.map((p) => ({
    ...p,
    module: p.module || m.module,
    moduleLabel: m.label,
    moduleKey: m.key,
  }))
)

export const findRoute = (pathname) => {
  const clean = (pathname || '').replace(/\/$/, '') || '/dashboard';
  return NAV_ROUTES.find((r) => r.route === clean);
};

export const PAGE_COUNT = NAV_ROUTES.length;
