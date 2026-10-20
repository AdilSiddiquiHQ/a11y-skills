#!/usr/bin/env node
/**
 * Pin the README to reality.
 *
 * The README shows the output of `npm test`. Sample output in a README is the
 * documentation that rots first and most quietly: it keeps looking correct long
 * after it stopped being true, and it is the first thing a visitor reads.
 *
 * So this runs the verifier for real and asserts that the README contains what
 * it actually printed — every per-skill line and the summary.
 *
 * Learned the hard way in a sibling project: a rename silently left three stale
 * version strings in README demo blocks, because the summary line was pinned
 * and the header above it was not.
 */

import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { coverageStats } from '../scripts/generate-coverage.js';
import { ruleMapStats } from '../scripts/generate-rule-docs.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const README = readFileSync(join(ROOT, 'README.md'), 'utf8');

const normalize = (s) => s.replace(/\s+/g, ' ').trim();

const run = spawnSync(process.execPath, [join(HERE, 'verify-skills.js')], {
  cwd: ROOT,
  encoding: 'utf8',
});
const output = run.stdout ?? '';

if (run.status !== 0) {
  console.error('verify-skills.js failed, so the README cannot be checked against it');
  console.error(run.stderr || '');
  process.exit(1);
}

const problems = [];
const readme = normalize(README);

// Every per-skill line the verifier printed must appear in the README.
const skillLines = output.split('\n').filter((l) => /^\s+ok\s+\S/.test(l));
if (skillLines.length === 0) {
  console.error('verifier printed no per-skill lines; nothing to pin');
  process.exit(1);
}
for (const line of skillLines) {
  if (!readme.includes(normalize(line))) {
    problems.push(`README is stale: it does not show "${normalize(line)}"`);
  }
}

// And the summary, which is the line people actually read.
const summary = output.split('\n').find((l) => /skills verified against WCAG/.test(l));
if (!summary) {
  console.error('verifier printed no summary line; nothing to pin');
  process.exit(1);
}
if (!readme.includes(normalize(summary))) {
  problems.push(`README is stale: it does not show "${normalize(summary)}"`);
}

// The skills count in the badge must match the directory.
const count = skillLines.length;
const badge = `skills-${count}-purple`;
if (!README.includes(badge)) {
  problems.push(`README badge says a different skill count (expected: ${badge})`);
}

// The coverage numbers are the loudest claim in the README, so they get pinned
// too. Without this the headline "52 of 86" keeps looking right for months after
// a skill changes what it covers.
const s = coverageStats();
const spec = JSON.parse(
  readFileSync(join(ROOT, 'verify', 'wcag-2.2.json'), 'utf8')
);
const level = (id) => spec.criteria[id].level;
const pct = (n, d) => String(Math.round((n / d) * 100));
const atLevel = (name) => s.all.filter((id) => level(id) === name);
const coveredAt = (name) => atLevel(name).filter((id) => s.addressed.has(id)).length;

const claims = [
  [`${s.covered.length} of ${s.all.length}`, 'criteria addressed'],
  [`${s.fixtureCases} executable fixtures`, 'fixture count'],
  [`executable%20fixtures-${s.fixtureCases}-orange`, 'fixture badge'],
  [`${pct(coveredAt('A'), atLevel('A').length)}% of Level A`, 'Level A coverage'],
  [`${pct(coveredAt('AA'), atLevel('AA').length)}% of Level AA`, 'Level AA coverage'],
  [`| Criteria **asserted by an executable fixture** (the fix is run) | ${s.fixtureIds.length} |`, 'fixture coverage row'],
];

// The rule map is the other loud claim in the README: "99 of 105 axe rules map to
// the skill that fixes them". It is derived from the axe snapshot and the curated
// map, so it can be pinned the same way the coverage numbers are.
const rs = ruleMapStats();
claims.push([
  `${rs.mapped.length} of ${Object.keys(rs.axe.rules).length} axe rules`,
  'rule-map coverage',
]);

for (const [needle, what] of claims) {
  // Compared against whitespace-normalised text so that a claim spanning a line
  // break in the README still counts as present.
  if (!normalize(README).includes(normalize(needle))) {
    problems.push(`README is stale: it does not state "${needle}" (${what})`);
  }
}

if (problems.length > 0) {
  for (const p of problems) console.error(`  FAIL ${p}`);
  console.error('');
  console.error(`  ${problems.length} problem(s) — the README no longer matches the tool output`);
  console.error('');
  process.exit(1);
}

console.log(`  ok  README shows the real output of ${count} skills`);
