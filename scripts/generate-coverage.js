#!/usr/bin/env node
/**
 * Generate docs/COVERAGE.md and docs/badge-coverage.svg from the skills.
 *
 * Two reasons this exists rather than a hand-written table.
 *
 * First, a coverage claim is a number, and a number in a README that is not
 * generated is a number that is wrong within a month.
 *
 * Second, and more importantly: coverage of WCAG is a thing that is very easy to
 * overstate. This document therefore reports three different things separately —
 * which criteria a skill *addresses*, which have an *executable fixture*, and
 * which cannot be settled by a procedure at all. Collapsing those into one
 * "97% covered" number would be the dishonest version, and would also be the one
 * people quote back at you.
 *
 * `renderCoverage` and `renderBadge` are exported so verify-skills.js can
 * regenerate and compare, which is what stops the docs drifting from the skills.
 */

import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allSkills, criterionSortKey } from './generate-index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SPEC = JSON.parse(readFileSync(join(ROOT, 'verify', 'wcag-2.2.json'), 'utf8'));
const FIXTURES = join(ROOT, 'verify', 'fixtures');
const AXE = JSON.parse(readFileSync(join(ROOT, 'verify', 'axe-rules.json'), 'utf8')).rules;

/**
 * Criteria no design procedure can prevent, so their absence from the library is
 * correct rather than a backlog item. Grouped by why.
 */
const NOT_PROCEDURAL = {
  '1.2.6': 'sign language interpretation is a media-production task, not a markup one',
  '1.2.7': 'extended audio description is a media-production task',
  '1.2.8': 'media alternative for time-based media is a media-production task',
  '1.2.9': 'live audio-only alternatives are a scheduling and staffing decision',
  '1.4.7': 'low or no background audio is decided in the recording, not the code',
  '1.4.9': 'images of text (no exception) is a design-direction constraint',
  '2.2.3': 'no timing is an architectural decision that cannot be patched in later',
  '2.2.4': 'interruptions is a product decision about what may be sent at all',
  '2.2.5': 're-authenticating is a session-architecture decision',
  '2.4.9': 'link purpose (link only) conflicts with the in-context guidance the library gives',
  '3.1.3': 'unusual words needs a glossary, which is editorial',
  '3.1.4': 'abbreviations needs an editorial expansion policy',
  '3.1.5': 'reading level is a copywriting standard, not a markup change',
  '3.1.6': 'pronunciation needs per-word pronunciation markup and is rarely applicable',
  '3.3.5': 'help is a documentation and support-surface question',
  '3.3.6': 'error prevention (all) is a product-flow decision',
};

/** criterion id -> [skill dir] */
function addressedMap(skills) {
  const map = new Map();
  for (const s of skills) {
    for (const id of s.criteria) {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(s.dir);
    }
  }
  return map;
}

/** skill -> number of fixture cases */
function fixtureCounts() {
  const counts = new Map();
  if (!existsSync(FIXTURES)) return counts;
  for (const skill of readdirSync(FIXTURES)) {
    const dir = join(FIXTURES, skill);
    if (!existsSync(dir)) continue;
    const cases = readdirSync(dir).filter((c) => existsSync(join(dir, c, 'meta.json')));
    if (cases.length) counts.set(skill, cases.length);
  }
  return counts;
}

/**
 * Criterion ids asserted by at least one fixture.
 *
 * Derived from each fixture's `expectRules` and the axe snapshot — deliberately
 * NOT from the hand-written `criterion` field in `meta.json`. That field says what
 * a case is *about*, which is not the same as what its assertions measure, and
 * trusting it overcounted this number: both `accessible-forms` cases are about
 * SC 3.3.2, but axe's `label` rule carries only SC 4.1.2, so 3.3.2 was being
 * counted as executed when nothing executes it.
 *
 * A number that the person being counted can edit is not a measurement.
 */
function fixtureCriteria() {
  const ids = new Set();
  if (!existsSync(FIXTURES)) return ids;
  for (const skill of readdirSync(FIXTURES)) {
    const dir = join(FIXTURES, skill);
    if (!existsSync(dir)) continue;
    for (const c of readdirSync(dir)) {
      const metaPath = join(dir, c, 'meta.json');
      if (!existsSync(metaPath)) continue;
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      for (const ruleId of meta.expectRules ?? []) {
        for (const id of AXE[ruleId]?.criteria ?? []) ids.add(id);
      }
    }
  }
  return ids;
}

/**
 * Fixture cases whose rules carry no success criterion at all — i.e. they assert
 * best-practice rules only. These are not worthless (they still prove the fix
 * works and that nothing else broke), but they must not be counted as executing a
 * criterion.
 */
