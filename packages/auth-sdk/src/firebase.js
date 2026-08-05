import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged, signOut as fbSignOut } from 'firebase/auth';

// THE ONLY PLACE IN THE FRONTEND THAT TOUCHES FIREBASE.
//
// The charter's rule is "never communicate with Firebase directly after login;
// always use the Auth SDK". Three copies of this logic existed before (axios.js,
// workspaceAxios.js, useAdminProfile.js), each initialising the app defensively
// in case it loaded first — which is what a shared package is for.
//
// ── WAIT FOR THE SESSION TO BE RESTORED BEFORE SENDING ANYTHING ──
// `auth.currentUser` is NULL until Firebase has finished restoring the session
// from storage, which it does ASYNCHRONOUSLY after page load. Reading it
// directly means any request fired in that window goes out with no
// Authorization header and comes back 401.
//
// That window is easy to land in, because redux-persist rehydrates
// SYNCHRONOUSLY from localStorage: the app believes it is signed in and starts
// fetching a beat before Firebase agrees. This is not a hypothetical — it hit
// `GET /admin/me` on every cold load of the old admin app.
//
// So: resolve once `onAuthStateChanged` has fired at least once, then answer
// instantly forever after. A genuinely signed-out user resolves to null and the
// request goes unauthenticated, which is correct — the endpoint should refuse
// it rather than the client pretending to be signed in.

let app = null;
let auth = null;
let authReady = null;

export function initAuth(config) {
  if (app) return app;
  app = getApps().length ? getApps()[0] : initializeApp(config || {
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  });
  auth = getAuth(app);
  return app;
}

function ensure() {
  if (!auth) initAuth();
  return auth;
}

export function whenAuthReady() {
  const a = ensure();
  if (a.currentUser) return Promise.resolve(a.currentUser);
  if (!authReady) {
    authReady = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(a, (user) => { unsubscribe(); resolve(user); });
    });
  }
  return authReady;
}

// The bearer token for an outgoing request, or null when signed out.
//
// `forceRefresh` defaults to FALSE, unlike the old admin client which passed
// true on every single request. Forcing a refresh per call means a network
// round-trip to Google before each API call — Firebase already refreshes a
// token that is within five minutes of expiry, so the flag bought nothing but
// latency on every request in the app.
export async function getIdToken({ forceRefresh = false } = {}) {
  const user = await whenAuthReady();
  return user ? user.getIdToken(forceRefresh) : null;
}

export function onAuthChange(cb) {
  return onAuthStateChanged(ensure(), cb);
}

export function currentUser() {
  return ensure().currentUser;
}

export function signOut() {
  return fbSignOut(ensure());
}
