#!/usr/bin/env node
/**
 * Snapshot axe-core's rule list into verify/axe-rules.json.
 *
 * Why snapshot rather than read axe-core at runtime: the content gate
 * (`npm test`) runs in a job with no dependencies installed at all, and it must
 * still be able to check that every rule this repository maps is a real axe
 * rule. Committing the snapshot keeps that check dependency-free, and the
 * fixtures job regenerates and diffs this file, so a stale snapshot fails CI.
 *
 * The interesting part is `criteria`. axe tags each rule with the success
 * criteria it tests — `wcag143` means SC 1.4.3 — so the rule-to-criterion map is
 * derived from the tool rather than asserted by us. That is what makes
 * `a11y-skills audit` able to say which criterion a finding is about without
 * anybody typing it out.
 *
 *   npm run axe-rules
 */

import { writeFileSync } from 'node:fs';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const require = createRequire(import.meta.url);
const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const axe = require('axe-core');
const SPEC = JSON.parse(readFileSync(join(ROOT, 'verify', 'wcag-2.2.json'), 'utf8'));

/** `wcag143` -> "1.4.3", `wcag2410` -> "2.4.10", `wcag2a` -> null (a level). */
function criterionFromTag(tag) {
  const m = /^wcag(\d)(\d)(\d+)$/.exec(tag);
  return m ? `${m[1]}.${m[2]}.${m[3]}` : null;
}

const rules = {};
const unknownCriteria = new Set();

for (const rule of axe.getRules().sort((a, b) => a.ruleId.localeCompare(b.ruleId))) {
  const criteria = [...new Set(rule.tags.map(criterionFromTag).filter(Boolean))].sort((a, b) => {
    const A = a.split('.').map(Number);
    const B = b.split('.').map(Number);
    return A[0] - B[0] || A[1] - B[1] || A[2] - B[2];
  });

  // A criterion axe knows about and we do not would mean our ground truth is
  // incomplete, so it is surfaced rather than dropped silently.
  for (const id of criteria) {
    if (!SPEC.criteria[id]) unknownCriteria.add(id);
  }

  rules[rule.ruleId] = {
    help: rule.help,
    url: rule.helpUrl.replace(/\/\d+\.\d+\//, '/'), // drop the version from the URL
    criteria,
    bestPractice: rule.tags.includes('best-practice'),
    // A rule axe ships disabled will never appear in a default scan, so saying
    // "axe would have caught that" about one is a false claim.
    enabledByDefault: rule.enabled !== false,
  };
}

const out = {
  source: 'axe-core',
  version: axe.version,
  generatedBy: 'scripts/generate-axe-rules.js',
  note:
    'Snapshot of axe-core\'s rules and the WCAG criteria each tests. ' +
    'Regenerate with `npm run axe-rules`.',
  unknownCriteria: [...unknownCriteria],
  rules,
};

writeFileSync(join(ROOT, 'verify', 'axe-rules.json'), JSON.stringify(out, null, 2) + '\n');

const withCriteria = Object.values(rules).filter((r) => r.criteria.length).length;
console.log(
  `  wrote verify/axe-rules.json — axe ${axe.version}, ${Object.keys(rules).length} rules, ` +
    `${withCriteria} mapped to WCAG criteria`
);
if (unknownCriteria.size) {
  console.log(
    `  note: axe references ${unknownCriteria.size} criteria not in wcag-2.2.json: ` +
      [...unknownCriteria].join(', ')
  );
}