function fixtureCasesWithoutCriterion() {
  const out = [];
  if (!existsSync(FIXTURES)) return out;
  for (const skill of readdirSync(FIXTURES)) {
    const dir = join(FIXTURES, skill);
    if (!existsSync(dir)) continue;
    for (const c of readdirSync(dir)) {
      const metaPath = join(dir, c, 'meta.json');
      if (!existsSync(metaPath)) continue;
      const meta = JSON.parse(readFileSync(metaPath, 'utf8'));
      const ids = new Set();
      for (const ruleId of meta.expectRules ?? []) {
        for (const id of AXE[ruleId]?.criteria ?? []) ids.add(id);
      }
      if (ids.size === 0) out.push(`${skill}/${c}`);
    }
  }
  return out;
}

function sortIds(ids) {
  return [...ids].sort((a, b) => {
    const [a1, a2, a3] = criterionSortKey(a);
    const [b1, b2, b3] = criterionSortKey(b);
    return a1 - b1 || a2 - b2 || a3 - b3;
  });
}

function pct(n, d) {
  return d === 0 ? '0' : String(Math.round((n / d) * 100));
}

export function coverageStats() {
  const skills = allSkills();
  const addressed = addressedMap(skills);
  const all = sortIds(Object.keys(SPEC.criteria));
  const covered = all.filter((id) => addressed.has(id));
  const fixtures = fixtureCriteria();
  const counts = fixtureCounts();
  return {
    skills,
    addressed,
    all,
    covered,
    uncovered: all.filter((id) => !addressed.has(id)),
    fixtureIds: sortIds(fixtures),
    fixtureNoCriterion: fixtureCasesWithoutCriterion().sort(),
    fixtureCounts: counts,
    fixtureCases: [...counts.values()].reduce((a, b) => a + b, 0),
  };
}

export function renderCoverage() {
  const s = coverageStats();
  const byLevel = (level) => s.all.filter((id) => SPEC.criteria[id].level === level);
  const coveredAt = (level) => byLevel(level).filter((id) => s.addressed.has(id)).length;

  const row = (id) => {
    const c = SPEC.criteria[id];
    const who = s.addressed.has(id) ? s.addressed.get(id).map((d) => `\`${d}\``).join(', ') : '—';
    return `| SC ${id} | ${c.level} | ${c.name} | ${who} |`;
  };

  const notProcedural = s.uncovered.filter((id) => NOT_PROCEDURAL[id]);
  const backlog = s.uncovered.filter((id) => !NOT_PROCEDURAL[id]);

  return `# WCAG 2.2 coverage

**Generated by \`npm run coverage\`.** Do not edit by hand; CI fails if it is
stale. Source of truth: \`verify/wcag-2.2.json\` (the criteria) and each skill's
\`**Criteria:**\` line (which skill claims to address what).

## The honest summary

Three different things are counted separately here on purpose. Collapsing them
into a single percentage would give a bigger number and a false one.

| Measure | Value |
|---|---|
| Criteria in WCAG ${SPEC.version} | ${s.all.length} |
| Criteria **addressed by a skill** | **${s.covered.length}** (${pct(s.covered.length, s.all.length)}%) |
| Criteria **asserted by an executable fixture** | **${s.fixtureIds.length}** |
| Fixture cases | ${s.fixtureCases} across ${s.fixtureCounts.size} skills |
| Fixture cases that assert no criterion (best-practice rules only) | ${s.fixtureNoCriterion.length} |
| Skills | ${s.skills.length} |

### By conformance level

| Level | In WCAG 2.2 | Addressed | Coverage |
|---|---|---|---|
| A | ${byLevel('A').length} | ${coveredAt('A')} | ${pct(coveredAt('A'), byLevel('A').length)}% |
| AA | ${byLevel('AA').length} | ${coveredAt('AA')} | ${pct(coveredAt('AA'), byLevel('AA').length)}% |
| AAA | ${byLevel('AAA').length} | ${coveredAt('AAA')} | ${pct(coveredAt('AAA'), byLevel('AAA').length)}% |

Level A and AA are where conformance claims are made, so those are the columns
that matter. AAA criteria are included because several of them are what
practitioners actually need — SC 1.4.6 Contrast (Enhanced) and SC 2.5.5 Target
Size (Enhanced) especially.

**"Addressed" does not mean "verified".** It means a skill names the criterion
and gives a procedure for it. Only the fixture column is executed.

That fixture column is derived from the axe rules each case asserts, cross-checked
against \`verify/axe-rules.json\` — not from the \`criterion\` field in a fixture's
\`meta.json\`. That field records what the case is *about*, and it is not a
measurement: both \`accessible-forms\` cases are about SC 3.3.2, but axe's \`label\`
rule carries only SC 4.1.2, so nothing here executes 3.3.2. Counting the declared
field overcounted this number by one until it was fixed.

${s.fixtureNoCriterion.length} fixture cases assert best-practice rules only and therefore
execute no criterion at all${s.fixtureNoCriterion.length ? ` (${s.fixtureNoCriterion.map((c) => `\`${c}\``).join(', ')})` : ''}. They still prove that the
fix works and that nothing else broke — a best-practice violation in \`after.html\`
fails the suite — but they are not evidence about a success criterion, and counting
them as such would be the dishonest version.

## Full criterion list

| Criterion | Level | Name | Skills addressing it |
|---|---|---|---|
${s.all.map(row).join('\n')}

## Not covered, and why

${
  s.uncovered.length === 0
    ? 'Nothing — every criterion has a skill.'
    : `${s.uncovered.length} criteria have no skill. That is a deliberate state for the first group and a backlog for the second.\n\n**Correctly absent — no design procedure can satisfy these.** Each is decided somewhere other than the code, so a "skill" would be a list of things to ask a different team for:\n\n${notProcedural
        .map((id) => `- SC ${id} ${SPEC.criteria[id].name} — ${NOT_PROCEDURAL[id]}`)
        .join('\n')}\n\n**Backlog — procedural, and a skill should exist:**\n\n${
        backlog.length
          ? backlog.map((id) => `- SC ${id} ${SPEC.criteria[id].name} (${SPEC.criteria[id].level})`).join('\n')
          : '- None right now.'
      }`
}

## Fixtures

A fixture is a pair of real HTML documents. \`before.html\` must trip the axe
rules the fixture names; \`after.html\` must be **completely clean** — zero axe
violations of any impact, including best-practice rules. That second requirement
is what stops a skill from fixing one thing and quietly breaking another.

| Skill | Fixture cases |
|---|---|
${
  s.fixtureCounts.size
    ? [...s.fixtureCounts.entries()]
        .sort()
        .map(([skill, n]) => `| \`${skill}\` | ${n} |`)
        .join('\n')
    : '| _(none yet)_ | 0 |'
}

