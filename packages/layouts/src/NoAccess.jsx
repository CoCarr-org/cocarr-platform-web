'use client'
import { useRouter } from 'next/navigation'
import { useNavigation } from '@cocarr/iam-sdk'

// Shown when an admin reaches a page their team and level cannot read.
//
// This exists because the alternative is worse: unknown paths in the catch-all
// router fall through to Dashboard, so a denied link would silently deposit
// someone on the home page as if they had mistyped. That teaches people the
// panel is flaky rather than that they lack access — and it hides a real
// permissions problem from the person best placed to report it.
//
// Says WHICH ROLES are in force, because "ask an admin for access" is
// unactionable without it: the administrator granting it needs to know what to
// change, and the fastest route to that is the person asking already knowing.
//
// It reports roles rather than the old team+level pair — that grid is gone, and
// a role is what an administrator actually edits now. It remains a LABEL only:
// nothing here branches on it, and every gate reads a permission.
export default function NoAccess({ section }) {
  const router = useRouter()
  const nav = useNavigation()
  const roles = nav.roles.map((r) => r.key)

  return (
    <div className='max-w-xl mx-auto px-6 py-16 text-center'>
      <p className='text-[13px] uppercase tracking-wider text-[#959595] font-semibold mb-2'>
        No access
      </p>
      <h1 className='text-xl font-semibold text-[#252525] mb-3'>
        {section ? `You can't open ${section}` : "You can't open this page"}
      </h1>

      <p className='text-sm text-[#757575] mb-6'>
        {roles.length
          ? <>You hold <strong>{roles.join(', ')}</strong>, which doesn&apos;t include this section.</>
          : <>No role has been assigned to your account yet, so your access is limited.</>}
      </p>

      <p className='text-xs text-[#959595] mb-8'>
        Ask an administrator to grant it in Platform → Roles.
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
