#!/usr/bin/env node
/**
 * Every module navConfig declares must be shipped by at least one panel.
 *
 *   node scripts/checkPanelCoverage.mjs
 *
 * A module owned by no panel is a page that exists in the codebase and is
 * reachable from nowhere once the split happens — and the symptom is a *missing
 * menu entry*, which everyone will read as a permissions bug and debug in the
 * wrong place entirely. Cheap to check, expensive to find by hand.
 *
 * Also reports the reverse: a panel listing a module navConfig has never heard
 * of, which is almost always a typo or a module that was renamed.
 *
 * Read-only. Exits non-zero on a problem so CI can gate on it.
 */
import { readFileSync } from 'node:fs'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

// Parsed rather than imported: panels.js and navConfig.js are ES modules with
// JSX-adjacent imports (react-icons), which a plain node script cannot load.
// Regex is fragile in general, but these are two well-formed literals in files
// we control, and the alternative is a bundler step for a preflight check.
const navSrc = read('../src/app/_helpers/navConfig.js')
const panelSrc = read('../src/app/_helpers/panels.js')

const navModules = new Set(
  [...navSrc.matchAll(/module:\s*'([a-zA-Z]+)'/g)].map((m) => m[1]),
)

// Only the per-team panels declare module lists; root and admin use '*'.
const panelBlocks = [...panelSrc.matchAll(/modules:\s*\[([^\]]+)\]/g)]
const panelModules = new Set(
  panelBlocks.flatMap((b) => [...b[1].matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1])),
)
const hasWildcard = /modules:\s*'\*'/.test(panelSrc)

// `admin` ships '*' minus these. They are the panel's own administration
// screens and exist only on root — that exclusion IS the super-admin split, so
// a typo in it silently reunites the two panels and nothing else would notice.
const excluded = new Set(
  [...panelSrc.matchAll(/ROOT_ONLY_MODULES\s*=\s*\[([^\]]+)\]/g)]
    .flatMap((b) => [...b[1].matchAll(/'([a-zA-Z]+)'/g)].map((m) => m[1])),
)

console.log(`navConfig declares ${navModules.size} module(s).`)
console.log(`per-team panels list ${panelModules.size}.`)
if (hasWildcard) {
  console.log("root/admin use '*', so nothing is orphaned until those are narrowed.")
}
console.log(`root-only (excluded from admin): ${[...excluded].join(', ') || 'none'}\n`)

// Root-only modules are SUPPOSED to be on no per-team panel — that is what
// makes them root-only. Counting them as orphans would leave a permanent
// warning that everyone learns to scroll past, which is how a real orphan
// arriving later gets missed.
const orphaned = [...navModules].filter((m) => !panelModules.has(m) && !excluded.has(m))
const unknown = [...panelModules].filter((m) => !navModules.has(m))

let failed = false

if (orphaned.length) {
  // Not fatal while '*' panels exist — but it IS what will break the day a team
  // moves to its own host, so say so now rather than then.
  console.log('Modules in navConfig but in no per-team panel:')
  for (const m of orphaned) console.log(`  · ${m}`)
  console.log('  → fine today (root/admin ship everything), but these pages')
  console.log('    would be unreachable on a per-team panel. Add them, or confirm')
  console.log('    no team needs them.\n')
}

// A root-only module that navConfig has never heard of means the exclusion is
// doing nothing and those screens are shipping on admin.cocarr.com — the exact
// failure the split exists to prevent, and it is invisible: the pages simply
// keep working everywhere, which is what they did before.
const badExclusions = [...excluded].filter((m) => !navModules.has(m))
if (badExclusions.length) {
  failed = true
  console.log('Root-only modules unknown to navConfig:')
  for (const m of badExclusions) console.log(`  · ${m}  ← excluding nothing; these screens ship on admin`)
  console.log()
}

if (unknown.length) {
  failed = true
  console.log('Modules listed by a panel but unknown to navConfig:')
  for (const m of unknown) console.log(`  · ${m}  ← typo, or a renamed module`)
  console.log()
}

if (failed) {
  console.log('FAILED — a panel references a module that does not exist.')
  process.exit(1)
}
console.log(orphaned.length ? 'OK, with the coverage note above.' : 'OK — every module is covered.')
