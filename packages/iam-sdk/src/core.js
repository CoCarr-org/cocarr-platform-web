// PURE LOGIC OVER THE IAM NAVIGATION PAYLOAD.
//
// Deliberately free of React so it can be tested directly, and so the rules live
// in one readable file rather than being spread through hooks.
//
// The payload comes from `GET /v1/platform/me/navigation` and is ALREADY
// FILTERED by the server to what this principal may see. That is the whole
// design: the client renders what it is given instead of deciding anything.
// The old `permissions.js` had the same discipline for the same reason — "a
// second implementation of the rules here would drift, and the drift is
// invisible in both directions. Hide something the server allows and the panel
// looks broken; show something it denies and every click is a 403."
//
// WHAT THIS REPLACES, and why none of it comes back:
//   navConfig.js   a hardcoded 362-line nav. Now server data: a new module
//                  reaches the sidebar by being seeded, with no frontend deploy.
//   panels.js      build-time panel splitting via NEXT_PUBLIC_PANEL. Now runtime
//                  permissions — a build no longer decides who sees what.
//   permissions.js a module x action grid. Now action-based permission KEYS,
//                  per the charter: never check roles in the UI, always check
//                  permissions.

/** The shape used before anything has loaded. `ready:false` is not "no access". */
export function emptyNavigation() {
  return {
    ready: false,
    superAdmin: false,
    permissions: [],
    permissionSets: [],
    roles: [],
    routes: [],
    featureFlags: {},
    products: [],
  };
}

export function fromPayload(payload) {
  if (!payload) return emptyNavigation();
  return {
    ready: true,
    superAdmin: Boolean(payload.superAdmin),
    permissions: payload.permissions || [],
    permissionSets: payload.permissionSets || [],
    roles: payload.roles || [],
    routes: payload.routes || [],
    featureFlags: payload.featureFlags || {},
    products: payload.products || [],
  };
}

/** `<product>.<module>.<action>` — the one key format the platform uses. */
export function permissionKey(product, module, action) {
  return `${product}.${module}.${action}`;
}

/**
 * Does this principal hold a permission?
 *
 * A super admin holds everything without listing anything, mirroring the
 * server's short-circuit — so the two cannot disagree about that case.
 */
export function can(nav, permission) {
  if (!nav || !nav.ready) return false;
  if (nav.superAdmin) return true;
  return nav.permissions.includes(permission);
}

/** Every action held on a module, e.g. ['read','update'] — what buttons gate on. */
export function actionsFor(nav, moduleKey) {
  const node = findModule(nav, moduleKey);
  return node ? node.actions : [];
}

export function findModule(nav, moduleKey) {
  if (!nav || !nav.ready) return null;
  for (const product of nav.products) {
    for (const portal of product.portals) {
      const found = portal.modules.find((m) => m.key === moduleKey);
      if (found) return found;
    }
  }
  return null;
}

/** The module or sub-module a route belongs to, with its product/portal context. */
export function findByRoute(nav, route) {
  if (!nav || !nav.ready) return null;
  const clean = normaliseRoute(route);
  for (const product of nav.products) {
    for (const portal of product.portals) {
      for (const module of portal.modules) {
        if (normaliseRoute(module.route) === clean) {
          return { product, portal, module, subModule: null };
        }
        const sub = module.subModules.find((s) => normaliseRoute(s.route) === clean);
        if (sub) return { product, portal, module, subModule: sub };
      }
    }
  }
  return null;
}

export function normaliseRoute(route) {
  return (route || '').replace(/\/+$/, '') || '/dashboard';
}

/**
 * May this principal open this exact route?
 *
 *   true   yes
 *   false  no — refuse it, and say so
 *   null   UNKNOWN, do not block
 *
 * The three-way answer is load-bearing and is carried over from the old
 * `useCanOpenRoute`. `null` covers two different things:
 *
 *   - the payload has not arrived yet (render a skeleton, do NOT flash an
 *     empty menu or a refusal at somebody who has full access), and
 *   - the route is not a nav route at all — dynamic pages like
 *     `/dashboard/users/[id]` are reached FROM a permitted list page and are
 *     never in the navigation tree.
 *
 * Collapsing `null` into `false` locks people out of every detail page in the
 * app; collapsing it into `true` makes the guard decorative. Callers must
 * handle three cases.
 */
export function canOpenRoute(nav, route) {
  if (!nav || !nav.ready) return null;
  if (nav.superAdmin) return true;
  const clean = normaliseRoute(route);
  if (nav.routes.some((r) => normaliseRoute(r) === clean)) return true;
  // Known to the tree but absent from `routes` means the server filtered it out.
  if (findByRoute(nav, clean)) return false;
  return null;
}

/**
 * The sidebar model: one group per module, its screens beneath it.
 *
 * Grouping is by MODULE rather than by product, because that is the shape the
 * existing sidebar has and the one people navigate by. Products are carried on
 * each group so an app can filter to its own — which is how one payload serves
 * three separately deployed apps without a per-app nav config.
 *
 * A module with exactly ONE screen renders as a plain link, not an expandable
 * group containing a single item, which is just friction. That rule came from
 * the admin app's Dashboard group and holds generally.
 */
export function buildSidebar(nav, { product } = {}) {
  if (!nav || !nav.ready) return [];
  const groups = [];
  for (const p of nav.products) {
    if (product && p.key !== product) continue;
    for (const portal of p.portals) {
      for (const module of portal.modules) {
        const pages = module.subModules
          .filter((s) => s.route)
          .map((s) => ({ key: s.key, label: s.name, route: s.route, icon: s.icon }));

        // THE MODULE'S OWN ROUTE IS A PAGE TOO, and it has to be added
        // explicitly. A module can hold a module-level permission AND have
        // sub-modules that do not include its landing route — the five IAM
        // modules are exactly this shape, and so is any module whose overview
        // screen was never seeded as a sub-module. Listing only the children
        // then drops the landing page from the nav entirely, leaving it
        // reachable only by typing the URL.
        //
        // Guarded on `actions`, because a module the principal cannot act on at
        // all must not contribute a link they would only be refused at.
        const alreadyListed = module.route
          && pages.some((p) => normaliseRoute(p.route) === normaliseRoute(module.route));
        if (module.route && !alreadyListed && module.actions.length > 0) {
          pages.unshift({
            key: module.key, label: module.name, route: module.route, icon: module.icon,
          });
        }
        if (pages.length === 0) continue;
        groups.push({
          key: module.key,
          label: module.name,
          icon: module.icon,
          product: p.key,
          portal: portal.key,
          actions: module.actions,
          single: pages.length === 1,
          pages,
        });
      }
    }
  }
  return groups;
}

/** The first route this principal can actually land on — where "/" should go. */
export function defaultRoute(nav) {
  const groups = buildSidebar(nav);
  return groups.length ? groups[0].pages[0].route : null;
}

export function isFeatureEnabled(nav, key) {
  return Boolean(nav && nav.featureFlags && nav.featureFlags[key]);
}
