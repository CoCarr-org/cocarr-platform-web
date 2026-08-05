// API client for the Workspace service (cocarr-workspace-api).
//
// Separate base URL from the core API's `axios.js`, but the SAME Firebase admin
// session and the same "wait for Firebase before sending" discipline — the two
// services verify tokens from the same admin project. See axios.js for the full
// rationale on why `auth.currentUser` must not be read synchronously on mount.
import axios from 'axios';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, onAuthStateChanged } from 'firebase/auth';

const instance = axios.create({
  baseURL: process.env.NEXT_PUBLIC_WORKSPACE_API_URL
    ? process.env.NEXT_PUBLIC_WORKSPACE_API_URL
    : 'http://localhost:3040/v1',
});

// Reuse the already-initialised Firebase app (axios.js initialises it first on
// most pages); initialise defensively if this module loads first.
const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
      authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
    });
const auth = getAuth(app);

let authReady = null;
const whenAuthReady = () => {
  if (auth.currentUser) return Promise.resolve(auth.currentUser);
  if (!authReady) {
    authReady = new Promise((resolve) => {
      const unsubscribe = onAuthStateChanged(auth, (user) => { unsubscribe(); resolve(user); });
    });
  }
  return authReady;
};

instance.interceptors.request.use(
  async (config) => {
    const user = await whenAuthReady();
    if (user) {
      const token = await user.getIdToken();
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

export default instance;
