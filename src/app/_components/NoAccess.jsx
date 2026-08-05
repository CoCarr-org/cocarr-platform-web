'use client'
import { useRouter } from 'next/navigation'
import { usePermissions } from '@/app/_helpers/permissions'
import { PANEL } from '@/app/_helpers/panels'

// Shown when an admin reaches a page their team and level cannot read.
//
// This exists because the alternative is worse: unknown paths in the catch-all
// router fall through to Dashboard, so a denied link would silently deposit
// someone on the home page as if they had mistyped. That teaches people the
// panel is flaky rather than that they lack access — and it hides a real
// permissions problem from the person best placed to report it.
//
// Says WHICH team and level are in force, because "ask an admin for access" is
// unactionable without it: the Super Admin granting it needs to know what to
// change, and the fastest route to that is the person asking already knowing.
export default function NoAccess({ section }) {
  const router = useRouter()
  const { team, level, source } = usePermissions()

  return (
    <div className='max-w-xl mx-auto px-6 py-16 text-center'>
      <p className='text-[13px] uppercase tracking-wider text-[#959595] font-semibold mb-2'>
        No access
      </p>
      <h1 className='text-xl font-semibold text-[#252525] mb-3'>
        {section ? `You can't open ${section}` : "You can't open this page"}
      </h1>

      <p className='text-sm text-[#757575] mb-6'>
        {team
          ? <>Your team is <strong>{team.name}</strong>{level ? <> at <strong>{level.name}</strong> level</> : null}, which doesn&apos;t include this section.</>
          : source === 'legacy'
            ? <>You aren&apos;t on a team yet, so your access is limited.</>
            : <>Your account doesn&apos;t have access to this section.</>}
      </p>

      <p className='text-xs text-[#959595] mb-8'>
        Ask a Super Admin to grant it in Settings → Roles &amp; Permissions.
        {/* The panel label matters once there is more than one host: "it works
            for my colleague" is usually them being on a different portal. */}
        {' '}You&apos;re on the {PANEL.label.toLowerCase()}.
      </p>

      <div className='flex items-center justify-center gap-3'>
        <button
          onClick={() => router.push('/dashboard/')}
          className='text-sm font-semibold bg-[#ECC032] text-black px-5 py-2 rounded-md'
        >
          Go to Dashboard
        </button>
        <button
          onClick={() => router.back()}
          className='text-sm font-semibold text-[#757575] px-3 py-2'
        >
          Back
        </button>
      </div>
    </div>
  )
}
