// axiosConfig.js
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';
import { getApps } from 'firebase/app';
import { PANEL_KEY } from './panels';

// Direct to the API, or through this app's own server-side gateway.
//
// The gateway (`src/app/api/panel/[...path]/route.js`) exists so the panel key
// never ships in the browser bundle — see the long note there. It is opt-in:
// without NEXT_PUBLIC_PANEL_GATEWAY the client talks to the API exactly as it
// always has, because it puts an extra hop in front of every admin request and
// that should be a decision rather than a side effect of deploying.
const USE_GATEWAY = process.env.NEXT_PUBLIC_PANEL_GATEWAY === 'true';

const instance = axios.create({
  baseURL: USE_GATEWAY
    ? '/api/panel'
    : (process.env.NEXT_PUBLIC_BASE_URL ? process.env.NEXT_PUBLIC_BASE_URL : 'http://localhost:3030/v1')
});


let app;
if (!getApps().length) {
  app = initializeApp({
    apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
    authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
    projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
    storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
    appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  });
} else {
  app = getApps()[0];
}
const auth = getAuth(app);

// ── Wait for Firebase to restore the session before sending anything ──
//
// `auth.currentUser` is NULL until Firebase has finished restoring the session
// from storage, which it does asynchronously after page load. Reading it
// directly means any request fired during that window goes out with no
// Authorization header and comes back
// `401 Unauthorized - Missing Authorization Header`.
//
// That window is easy to land in, because redux-persist rehydrates
// SYNCHRONOUSLY from localStorage: the app believes it is signed in and starts
// fetching a beat before Firebase agrees. `GET /admin/me` on the dashboard
// layout hit this every cold load.
//
// So: resolve once `onAuthStateChanged` has fired at least once, then answer
// instantly forever after. A genuinely signed-out user resolves to null and the
// request goes unauthenticated, which is correct — the endpoint should refuse
// it, rather than the client silently pretending to be signed in.
let authReady = null;
const whenAuthReady = () => {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authReady) {
    authReady = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => {
        unsubscribe();
        resolve(user);
      });
    });
  }
  return authReady;
};

instance.interceptors.request.use(
  async (config) => {
    // Which panel this build is. The backend infers it from `Origin` when this
    // is absent, which works for honest browsers and not at all for curl. Sent
    // on every request because the binding is checked on every request: one
    // token is valid at every panel, so a check made once at sign-in would be
    // bypassed for the rest of the session.
    //
    // In this direct mode it is NOT a secret — it ships in the bundle, so it is
    // readable and replayable. It identifies a SITE, not a person, and it stops
    // someone pointing a browser at the wrong panel. Turn the gateway on for a
    // key that curl cannot produce.
    //
    // Skipped behind the gateway, where the server adds the real key. Sending a
    // browser-held one too would be strictly worse than sending none: the
    // backend treats a non-matching key as a HARD DENY, so a stale
    // NEXT_PUBLIC_PANEL_KEY left from before the cutover would break every
    // request rather than be ignored.
    if (!USE_GATEWAY && PANEL_KEY) config.headers['x-cocarr-panel-key'] = PANEL_KEY;

    // Attach Firebase token to the request
    const user = await whenAuthReady();

    if (user) {
      const token = await user.getIdToken(true); // Force refresh the token
      config.headers.Authorization = `${token}`;
    }

    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

export default instance;