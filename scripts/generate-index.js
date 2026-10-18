#!/usr/bin/env node
/**
 * Generate skills/README.md.
 *
 * The index used to be hand-maintained, which is exactly the kind of thing that
 * rots: a skill gets renamed, the index keeps pointing at the old name, and
 * nothing notices because both render fine. So it is generated, and
 * verify-skills.js compares the file on disk against this function's output and
 * fails if they differ — the same trick used for the rule reference in a
 * sibling project.
 *
 * Both tables are derived from the skills themselves, including the
 * criterion-to-skill mapping, so the mapping cannot disagree with the skills.
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ROOT = join(HERE, '..');
export const SKILLS_DIR = join(ROOT, 'skills');
const SPEC = JSON.parse(readFileSync(join(ROOT, 'verify', 'wcag-2.2.json'), 'utf8'));

/** Read one skill's identity and the criteria it declares. */
export function readSkill(dir) {
  const text = readFileSync(join(SKILLS_DIR, dir, 'SKILL.md'), 'utf8');
  const description = (/^description:\s*(.+)$/m.exec(text)?.[1] ?? '').trim();
  const criteriaLine = (/^\*\*Criteria:\*\*\s*(.+)$/m.exec(text)?.[1] ?? '').trim();

  const criteria = criteriaLine
    .split(/,\s*(?=SC\s)/)
    .map((part) => /^SC\s+(\d+\.\d+\.\d+)/.exec(part.trim())?.[1])
    .filter(Boolean);

  return { dir, description, criteria };
}

export function allSkills() {
  return readdirSync(SKILLS_DIR)
    .filter((name) => {
      try {
        return readFileSync(join(SKILLS_DIR, name, 'SKILL.md'), 'utf8').length > 0;
      } catch {
        return false;
      }
    })
    .sort()
    .map(readSkill);
}

/** "1.4.3" -> 1, 4, 3 for numeric ordering. */
export function criterionSortKey(id) {
  return id.split('.').map(Number);
}

export function renderIndex() {
  const skills = allSkills();

  const byTask = skills
    .map((s) => {
      const trigger = s.description.replace(/^Use when\s*/i, '');
      return `| [\`${s.dir}\`](./${s.dir}/) | ${capitalise(trigger)} |`;
    })
    .join('\n');

  // Criterion -> skills, derived, so it cannot disagree with the skills.
  const map = new Map();
  for (const s of skills) {
    for (const id of s.criteria) {
      if (!map.has(id)) map.set(id, []);
      map.get(id).push(s.dir);
    }
  }
  const covered = [...map.keys()].sort((a, b) => {
    const [a1, a2, a3] = criterionSortKey(a);
    const [b1, b2, b3] = criterionSortKey(b);
    return a1 - b1 || a2 - b2 || a3 - b3;
  });

  const byCriterion = covered
    .map((id) => {
      const name = SPEC.criteria[id]?.name ?? '(unknown)';
      const who = map.get(id).map((d) => `\`${d}\``).join(', ');
      return `| SC ${id} ${name} | ${who} |`;
    })
    .join('\n');

  return `# Skills

${skills.length} skills. Each is a procedure with a named failure-mode list, and
each declares the WCAG 2.2 success criteria it addresses. Every citation is
checked against the spec in CI, so a skill cannot cite a criterion that does not
exist, or name one differently from the spec.

**This file is generated.** Edit a skill, then run \`npm run index\`. CI fails if
it is stale.

## By task

| Skill | Reach for it when |
|---|---|
${byTask}

## By success criterion

Which skill to read when a report names a criterion. ${covered.length} of the ${Object.keys(SPEC.criteria).length} criteria in WCAG ${SPEC.version} are covered.

| Criterion | Skills |
|---|---|
${byCriterion}

The remaining criteria are not covered because they cannot be meaningfully
addressed by a procedure — see [../docs/COVERAGE.md](../docs/COVERAGE.md) for
the generated picture and an honest account of what is and is not covered.

## Adding a skill

See [../docs/AUTHORING.md](../docs/AUTHORING.md) for the specification and
[../CONTRIBUTING.md](../CONTRIBUTING.md) for the workflow.
\`npm test\` rejects a skill that is malformed, cites a criterion wrongly, or is
missing from this index.
`;
}

function capitalise(s) {
  if (!s) return s;
  return s[0].toUpperCase() + s.slice(1);
}

const isMain =
  process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'));

if (isMain) {
  const out = renderIndex();
  const target = join(SKILLS_DIR, 'README.md');
  writeFileSync(target, out);
  const skills = allSkills();
  const covered = new Set(skills.flatMap((s) => s.criteria)).size;
  console.log(`  wrote skills/README.md — ${skills.length} skills, ${covered} criteria mapped`);
}
