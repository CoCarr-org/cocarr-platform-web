'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'

const Tile = ({ label, value, tone }) => (
  <div className='bg-white border border-gray-100 rounded-md px-5 py-4'>
    <p className='text-[11px] uppercase tracking-tight text-[#757575] font-semibold'>{label}</p>
    <p className={`text-2xl font-bold tracking-tight mt-1 ${tone || ''}`}>{value}</p>
  </div>
)

// Where a rule actually lives decides whether an admin can change it at all,
// so it's a first-class column rather than a footnote.
const SOURCE = {
  settings: { label: 'Configurable', style: 'bg-green-100 text-green-700',
    hint: 'Editable from the admin panel' },
  code: { label: 'Hardcoded', style: 'bg-gray-100 text-gray-600',
    hint: 'Changing this needs a code change and deploy' },
  'per-record': { label: 'Per record', style: 'bg-blue-50 text-blue-700',
    hint: 'Stored per vehicle or host, not set globally' },
}

const SourceTag = ({ source }) => {
  const s = SOURCE[source] || SOURCE.code
  return <span title={s.hint} className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${s.style}`}>{s.label}</span>
}

export default function Policies() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)
  const [onlyReview, setOnlyReview] = useState(false)

  useEffect(() => {
    (async () => {
      try {
        const res = await authAxios.get('/admin/policies')
        setData(res.data)
      } catch (error) {
        ErrorToast(error?.response?.data?.error || 'Could not load policies')
      } finally { setLoading(false) }
    })()
  }, [])

  const s = data?.summary

  return (
    <div className='max-w-5xl mx-auto pb-10'>
      <Header title='Policies' RightContent={() => null} />

      <p className='text-sm text-[#757575] my-4'>
        Every business rule the platform actually enforces today, read from the code and the settings
        table. This page is for review — it reports what each rule is and where it lives. Configurable
        values are edited under Settings.
      </p>

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}

      {!loading && s && (
        <>
          <div className='grid grid-cols-2 md:grid-cols-4 gap-3 mb-4'>
            <Tile label='Policies' value={s.total} />
            <Tile label='Configurable' value={s.configurable} />
            <Tile label='Hardcoded' value={s.hardcoded} />
            <Tile label='Need attention' value={s.needsReview}
              tone={s.needsReview > 0 ? 'text-amber-600' : ''} />
          </div>

          {s.unconfigured > 0 && (
            <div className='bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md px-4 py-3 mb-4'>
              {s.unconfigured} configurable {s.unconfigured === 1 ? 'fee has' : 'fees have'} no value set in
              the settings table. Those fall back to zero or a built-in default.
            </div>
          )}

          <label className='flex items-center gap-2 mb-4 text-sm text-[#454545] cursor-pointer'>
            <input type='checkbox' checked={onlyReview} onChange={(e) => setOnlyReview(e.target.checked)} />
            Show only policies that need attention
          </label>

          {data.categories.map((group) => {
            const policies = onlyReview ? group.policies.filter((p) => p.review) : group.policies
            if (!policies.length) return null
            return (
              <div key={group.category} className='mb-6'>
                <h2 className='text-xs uppercase tracking-tight text-[#757575] font-semibold mb-2'>
                  {group.category}
                </h2>
                <div className='bg-white border border-gray-100 rounded-md divide-y divide-gray-50'>
                  {policies.map((p) => (
                    <div key={p.key} className='px-5 py-4'>
                      <div className='flex items-start justify-between gap-3'>
                        <p className='font-semibold text-sm'>{p.name}</p>
                        <div className='flex items-center gap-2 shrink-0'>
                          {p.source === 'settings' && (
                            <span className='text-sm font-bold'>
                              {p.currentValue !== null && p.currentValue !== undefined
                                ? `${p.unit === '%' ? '' : '₹'}${p.currentValue}${p.unit === '%' ? '%' : ''}`
                                : <span className='text-xs font-semibold text-amber-600'>Not set</span>}
                            </span>
                          )}
                          <SourceTag source={p.source} />
                        </div>
                      </div>

                      <p className='text-xs text-[#454545] mt-1.5 leading-relaxed'>{p.rule}</p>

                      {p.fallback && (
                        <p className='text-[11px] text-[#959595] mt-1'>Fallback: {p.fallback}</p>
                      )}
                      {p.location && (
                        <p className='text-[11px] text-[#959595] mt-1 font-mono'>{p.location}</p>
                      )}

                      {p.review && (
                        <div className='mt-2 bg-amber-50 border-l-2 border-amber-400 px-3 py-2'>
                          <p className='text-[11px] text-amber-800 leading-relaxed'>
                            <span className='font-semibold'>Needs attention · </span>{p.review}
                          </p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )
          })}

          {data.protectionPlan && (
            <p className='text-[11px] text-[#959595]'>
              Current protection plan price: ₹{data.protectionPlan.basicPlanPrice} — {data.protectionPlan.note}
            </p>
          )}
        </>
      )}
    </div>
  )
}
