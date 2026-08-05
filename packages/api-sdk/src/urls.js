// PURE SERVICE-URL RESOLUTION. No axios, no Firebase, no React.
//
// Split out of client.js deliberately: `client.js` imports @cocarr/auth-sdk,
// which imports firebase. Anything that needs only "where does the core service
// live?" — formatting an image proxy URL, for instance — would otherwise drag
// the entire auth stack into the bundle, and could not run outside a browser at
// all. Import from '@cocarr/api-sdk/urls' when you want the address and nothing
// else.

const PREFIX = {
  core: '/v1/core',
  workspace: '/v1/workspace',
  platform: '/v1/platform',
  auth: '/v1/auth',
  notify: '/v1/notify',
};

const directUrl = (service) => ({
  core: process.env.NEXT_PUBLIC_CORE_API_URL,
  workspace: process.env.NEXT_PUBLIC_WORKSPACE_API_URL,
  platform: process.env.NEXT_PUBLIC_PLATFORM_API_URL,
  auth: process.env.NEXT_PUBLIC_IDENTITY_API_URL,
  notify: process.env.NEXT_PUBLIC_NOTIFY_API_URL,
}[service]);

export const SERVICES = Object.keys(PREFIX);

// Gateway-first: one public API, so rate limiting, CORS and correlation ids are
// not optional. A direct per-service URL is an opt-in downgrade for an
// environment that has no gateway yet — never the default.
export function baseUrlFor(service) {
  if (!PREFIX[service]) throw new Error(`Unknown service '${service}'`);
  const gateway = process.env.NEXT_PUBLIC_GATEWAY_URL;
  if (gateway) return `${gateway.replace(/\/$/, '')}${PREFIX[service]}`;
  const direct = directUrl(service);
  if (direct) return direct.replace(/\/$/, '');
  throw new Error(
    `No base URL for '${service}': set NEXT_PUBLIC_GATEWAY_URL, or its direct URL for local development.`,
  );
}
