#!/usr/bin/env node
/**
 * Generate docs/RULE-MAP.md from the axe snapshot and verify/rule-map.json.
 *
 * The point of this file is that the mapping is checkable. A hand-written table
 * that says "when axe reports color-contrast, read fix-color-contrast" is worth
 * very little, because it can say anything and nobody will notice. So every entry
 * is validated against three things that are not the table:
 *
 *   - the rule id must exist in the committed axe-core snapshot
 *   - the skill must exist
 *   - the skill must declare at least one of the criteria that axe tags the rule
 *     with, which is the check that actually catches a wrong answer
 *
 * `ruleMapProblems` is exported so verify-skills.js runs the same checks, and
 * `renderRuleMap` is exported so it can regenerate and diff the document.
 *
 *   npm run rule-docs
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { allSkills, criterionSortKey } from './generate-index.js';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..');

const SPEC_PATH = join(ROOT, 'verify', 'wcag-2.2.json');
const AXE_PATH = join(ROOT, 'verify', 'axe-rules.json');
const MAP_PATH = join(ROOT, 'verify', 'rule-map.json');

function load() {
  return {
    spec: JSON.parse(readFileSync(SPEC_PATH, 'utf8')),
    axe: JSON.parse(readFileSync(AXE_PATH, 'utf8')),
    map: JSON.parse(readFileSync(MAP_PATH, 'utf8')),
    skills: allSkills(),
  };
}

const sortCriteria = (ids) =>
  [...ids].sort((a, b) => {
    const A = criterionSortKey(a);
    const B = criterionSortKey(b);
    return A[0] - B[0] || A[1] - B[1] || A[2] - B[2];
  });

/**
 * Cross-check the map against the snapshot and the skills. Returns a list of
 * human-readable problems; empty means the mapping is internally consistent.
 */
export function ruleMapProblems() {
  const { spec, axe, map, skills } = load();
  const problems = [];
  const skillByName = new Map(skills.map((s) => [s.dir, s]));

  const entries = Object.entries(map.rules ?? {});
  if (entries.length === 0) problems.push('verify/rule-map.json: maps no rules');

  for (const [rule, entry] of entries) {
    const where = `verify/rule-map.json: '${rule}'`;
    const axeRule = axe.rules[rule];
    if (!axeRule) {
      problems.push(`${where} is not an axe rule in verify/axe-rules.json`);
      continue;
    }
    if (!entry.skill) {
      problems.push(`${where} names no skill`);
      continue;
    }
    const skill = skillByName.get(entry.skill);
    if (!skill) {
      problems.push(`${where} points at '${entry.skill}', which is not a skill`);
      continue;
    }
    if (!entry.why) problems.push(`${where} has no 'why' - the field is what the CLI prints`);

    // The substantive check. A rule with no criteria of its own is a best-practice
    // rule, and any skill may claim it; a rule with criteria must be claimed by a
    // skill that addresses one of them, or the mapping is a guess.
    const known = axeRule.criteria.filter((id) => spec.criteria[id]);
    if (known.length > 0 && !known.some((id) => skill.criteria.includes(id))) {
      problems.push(
        `${where} maps to '${entry.skill}', which declares none of SC ${known.join(', ')} ` +
          `- axe tags this rule with ${known.join(', ')} and the skill covers ${
            skill.criteria.join(', ') || 'nothing'
          }`
      );
    }
  }

  return problems;
}

/** Rules that exist in the snapshot but have no entry in the map. */
function gaps() {
  const { axe, map } = load();
  return Object.keys(axe.rules)
    .filter((rule) => !map.rules?.[rule])
    .sort();
}

/**
 * Why each remaining gap is a gap. A list of unmapped rules reads as unfinished
 * work, and four of these six are not work at all — so the reason is part of the
 * output rather than something a reader has to reconstruct.
 */
