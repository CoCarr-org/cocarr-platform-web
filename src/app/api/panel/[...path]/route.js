// Server-side gateway to the API, so the panel key never reaches the browser.
//
// ── The problem this exists to fix ──
// `NEXT_PUBLIC_PANEL_KEY` is inlined into the client bundle at build time. That
// makes it readable by anyone who can open the site, and therefore replayable by
// `curl` — which is the exact caller the key was supposed to distinguish from a
// browser. As a client-side header it is a speed bump: it stops someone pointing
// their browser at the wrong panel, and stops nothing else.
//
// A value can only be unforgeable if the attacker never holds it. So the browser
// stops talking to the API directly and talks to its own origin instead; this
// handler adds the key from `PANEL_KEY` — deliberately WITHOUT the NEXT_PUBLIC_
// prefix, so Next will not inline it and it exists only in the server process.
//
// What that buys: a request arriving at the API bearing a valid root panel key
// must have passed through the root deployment. Someone with a stolen admin
// token and curl can still call the API — they simply cannot claim to be a panel
// they are not, which is the whole claim the key makes.
//
// ── OFF by default ──
// Set `NEXT_PUBLIC_PANEL_GATEWAY=true` (client, to change the axios base URL)
// and `PANEL_KEY` (server). Without both, `authAxios` talks to the API directly
// exactly as before. This is an extra hop in the hot path of every admin
// request, so it should be a decision, not a side effect of deploying.
//
// ── What is deliberately NOT forwarded ──
// Cookies and `Origin`. Forwarding `Origin` would hand the backend a second,
// weaker signal about which panel this is, sourced from the browser — precisely
// what this handler exists to stop relying on. The key is the only claim made.

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

const TARGET = (process.env.PANEL_GATEWAY_TARGET || process.env.NEXT_PUBLIC_BASE_URL || '')
  .replace(/\/$/, '')
const PANEL_KEY = process.env.PANEL_KEY || ''

// Headers that describe THIS hop and must not be copied onto the next one.
// `host` in particular would send the API the panel's own hostname and break
// virtual-host routing; `content-length` goes stale the moment a body is
// re-encoded.
const HOP_BY_HOP = new Set([
  'host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade',
  'proxy-authorization', 'proxy-authenticate', 'te', 'trailer', 'content-length',
])

async function forward(request, context) {
  if (!TARGET) {
    return Response.json(
      { error: 'Panel gateway is not configured: set PANEL_GATEWAY_TARGET or NEXT_PUBLIC_BASE_URL.' },
      { status: 500 },
    )
  }

  const { path } = await context.params
  const incoming = new URL(request.url)
  const url = new URL(`${TARGET}/${(path || []).join('/')}`)
  incoming.searchParams.forEach((value, key) => url.searchParams.append(key, value))

  const headers = new Headers()
  // Only what the API needs. An allowlist rather than a copy-and-delete, so a
  // header added by a future browser or CDN cannot ride along unnoticed.
  for (const name of ['authorization', 'content-type', 'accept']) {
    const value = request.headers.get(name)
    if (value && !HOP_BY_HOP.has(name)) headers.set(name, value)
  }
  if (PANEL_KEY) headers.set('x-cocarr-panel-key', PANEL_KEY)

  const hasBody = !['GET', 'HEAD'].includes(request.method)
  const body = hasBody ? await request.arrayBuffer() : undefined

  let upstream
  try {
    upstream = await fetch(url, {
      method: request.method, headers, body, cache: 'no-store', redirect: 'manual',
    })
  } catch (error) {
    // The API being unreachable is a 502 from here, not a 500: the gateway
    // worked, the thing behind it did not, and conflating them sends whoever
    // debugs this to the wrong process.
    console.error('[panel-gateway] upstream failed:', error?.message)
    return Response.json({ error: 'The API could not be reached.' }, { status: 502 })
  }

  const out = new Headers()
  const type = upstream.headers.get('content-type')
  if (type) out.set('content-type', type)
  // Nothing through this gateway is cacheable: every response is scoped to one
  // admin's permissions, and a shared cache in front of it would serve one
  // team's data to another.
  out.set('cache-control', 'no-store')

  return new Response(upstream.body, { status: upstream.status, headers: out })
}

export const GET = forward
export const POST = forward
export const PUT = forward
export const PATCH = forward
export const DELETE = forward
