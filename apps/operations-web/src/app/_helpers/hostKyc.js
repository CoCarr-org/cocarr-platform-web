// A HOST'S KYC IS AADHAAR + PAN. THE DRIVING LICENCE IS NOT PART OF IT.
//
// A host lists a car; they do not drive it. The licence is what lets somebody
// BOOK — it belongs to the rider side of the same person's profile and is
// reviewed there. Showing it on the host screens invited an admin to chase a
// document that blocks nothing about hosting, and made a host with a perfectly
// complete KYC look two-thirds done.
//
// What the two documents actually gate:
//   Aadhaar — identity. Nothing about the host is trusted without it.
//   PAN     — payouts. It is a tax requirement for paying them, so a missing PAN
//             is why money is stuck, which is the question ops arrives with.
//
// ONE HELPER, TWO PAYLOAD SHAPES. The hosts LIST resolves each page's document
// state into flat `verification.kycStatus` / `panStatus`, while the host DETAIL
// returns the full projection with `verification.documents.{kyc,pan}`. Both are
// deliberate (the list cannot afford the full per-host projection), so this
// reads either rather than making each screen know which one it holds.
//
// `null`/`missing` means NEVER SUBMITTED and stays distinct from `pending`,
// which means somebody owes a review. Collapsing them tells an admin to chase a
// host who has already sent everything.
const statusOf = (verification, key, legacyFlag) => {
  const v = verification || {};
  const fromDocument = v.documents?.[key]?.status;
  if (fromDocument) return fromDocument;
  const fromList = v[`${key}Status`];
  if (fromList) return fromList;
  // Only for a payload predating the document tables.
  if (v[legacyFlag]) return 'verified';
  return 'missing';
};

const WORDING = {
  verified: null, // nothing outstanding
  pending: 'awaiting review',
  rejected: 'rejected',
  missing: 'not submitted',
};

// { done, tone, label, detail, aadhaar, pan }
//
// `done` is the whole question this screen exists to answer, so it is computed
// once here and never re-derived by a component from the two statuses — that is
// how two screens end up disagreeing about the same host.
export const hostKycState = (verification) => {
  const aadhaar = statusOf(verification, 'kyc', 'kycVerified');
  const pan = statusOf(verification, 'pan', 'panVerified');
  const done = aadhaar === 'verified' && pan === 'verified';

  if (done) {
    return { done, tone: 'good', label: 'KYC complete', detail: 'Aadhaar and PAN both verified.', aadhaar, pan };
  }

  // Name what is outstanding and in which way. "KYC pending" alone sends an
  // admin into the documents to find out which one and why.
  const outstanding = [
    WORDING[aadhaar] ? `Aadhaar ${WORDING[aadhaar]}` : null,
    WORDING[pan] ? `PAN ${WORDING[pan]}` : null,
  ].filter(Boolean);

  // A rejection is a decision that has been made; everything else is work still
  // owed. Different colours, because they call for different actions.
  const rejected = aadhaar === 'rejected' || pan === 'rejected';
  return {
    done,
    tone: rejected ? 'bad' : 'warn',
    label: rejected ? 'KYC rejected' : 'KYC incomplete',
    detail: `${outstanding.join(' · ')}.`,
    aadhaar,
    pan,
  };
};

export default hostKycState;
