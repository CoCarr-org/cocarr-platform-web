// Profile status vocabulary, shared by every screen that shows it.
//
// Mirrors `verificationStatus` on COCARR-BACKEND's User model:
//
//   incomplete → pending → active | rejected
//        ↑__________________________|        (fix & resubmit)
//   active → suspended → active              (admin toggle)
//
// Kept in one file so the customers list, the user detail page, the KYC list
// and the verification queue can never label or colour the same state
// differently — they did before, when each page carried its own map.
//
// NOT the same as a DOCUMENT's status (pending | verified | rejected), which
// lives on the document rows and keeps its own `verified` value.

export const STATUS_PILL = {
  incomplete: 'bg-gray-100 text-gray-600',
  pending: 'bg-amber-100 text-amber-700',
  active: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  suspended: 'bg-orange-100 text-orange-700',
}

export const STATUS_LABEL = {
  incomplete: 'Incomplete',
  pending: 'Pending verification',
  active: 'Active',
  rejected: 'Rejected',
  suspended: 'Suspended',
}

// What each state means for the user, shown next to the pill on the detail
// page so an admin doesn't have to remember the rules.
export const STATUS_MEANING = {
  incomplete: 'The user has not finished onboarding. They cannot book.',
  // A finished wizard lands here whether or not the automatic checks passed —
  // an OCR or Aadhaar-OTP failure is not the user's fault, and reviewing it is
  // the point of this queue.
  pending: 'Submitted and waiting on your decision — including submissions whose automatic checks failed. They cannot book yet.',
  active: 'Approved by an admin. This is the only state that can book a ride, and only Approve puts a profile in it.',
  rejected: 'Turned down. The user can correct their details and resubmit.',
  suspended: 'Blocked from signing in entirely. Documents and approval are retained.',
}

// Order matters — this is the filter bar's left-to-right order.
export const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'pending', label: 'Pending verification' },
  { value: 'active', label: 'Active' },
  { value: 'incomplete', label: 'Incomplete' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'suspended', label: 'Suspended' },
]

// Document review state, as returned in each row's `documentStatus`.
export const DOC_PILL = {
  verified: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-600',
  missing: 'bg-gray-100 text-gray-500',
}

export const DOC_LABEL = {
  verified: 'Verified',
  pending: 'Pending',
  rejected: 'Rejected',
  missing: 'Not submitted',
}

// Which actions an admin may take from a given state. The backend rejects the
// rest, so showing them would only produce an error the admin cannot act on.
//
// **Nothing activates a profile except Approve.** Verifying a document says
// "this scan is good"; it does not say "this person may now book". The backend
// used to promote the profile the moment the last identity document was
// verified, which meant a profile could go live without anyone seeing this
// decision — and made the outcome depend on the order documents happened to be
// reviewed in. Both ends are now explicit.
//
// Reject is available from `active` as well as `pending`: an approval sometimes
// has to be withdrawn after the fact, and suspension is the wrong tool for it —
// that is an access ban for misconduct and says something quite different to
// the user.
export const allowedActions = (status) => ({
  approve: status === 'pending',
  reject: status === 'pending' || status === 'active',
  suspend: status === 'active',
  reactivate: status === 'suspended',
})