### What fixtures cannot prove

Automated checks establish a minority of real accessibility problems. axe-core
finds what is mechanically decidable in a rendered DOM: a missing accessible
name, a contrast ratio, a skipped heading level, a viewport that blocks zoom. It
cannot tell you that a custom widget is unusable from a keyboard, that a live
region announces the wrong thing, or that a dialog loses the user's place. Every
fixture here is chosen from the decidable subset, and every skill whose subject
is *not* decidable says so in its own \`## Verify\` section.

One concrete example of where the boundary sits, and the reason the
[\`accessible-forms\`](../skills/accessible-forms/) fixture is built the way it
is: axe-core's \`label\` rule accepts a non-empty \`placeholder\` as a label. A
placeholder-only field therefore passes a full automated audit and still fails
SC 3.3.2 the moment someone starts typing and the label vanishes. A clean axe
report is not evidence that a form is usable, and this library does not claim it
is.

---

*Generated from ${s.skills.length} skills: ${s.covered.length} of ${s.all.length} criteria addressed, ${s.fixtureIds.length} with executable fixtures, ${s.fixtureCases} fixture cases.*
`;
}

export function renderBadge() {
  const s = coverageStats();
  const p = s.covered.length / s.all.length;
  const colour = p >= 0.75 ? '#2ea44f' : p >= 0.5 ? '#d29922' : '#d1242f';
  const label = 'WCAG 2.2 addressed';
  const value = `${s.covered.length}/${s.all.length}`;
  const w = (str) => Math.round(str.length * 6.2) + 10;
  const lw = w(label);
  const vw = w(value);
  const total = lw + vw;
  const esc = (str) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="20" role="img" aria-label="${esc(label)}: ${esc(value)}">
  <title>${esc(label)}: ${esc(value)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#bbb" stop-opacity=".1"/>
    <stop offset="1" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r"><rect width="${total}" height="20" rx="3" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${lw}" height="20" fill="#555"/>
    <rect x="${lw}" width="${vw}" height="20" fill="${colour}"/>
    <rect width="${total}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="Verdana,Geneva,DejaVu Sans,sans-serif" font-size="11">
    <text x="${lw / 2}" y="15" fill="#010101" fill-opacity=".3">${esc(label)}</text>
    <text x="${lw / 2}" y="14">${esc(label)}</text>
    <text x="${lw + vw / 2}" y="15" fill="#010101" fill-opacity=".3">${esc(value)}</text>
    <text x="${lw + vw / 2}" y="14">${esc(value)}</text>
  </g>
</svg>
`;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'));

if (isMain) {
  writeFileSync(join(ROOT, 'docs', 'COVERAGE.md'), renderCoverage());
  writeFileSync(join(ROOT, 'docs', 'badge-coverage.svg'), renderBadge());
  const s = coverageStats();
  console.log(
    `  wrote docs/COVERAGE.md and docs/badge-coverage.svg — ` +
      `${s.covered.length}/${s.all.length} criteria addressed, ${s.fixtureIds.length} with fixtures`
  );
}
