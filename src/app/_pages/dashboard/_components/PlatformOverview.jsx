'use client'
// The previous single Dashboard: platform-wide KPIs and charts of users,
// bookings and revenue.
//
// RETAINED, NOT DELETED. It is no longer the dashboard — that is now composed
// per team by the backend (see ../page.js and dashboardSummaryService) — but
// these charts are worth keeping and folding back in as blocks.
//
// ⚠ It is NOT team-scoped. It calls /admin/user-management/overview and the
// customer/operational report endpoints directly, all platform-wide, so
// rendering it for everybody would hand a Support agent the whole platform's
// revenue — exactly what the per-team split exists to prevent. Split it into
// blocks that each declare a module + action, the way every other block does,
// before reintroducing it.
//
// Nothing imports this today.
import React, { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSelector } from 'react-redux'
import {
  Chart as ChartJS, ArcElement, Tooltip, Legend,
  CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler,
} from 'chart.js'
import { Doughnut, Line, Bar } from 'react-chartjs-2'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Loader from '../../_components/Loader'
import PageLayout from '@/app/_components/PageLayout'
import { STATUS_LABEL } from '@/app/_helpers/userStatus'

ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler)
ChartJS.defaults.font.family = 'inherit'
ChartJS.defaults.color = '#959595'

const ACCENT = '#ECC032'
const STATUS_COLORS = {
  active: '#22c55e', pending: '#f59e0b', incomplete: '#9ca3af', rejected: '#ef4444', suspended: '#fb923c',
}

const RANGES = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
]

const iso = (d) => d.toISOString().slice(0, 10)

// ── Module-scope presentational pieces ──────────────────────────────────────

const StatCard = ({ label, value, sub, accent, onClick }) => (
  <div
    onClick={onClick}
    className={`bg-white border border-gray-100 rounded-lg p-4 ${onClick ? 'cursor-pointer hover:border-gray-200 hover:shadow-sm transition' : ''}`}
  >
    <div className='flex items-center gap-2'>
      {accent && <span className='w-2 h-2 rounded-full' style={{ background: accent }} />}
      <p className='text-[11px] uppercase tracking-tight text-[#959595] font-semibold'>{label}</p>
    </div>
    <p className='text-2xl font-bold text-[#1a1a1a] mt-1.5 mb-0'>{value ?? '—'}</p>
    {sub && <p className='text-[11px] text-[#959595] mt-0.5 mb-0'>{sub}</p>}
  </div>
)

const Panel = ({ title, action, children, className = '' }) => (
  <div className={`bg-white border border-gray-100 rounded-lg p-5 ${className}`}>
    <div className='flex items-center justify-between gap-2 mb-4'>
      <p className='font-semibold text-sm text-[#1a1a1a]'>{title}</p>
      {action}
    </div>
    {children}
  </div>
)

// ────────────────────────────────────────────────────────────────────────────

