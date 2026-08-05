'use client'
import React, { useEffect, useState } from 'react'
import authAxios from '@/app/_helpers/axios'
import { ErrorToast } from '@/app/_helpers/toasters'
import Header from '@/app/_components/Header'

// Marketing > Referral Analytics. Read-only dashboard over the referral module
// (GET /admin/referral-analytics → referralService.getAnalytics).

const Stat = ({ label, value, accent, hint }) => (
  <div className='bg-white border border-gray-100 rounded-md px-4 py-4'>
    <p className={`text-2xl font-semibold my-0 ${accent || ''}`}>{value}</p>
    <p className='text-xs my-0 mt-1 text-[#454545] font-medium'>{label}</p>
    {hint && <p className='text-[11px] my-0 mt-0.5 text-[#959595]'>{hint}</p>}
  </div>
)

export default function ReferralAnalytics() {
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const res = await authAxios.get('/admin/referral-analytics')
      setData(res.data || {})
    } catch (error) {
      ErrorToast(error?.response?.data?.error || 'Could not load referral analytics')
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [])

  return (
    <div className='max-w-7xl mx-auto pb-10'>
      <Header title='Referral Analytics' RightContent={() => null} />

      {loading && <p className='px-1 py-4 text-sm text-[#757575]'>Loading…</p>}

      {!loading && data && (
        <>
          <div className='grid grid-cols-2 sm:grid-cols-3 gap-3 px-1 py-3'>
            <Stat label='Total referrals' value={data.totalReferrals ?? 0} />
            <Stat label='Successful' value={data.successfulReferrals ?? 0} accent='text-green-600'
              hint='Reward fully credited' />
            <Stat label='Pending' value={data.pending ?? 0} accent='text-amber-600'
              hint='Awaiting activation / booking' />
            <Stat label='Failed' value={data.failed ?? 0} accent='text-red-500' hint='Reversed / cancelled' />
            <Stat label='Fraud cases' value={data.fraudCases ?? 0} accent='text-red-500' hint='Blocked referrals' />
            <Stat label='Conversion rate' value={`${data.conversionRate ?? 0}%`}
              hint='Successful ÷ total' />
          </div>

          <div className='bg-white border border-gray-100 rounded-md px-5 py-5 mt-3'>
            <p className='text-xs text-[#959595] my-0'>Wallet rewards distributed</p>
            <p className='text-3xl font-semibold my-0 mt-1'>
              {(data.walletRewardsDistributed ?? 0).toLocaleString('en-IN')}
              <span className='text-sm font-normal text-[#757575]'> points</span>
            </p>
            <p className='text-[11px] text-[#959595] mt-2 mb-0'>
              Total referral reward points credited across all users (successful reward rows).
            </p>
          </div>
        </>
      )}
    </div>
  )
}
