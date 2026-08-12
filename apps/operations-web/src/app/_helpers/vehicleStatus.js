// Vehicle approval vocabulary — the counterpart of userStatus.js, and kept in
// one file for the same reason: the vehicles list, the approvals queue and the
// review page must never label or colour the same state differently.
//
// Mirrors `approvalStatus` on cocarr-core-api's Vehicle model:
//
//   pending → approved | rejected
//      ↑__________________|              (host edits = resubmission)
//   approved → suspended → approved      (admin toggle)
//   approved → maintenance → approved    (off-platform, reversible, NOT a refusal)
//
// NOT the same as a DOCUMENT's status (pending | verified | rejected) on the RC
// and PAN rows, nor the per-item physical-check status. Those keep their own
// vocabulary — DOC_PILL / DOC_LABEL below.

export const STATUS_PILL = {
  pending: 'bg-amber-100 text-amber-700',
  approved: 'bg-green-100 text-green-700',
  rejected: 'bg-red-100 text-red-600',
  suspended: 'bg-orange-100 text-orange-700',
  maintenance: 'bg-blue-100 text-blue-700',
}

export const STATUS_LABEL = {
  pending: 'Pending review',
  approved: 'Approved',
  rejected: 'Rejected',
  suspended: 'Suspended',
  maintenance: 'In maintenance',
}

// What each state means, shown beside the pill so an admin does not have to
// remember the rules — particularly that `approved` is not the same as `live`.
export const STATUS_MEANING = {
  pending: 'Submitted by the host and waiting on your decision. It cannot be booked yet.',
  approved: 'Approved by an admin. It can be booked whenever an available schedule window covers the time.',
  rejected: 'Turned down with a reason. Editing the vehicle resubmits it and returns it to pending.',
  suspended: 'Taken off the platform by an admin. Its data is retained; restoring returns it to approved, not to review.',
  maintenance: 'Off the platform while damaged or under repair. Reversible, and deliberately not shown to the host as a refusal.',
}

// Document + physical-check states share one three-value vocabulary.
export const DOC_PILL = {
  verified: 'bg-green-100 text-green-700',
  pending: 'bg-amber-100 text-amber-700',
  rejected: 'bg-red-100 text-red-600',
  missing: 'bg-gray-100 text-gray-500',
}

export const DOC_LABEL = {
  verified: 'Verified',
  pending: 'Awaiting review',
  rejected: 'Rejected',
  missing: 'Not submitted',
}

// The four in-person checks, in the order a fleet manager performs them.
// `evidence: true` means the backend REFUSES to mark it verified without at
// least one photograph (see VehiclePhysicalVerification.EVIDENCE_REQUIRED) —
// the UI must say so up front rather than letting the save fail.
export const PHYSICAL_ITEMS = [
  { key: 'vehicle', label: 'Vehicle', evidence: true,
    hint: 'The car itself — condition, number plate, and that it matches the listing.' },
  { key: 'rc', label: 'RC card', evidence: false,
    hint: 'The physical RC card, checked against the scan on file.' },
  { key: 'pan', label: 'Host PAN', evidence: false,
    hint: "The host's physical PAN card, checked against the scan on file." },
  { key: 'host', label: 'Host present', evidence: false,
    hint: 'The host attended in person and matches their identity documents.' },
]

// Which decisions are valid FROM a given state. Mirrors what
// vehicleReviewService will actually accept, so the UI never offers a button
// the backend would refuse.
//
// `approve` is state-validity only — it is separately gated on `readyToApprove`
// from the review payload, because a pending vehicle with an unverified RC is a
// legitimate state in which Approve must not be pressable.
export const allowedActions = (status) => ({
  approve: status === 'pending',
  // Available from `approved` too: withdrawing an approval after something
  // comes to light is a different act from suspending, and says something
  // different to the host.
  reject: status === 'pending' || status === 'approved',
  suspend: status === 'approved',
  restore: status === 'suspended',
  maintenance: status === 'approved',
  endMaintenance: status === 'maintenance',
})

export const docState = (doc) => {
  if (!doc) return 'missing'
  return doc.status || 'pending'
}