const GAP_NOTES = {
  'duplicate-id':
    'tagged with SC 4.1.1, which WCAG 2.2 removed; axe ships it disabled. Duplicate ids are hygiene, not a conformance failure',
  'duplicate-id-active': 'same removed SC 4.1.1 tag, and disabled by default',
  'frame-tested':
    'an axe advisory that it could not test inside a frame, not a finding about the page',
  'hidden-content':
    'an axe advisory that it skipped hidden content; a limitation of the scan, not a defect',
  'identical-links-same-purpose':
    'SC 2.4.9 is AAA and needs judgement about each link in context — the library deliberately prefers the SC 2.4.4 guidance in `accessible-name`',
  'meta-refresh-no-exceptions':
    'SC 2.2.4 and SC 3.2.5 are AAA product decisions about what the page may do unprompted; there is no markup procedure to write',
};

export function ruleMapStats() {
  const { axe, map, skills } = load();
  const mapped = Object.keys(map.rules ?? {});
  const bySkill = new Map();
  for (const [rule, entry] of Object.entries(map.rules ?? {})) {
    if (!bySkill.has(entry.skill)) bySkill.set(entry.skill, []);
    bySkill.get(entry.skill).push(rule);
  }
  const criteriaCovered = new Set();
  for (const rule of mapped) {
    for (const id of axe.rules[rule]?.criteria ?? []) criteriaCovered.add(id);
  }
  return {
    axe,
    map,
    skills,
    mapped: mapped.sort(),
    gaps: gaps(),
    bySkill,
    criteriaCovered,
    disabledMapped: mapped.filter((r) => !axe.rules[r]?.enabledByDefault),
  };
}

export function renderRuleMap() {
  const { axe, map, skills } = ruleMapStats();
  const spec = JSON.parse(readFileSync(SPEC_PATH, 'utf8'));
  const total = Object.keys(axe.rules).length;
  const withCriteria = Object.values(axe.rules).filter((r) => r.criteria.length).length;

  const criteriaCell = (rule) => {
    const ids = axe.rules[rule].criteria;
    if (ids.length === 0) return axe.rules[rule].bestPractice ? '_best practice_' : '—';
    return ids
      .map((id) => (spec.criteria[id] ? `SC ${id} (${spec.criteria[id].level})` : `SC ${id} _(removed)_`))
      .join(', ');
  };

  const ruleRow = (rule) => {
    const e = map.rules[rule];
    const skill = skills.find((s) => s.dir === e.skill);
    const flag = axe.rules[rule].enabledByDefault ? '' : ' ⚠️';
    return `| \`${rule}\`${flag} | ${criteriaCell(rule)} | [\`${e.skill}\`](../skills/${e.skill}/) | ${e.why} |`;
  };

  const gapCells = (rule) => {
    const r = axe.rules[rule];
    const ids = r.criteria;
    const cell = ids.length
      ? ids
          .map((id) => (spec.criteria[id] ? `SC ${id} (${spec.criteria[id].level})` : `SC ${id} _(removed)_`))
          .join(', ')
      : r.bestPractice
        ? '_best practice_'
        : '—';
    return `\`${rule}\` | ${cell} | ${r.help}`;
  };

  const removedCriterion = Object.entries(axe.rules)
    .filter(([, r]) => r.criteria.some((id) => !spec.criteria[id]))
    .map(([rule, r]) => ({ rule, removed: r.criteria.filter((id) => !spec.criteria[id]) }));

  const bySkill = [...ruleMapStats().bySkill.entries()]
    .sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))
    .map(([skill, rules]) => {
      const def = skills.find((s) => s.dir === skill);
      const crit = sortCriteria(new Set(def?.criteria ?? [])).filter((id) =>
        rules.some((r) => axe.rules[r].criteria.includes(id))
      );
      return `| [\`${skill}\`](../skills/${skill}/) | ${rules.length} | ${crit.join(', ') || '—'} |`;
    });

  const disabled = ruleMapStats().disabledMapped;

  return `# axe rule → skill

**Generated by \`npm run rule-docs\`.** Do not edit by hand; CI fails if it is stale.
Source of truth: \`verify/axe-rules.json\` (a snapshot of axe-core ${axe.version}),
\`verify/rule-map.json\` (the curated mapping) and each skill's \`**Criteria:**\` line.

## What this is for

An automated audit tells you *what* is broken. It does not tell you *what to do about
it*. This table is the join: given an axe rule id, which skill in this library
contains the procedure for it.

\`\`\`bash
npx github:AdilSiddiquiHQ/a11y-skills audit ./dist/index.html
npx github:AdilSiddiquiHQ/a11y-skills rules color-contrast
\`\`\`

## How it is checked

Deriving this by joining "rule → criteria" with "criteria → skills" produces a pile
of suggestions — one CRUD rule maps to thirteen skills — so the primary skill per
rule is a judgement call, recorded in \`verify/rule-map.json\`. Judgement is exactly
the thing to be suspicious of, so every entry is validated against data it cannot
edit:

1. every rule id must be a real rule in the axe-core snapshot;
2. every named skill must exist;
3. **the skill must declare at least one of the criteria axe tags the rule with.**

Check 3 is the one that bites. Mapping \`color-contrast\` to a skill that does not
address SC 1.4.3 fails CI, because the skill's own criteria line is the ground truth
and the map is not.

## Summary

| Measure | Value |
|---|---|
| Rules in axe-core ${axe.version} | ${total} |
| Rules registered against a WCAG criterion | ${withCriteria} |
| Rules mapped to a skill | **${ruleMapStats().mapped.length}** |
| Rules with no skill yet | ${ruleMapStats().gaps.length} |
| WCAG criteria reachable through the map | ${ruleMapStats().criteriaCovered.size} |

⚠️ marks a rule axe ships **disabled by default**. A finding from one of these means
somebody enabled it deliberately — axe will not report it out of the box.

## Rule → skill

| axe rule | WCAG criteria | Read | Why |
|---|---|---|---|
${ruleMapStats().mapped.map(ruleRow).join('\n')}

## Rules with no skill yet

Six rules have no skill behind them, and it is worth being precise about why,
because "six gaps" sounds like unfinished work and four of them are not work at all.

| axe rule | WCAG criteria | What it checks | Why there is no skill |
|---|---|---|---|
${ruleMapStats()
  .gaps.map((rule) => `| ${gapCells(rule)} | ${GAP_NOTES[rule] ?? 'not yet written'} |`)
  .join('\n')}

None of these is a WCAG failure a designer can act on. The two that cite a real
criterion both cite an AAA one whose fix depends on context, and the other four are
either tooling advisories or a criterion that no longer exists.

## What the map covers, by skill

Which part of an audit each skill is responsible for. A skill with a large number
here is the first thing to read after a scan.

| Skill | Rules | Criteria |
|---|---|---|
${bySkill.join('\n')}

## Two details worth knowing

**axe still tags two rules with a deleted criterion.** ${removedCriterion
    .map((r) => `\`${r.rule}\``)
    .join(' and ')} carry ${[
    ...new Set(removedCriterion.flatMap((r) => r.removed)),
  ].join(', ')}, which WCAG 2.2 removed. Both are disabled by default, so they never
