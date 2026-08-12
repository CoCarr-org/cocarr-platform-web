// Turns any axios failure into something a person can act on.
//
// WHY THIS EXISTS. Call sites reached into the error by hand, each guessing a
// different shape:
//
//   ErrorToast(error.response.data.name)           // hosts list
//   ErrorToast(error.response.data.error.message)  // vehicles list
//
// The platform serves THREE different error shapes, and neither guess covers
// them:
//
//   { error: 'Some message' }             // core-api controllers
//   { error: { code, message } }          // the API gateway
//   { message: '...' }                    // express-validator / misc
//
// So `data.name` was always undefined, and `data.error.message` is undefined
// whenever `error` is a plain string — and reading `.message` off a string does
// not even throw, it just yields undefined. Both produced an EMPTY toast: the
// request failed, the list stayed empty, and the screen said nothing at all.
// "The list is not loading" with no error visible is that bug, not a data
// problem — which is exactly how it wasted debugging time.
//
// A network failure is worse still: `error.response` is undefined, so
// `error.response.data` THROWS inside the catch block, replacing the real
// failure with a TypeError that points at the handler instead of the request.
export function apiErrorMessage(error, fallback = 'Something went wrong. Please try again.') {
  // No response at all — DNS, CORS, timeout, offline. Say so; "failed to fetch"
  // sends people looking for a bug in the endpoint that was never reached.
  if (error && error.request && !error.response) {
    return 'Could not reach the server. Check your connection and try again.';
  }

  const data = error?.response?.data;
  const candidates = [
    data?.error?.message,   // gateway  { error: { code, message } }
    data?.error,            // core-api { error: 'message' }
    data?.message,
    data?.name,             // what the old call sites reached for
    error?.message,
  ];

  const found = candidates.find((v) => typeof v === 'string' && v.trim());
  if (found) return found;

  // Nothing usable in the body. A bare status still beats an empty toast,
  // because 403 and 500 send you to completely different places.
  const status = error?.response?.status;
  return status ? `${fallback} (HTTP ${status})` : fallback;
}
