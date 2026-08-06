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

// ── SIGN-IN ──────────────────────────────────────────────────────────────────
// Email/password against the admin Firebase project, same as the legacy panel.
// Errors are translated: Firebase's codes are accurate and unreadable, and
// "auth/invalid-credential" in front of somebody who mistyped a password is not
// an error message, it is a shrug.
const SIGN_IN_ERRORS = {
  'auth/invalid-credential': 'That email and password do not match.',
  'auth/invalid-email': 'That does not look like an email address.',
  'auth/user-disabled': 'This account has been disabled.',
  'auth/user-not-found': 'That email and password do not match.',
  'auth/wrong-password': 'That email and password do not match.',
  'auth/too-many-requests': 'Too many attempts. Wait a moment and try again.',
  'auth/network-request-failed': 'Could not reach the sign-in service.',
  'auth/invalid-api-key': 'Sign-in is not configured for this site.',
};

export async function signIn(email, password) {
  const { signInWithEmailAndPassword } = await import('firebase/auth');
  try {
    const cred = await signInWithEmailAndPassword(ensure(), email, password);
    return cred.user;
  } catch (e) {
    const err = new Error(SIGN_IN_ERRORS[e.code] || 'Could not sign you in.');
    err.code = e.code;
    throw err;
  }
}

export async function sendPasswordReset(email) {
  const { sendPasswordResetEmail } = await import('firebase/auth');
  // Deliberately does NOT distinguish "no such account" — that turns the form
  // into a way to test which email addresses exist.
  await sendPasswordResetEmail(ensure(), email);
}

// ── SESSION EXPIRY ───────────────────────────────────────────────────────────
// One place decides what "your session ended" means, so every app behaves the
// same and no screen has to handle a 401 itself.
//
// Firebase refreshes an ID token on its own for an hour at a time; a session
// ends when the refresh itself fails — the account was disabled, the password
// changed, the token was revoked. `onIdTokenChanged` firing with null IS that
// signal, and it is why this listens there rather than inspecting expiry times.
const expiryHandlers = new Set();

export function onSessionExpired(handler) {
  expiryHandlers.add(handler);
  return () => expiryHandlers.delete(handler);
}

let expiryNotified = false;
export function notifySessionExpired() {
  // Once per session: a page firing five parallel requests would otherwise
  // announce the same expiry five times and race five redirects.
  if (expiryNotified) return;
  expiryNotified = true;
  expiryHandlers.forEach((h) => { try { h(); } catch { /* never let one handler stop the rest */ } });
}

export function startSessionWatch() {
  const { onIdTokenChanged } = require('firebase/auth');
  return onIdTokenChanged(ensure(), (user) => {
    if (user) expiryNotified = false;
    else notifySessionExpired();
  });
}