appear in a default scan — but if a tool reports a failure against that criterion, it
is citing something that no longer exists, and treating it as a conformance failure
is a mistake.

**axe checks less than people assume.** ${disabled.length} of the rules above are
off unless you enable them, including \`target-size\` (SC 2.5.8) — one of the two
success criteria added by WCAG 2.2 itself. A green axe run is not evidence that
target sizes pass. The fixtures in \`verify/fixtures/\` enable rules like this
explicitly, which is the only way to test them.

The disabled rules this map registers: ${disabled.map((r) => `\`${r}\``).join(', ')}.
---

*Generated from axe-core ${axe.version} and ${skills.length} skills: ${
    ruleMapStats().mapped.length
  } rules mapped, ${ruleMapStats().gaps.length} gaps, ${
    ruleMapStats().criteriaCovered.size
  } criteria reachable.*
`;
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'));

if (isMain) {
  const problems = ruleMapProblems();
  if (problems.length) {
    for (const p of problems) console.error(`  FAIL ${p}`);
    console.error(`\n  ${problems.length} problem(s) in verify/rule-map.json`);
    process.exit(1);
  }
  writeFileSync(join(ROOT, 'docs', 'RULE-MAP.md'), renderRuleMap());
  const s = ruleMapStats();
  console.log(
    `  wrote docs/RULE-MAP.md — ${s.mapped.length} rules mapped to a skill, ` +
      `${s.gaps.length} gaps, ${s.criteriaCovered.size} criteria reachable`
  );
}
