const API_URL = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3030/v1';

// Uploaded images live in a private object-storage bucket, so linking straight
// to the bucket URL 403s. Route those through the API's image proxy
// (GET /image/:key), which streams the object using the server's credentials
// — same fix already applied on the web app (src/lib/media.js) and mobile app
// (photoUrl in src/utils/utils.js). Anything else (already-public URLs, local
// blob/data previews) is returned untouched.
// Object keys are UUIDs. Older uploads were stored as `<endpoint>/<bucket><uuid>`
// (the presigned URL has no trailing slash), so using the whole path as the key
// 404s. Prefer the trailing UUID when one is present.
// Keys are `<folder>/<uuid>` (kyc, pan, license, vehicle-rc, vehicle, profile,
// ride, misc) for anything uploaded since folders were introduced, and a bare
// `<uuid>` for everything before that — those rows were never migrated, so both
// forms must keep resolving. The folder list mirrors storageFolders.js on the
// backend; adding one there means adding it here, or the prefix gets stripped
// and the proxy 404s.
const STORAGE_FOLDERS = ['kyc', 'pan', 'license', 'vehicle-rc', 'vehicle', 'profile', 'ride', 'misc'];
const UUID_SRC = '[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}';
const FOLDER_RE = new RegExp(`(?:^|/)(${STORAGE_FOLDERS.join('|')})/(${UUID_SRC})`, 'i');
const UUID_RE = new RegExp(UUID_SRC, 'gi');

const extractKey = (path) => {
  const clean = String(path || '').replace(/^\/+/, '').split('?')[0];
  const foldered = clean.match(FOLDER_RE);
  if (foldered) return `${foldered[1].toLowerCase()}/${foldered[2]}`;
  const found = clean.match(UUID_RE);
  return found ? found[found.length - 1] : clean;
};

export function photoUrl(value) {
  if (!value || typeof value !== 'string') return '';

  // Local previews from a file picker.
  if (value.startsWith('blob:') || value.startsWith('data:')) return value;

  // Already pointing at this client's own API — nothing to do.
  if (value.startsWith(`${API_URL}/image/`)) return value;

  if (/^https?:\/\//i.test(value)) {
    try {
      const u = new URL(value);
      // Private S3-compatible bucket (Tigris / storageapi.dev), OR an
      // already-proxied `/image/:key` URL built against a DIFFERENT host —
      // the three clients (web/app/admin) each have their own fallback API
      // base URL and they don't all agree, and a value that came from a
      // server-side getter (e.g. User.profilePhoto) is proxied against
      // *the backend's* configured public URL, which may not match this
      // client's own. Either way, pull out the key and rebuild against our
      // own API_URL rather than trusting the host already in the string.
      if (u.hostname.endsWith('storageapi.dev') || u.pathname.includes('/image/')) {
        const key = extractKey(u.pathname);
        if (key) return `${API_URL}/image/${key}`;
      }
    } catch {
      return value;
    }
    return value;
  }

  // A bare object key (no scheme) — serve it through the proxy too.
  return `${API_URL}/image/${extractKey(value)}`;
}