export default function PlatformOverview() {
  const router = useRouter()
  const auth = useSelector((s) => s.auth)
  const [rangeDays, setRangeDays] = useState(30)
  const [loading, setLoading] = useState(true)
  const [overview, setOverview] = useState(null)
  const [customer, setCustomer] = useState(null)
  const [operational, setOperational] = useState(null)

  useEffect(() => {
    let alive = true
    const run = async () => {
      setLoading(true)
      const to = new Date()
      const from = new Date(Date.now() - rangeDays * 24 * 3600 * 1000)
      const params = { from: iso(from), to: iso(to) }

      // Each read is independent — one failing endpoint shouldn't blank the
      // whole dashboard, so failures fall back to null and the panel shows an
      // empty state rather than crashing.
      const [ov, cu, op] = await Promise.allSettled([
        authAxios.get('/admin/user-management/overview'),
        authAxios.get('/admin/reports/customer', { params }),
        authAxios.get('/admin/reports/operational', { params }),
      ])
      if (!alive) return
      if (ov.status === 'fulfilled') setOverview(ov.value.data)
      if (cu.status === 'fulfilled') setCustomer(cu.value.data)
      if (op.status === 'fulfilled') setOperational(op.value.data)
      if (ov.status === 'rejected' && cu.status === 'rejected' && op.status === 'rejected') {
        ErrorToast('Could not load dashboard data')
      }
      setLoading(false)
    }
    run()
    return () => { alive = false }
  }, [rangeDays])

  const counts = overview?.counts || {}
  const docs = overview?.documents || {}
  const custSummary = customer?.summary || {}
  const opSummary = operational?.summary || {}

  // User status distribution → doughnut.
  const statusData = useMemo(() => {
    const keys = ['active', 'pending', 'incomplete', 'rejected', 'suspended']
    const present = keys.filter((k) => (counts[k] || 0) > 0)
    return {
      labels: present.map((k) => STATUS_LABEL[k] || k),
      datasets: [{
        data: present.map((k) => counts[k] || 0),
        backgroundColor: present.map((k) => STATUS_COLORS[k]),
        borderWidth: 0,
      }],
    }
  }, [counts])

  // Signups per day → line.
  const signupData = useMemo(() => {
    const rows = customer?.signupsByDay || []
    return {
      labels: rows.map((r) => (r.day || '').slice(5)),
      datasets: [{
        label: 'Sign-ups',
        data: rows.map((r) => Number(r.signups) || 0),
        borderColor: ACCENT,
        backgroundColor: 'rgba(236,192,50,0.15)',
        fill: true,
        tension: 0.35,
        pointRadius: 0,
        borderWidth: 2,
      }],
    }
  }, [customer])

  // Documents awaiting review → bar.
  const docData = useMemo(() => ({
    labels: ['Aadhaar', 'Licence', 'PAN'],
    datasets: [{
      label: 'Pending review',
      data: [docs.aadhaar || 0, docs.licence || 0, docs.pan || 0],
      backgroundColor: ['#60a5fa', '#a78bfa', '#f472b6'],
      borderRadius: 6,
      maxBarThickness: 44,
    }],
  }), [docs])

  const greeting = auth?.userName || auth?.email || 'there'
  const totalUsers = custSummary.totalUsers ?? counts.total

  const rangeFilter = (
    <div className='flex bg-white border border-gray-200 rounded-md overflow-hidden'>
      {RANGES.map((r) => (
        <button key={r.days} onClick={() => setRangeDays(r.days)}
          className={`px-3 py-1.5 text-xs font-semibold transition ${
            rangeDays === r.days ? 'bg-[#ECC032] text-black' : 'text-[#757575] hover:bg-gray-50'}`}>
          {r.label}
        </button>
      ))}
    </div>
  )

  if (loading && !overview) return <Loader />

  return (
    <PageLayout
      title='Dashboard'
      subtitle={`Welcome back, ${greeting} — here's how the platform is doing.`}
      breadcrumb={['Home', 'Dashboard']}
      filters={<><span className='text-xs text-[#757575] font-medium'>Showing</span>{rangeFilter}</>}
    >
      {/* KPI row */}
      <div className='grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3'>
        <StatCard label='Total users' value={totalUsers}
          sub={custSummary.newUsers != null ? `+${custSummary.newUsers} in ${rangeDays}d` : null}
          onClick={() => router.push('/dashboard/users')} />
        <StatCard label='Active' value={counts.active} accent={STATUS_COLORS.active}
          onClick={() => router.push('/dashboard/users?status=active')} />
        <StatCard label='Pending verification' value={counts.pending} accent={STATUS_COLORS.pending}
          onClick={() => router.push('/dashboard/users?status=pending')} />
        <StatCard label='Docs to review' value={docs.total}
          sub='Aadhaar · Licence · PAN'
          onClick={() => router.push('/dashboard/users/verification')} />
        <StatCard label='Vehicles' value={opSummary.totalVehicles}
          sub={opSummary.pendingApproval != null ? `${opSummary.pendingApproval} awaiting approval` : null}
          onClick={() => router.push('/dashboard/vehicles')} />
        <StatCard label='Fleet utilisation' value={opSummary.utilisationPct != null ? `${opSummary.utilisationPct}%` : null}
          sub={opSummary.vehiclesBooked != null ? `${opSummary.vehiclesBooked} booked` : null} />
      </div>

      {/* Charts row */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3'>
        <Panel title={`Sign-ups · last ${rangeDays} days`} className='lg:col-span-2'>
          {(customer?.signupsByDay || []).length > 0 ? (
            <div style={{ height: 260 }}>
              <Line data={signupData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f3f3f3' } } },
              }} />
            </div>
          ) : <Empty>No sign-ups in this period.</Empty>}
        </Panel>

        <Panel title='Users by status'>
          {statusData.labels.length > 0 ? (
            <div style={{ height: 260 }}>
              <Doughnut data={statusData} options={{
                responsive: true, maintainAspectRatio: false, cutout: '62%',
                plugins: { legend: { position: 'bottom', labels: { boxWidth: 10, padding: 12, font: { size: 11 } } } },
              }} />
            </div>
          ) : <Empty>No users yet.</Empty>}
        </Panel>
      </div>

      {/* Secondary row: doc queue chart + queues + conversion */}
      <div className='grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3'>
        <Panel title='Documents awaiting review'>
          {docs.total > 0 ? (
            <div style={{ height: 220 }}>
              <Bar data={docData} options={{
                responsive: true, maintainAspectRatio: false,
                plugins: { legend: { display: false } },
                scales: { x: { grid: { display: false } }, y: { beginAtZero: true, ticks: { precision: 0 }, grid: { color: '#f3f3f3' } } },
              }} />
            </div>
          ) : <Empty>Nothing waiting — the review queue is clear.</Empty>}
        </Panel>

        <Panel title='Review queues'
          action={<button onClick={() => router.push('/dashboard/users/verification')}
            className='text-[11px] font-semibold text-[#454545] hover:underline'>Open queue →</button>}>
          <div className='divide-y divide-gray-50'>
            <QueueRow label='Pending verification' value={counts.pending}
              onClick={() => router.push('/dashboard/users?status=pending')} />
            <QueueRow label='Incomplete profiles' value={counts.incomplete}
              onClick={() => router.push('/dashboard/users?status=incomplete')} />
            <QueueRow label='Rejected' value={counts.rejected}
              onClick={() => router.push('/dashboard/users?status=rejected')} />
            <QueueRow label='Suspended' value={counts.suspended}
              onClick={() => router.push('/dashboard/users?status=suspended')} />
            <QueueRow label='Vehicles awaiting approval' value={opSummary.pendingApproval}
              onClick={() => router.push('/dashboard/vehicles?status=pending')} />
          </div>
        </Panel>

        <Panel title='Customer engagement'>
          <div className='grid grid-cols-2 gap-3'>
            <Mini label='Booked' value={custSummary.customersWhoBooked} />
            <Mini label='Repeat' value={custSummary.repeatCustomers} />
            <Mini label='Repeat rate' value={custSummary.repeatRatePct != null ? `${custSummary.repeatRatePct}%` : null} />
            <Mini label='Conversion' value={custSummary.conversionPct != null ? `${custSummary.conversionPct}%` : null} />
          </div>
          <p className='text-[11px] text-[#959595] mt-3'>
            Share of customers who booked at least once, and how many came back.
          </p>
        </Panel>
      </div>
    </PageLayout>
  )
}

const Empty = ({ children }) => (
  <div className='h-[200px] flex items-center justify-center'>
    <p className='text-xs text-[#959595]'>{children}</p>
  </div>
)

const QueueRow = ({ label, value, onClick }) => (
  <button onClick={onClick} className='w-full flex items-center justify-between py-2.5 text-left hover:bg-[#fafafa] -mx-1 px-1 rounded'>
    <span className='text-xs text-[#454545]'>{label}</span>
    <span className='text-sm font-bold text-[#1a1a1a]'>{value ?? '—'}</span>
  </button>
)

const Mini = ({ label, value }) => (
  <div className='bg-[#fafafa] rounded-md px-3 py-2.5'>
    <p className='text-lg font-bold text-[#1a1a1a] mb-0'>{value ?? '—'}</p>
    <p className='text-[10px] uppercase tracking-tight text-[#959595] font-semibold mt-0'>{label}</p>
  </div>
)
