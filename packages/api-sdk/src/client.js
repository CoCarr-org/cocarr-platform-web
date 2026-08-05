import axios from 'axios';
import { getIdToken } from '@cocarr/auth-sdk';
import { baseUrlFor } from './urls';

// GATEWAY-FIRST HTTP CLIENTS.
//
// The charter makes api.cocarr.com the only public API, so a client names the
// SERVICE it wants and gets the gateway prefix for it:
//
//   core      -> /v1/core        (the car-sharing business API)
//   workspace -> /v1/workspace   (employees, HR, organization)
//   platform  -> /v1/platform    (IAM: taxonomy, roles, navigation)
//   auth      -> /v1/auth        (identity: sessions, devices, password links)
//   notify    -> /v1/notify
//
// This replaces two hand-rolled instances that pointed straight at individual
// services (`axios.js` -> core on :3030, `workspaceAxios.js` -> workspace on
// :3040). Every service reachable directly is a service whose rate limiting,
// CORS and correlation ids are optional — going through the gateway is what
// makes those hold.
//
// DIRECT MODE remains, because the services still accept a bearer token
// themselves and some environments have no gateway yet. It is opt-in per
// service via NEXT_PUBLIC_<SERVICE>_API_URL, and it is a deliberate downgrade,
// not a default.


const clients = new Map();

export function createClient(service) {
  if (clients.has(service)) return clients.get(service);

  const instance = axios.create({ baseURL: baseUrlFor(service) });

  instance.interceptors.request.use(async (config) => {
    // Waits for Firebase to restore the session — see auth-sdk. Without this,
    // anything fired during the restore window goes out unauthenticated.
    const token = await getIdToken();
    // `Bearer ` prefix, which the old client omitted. Every service accepts a
    // bare token for backwards compatibility, but the gateway and the services
    // both document Bearer and it is what any new middleware will expect.
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
  });

  // One error shape for every caller. The platform contract is
  // { error: { code, message } }; core-api's older routes answer { error: "..." }.
  // Normalising here means a screen does not have to know which service it hit
  // to show a sensible message.
  instance.interceptors.response.use(
    (r) => r,
    (error) => {
      const data = error.response?.data;
      const normalised = typeof data?.error === 'string'
        ? { code: data.code || 'ERROR', message: data.error }
        : data?.error || { code: 'NETWORK_ERROR', message: error.message };
      error.platform = { status: error.response?.status || 0, ...normalised };
      return Promise.reject(error);
    },
  );

  clients.set(service, instance);
  return instance;
}

export const coreApi = () => createClient('core');
export const workspaceApi = () => createClient('workspace');
export const platformApi = () => createClient('platform');
export const identityApi = () => createClient('auth');
export const notifyApi = () => createClient('notify');
