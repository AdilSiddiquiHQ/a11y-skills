#!/usr/bin/env node
/**
 * Content verifier.
 *
 * A skills library is prose, and prose rots: a criterion number gets
 * mistyped, a skill gets renamed and the index is not updated, a section
 * quietly disappears. None of that shows up in a Markdown renderer.
 *
 * This checks the claims the repository makes about its own content:
 *
 *   1. every skill is well formed (frontmatter, required sections, an example)
 *   2. every WCAG success criterion a skill declares or mentions exists in
 *      WCAG 2.2, is named as the spec names it, and is not one of the obsolete
 *      ones
 *   3. the generated files (the skills index and the coverage report) are
 *      byte-identical to what the generators produce now, so the documents
 *      cannot drift from the skills they describe
 *
 * What this does NOT do is check that a skill's advice is correct. That is what
 * verify/fixtures/ is for — a real browser running axe-core over a failing and a
 * fixed document. This file catches the class of error that is mechanical and
 * embarrassing; it is the floor, not the ceiling.
 *
 *   node verify/verify-skills.js [--json]
 */

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { renderIndex } from '../scripts/generate-index.js';
import { renderCoverage, renderBadge } from '../scripts/generate-coverage.js';
import { renderRuleMap, ruleMapProblems } from '../scripts/generate-rule-docs.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SKILLS_DIR = join(ROOT, 'skills');
const INDEX = join(SKILLS_DIR, 'README.md');

const spec = JSON.parse(readFileSync(join(HERE, 'wcag-2.2.json'), 'utf8'));
const CRITERIA = spec.criteria;
const OBSOLETE = spec.obsolete;

const REQUIRED_SECTIONS = ['When to use', 'Procedure', 'Verify', 'Failure modes'];

/** Minimal frontmatter reader: `key: value`, `key: "value"`, `key: [a, b]`. */
function parseFrontmatter(text) {
  if (!text.startsWith('---\n')) return { data: null, body: text };
  const end = text.indexOf('\n---', 3);
  if (end === -1) return { data: null, body: text };
  const raw = text.slice(4, end);
  const body = text.slice(end + 4);
  const data = {};
  for (const line of raw.split('\n')) {
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const colon = line.indexOf(':');
    if (colon === -1) continue;
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (value.startsWith('[') && value.endsWith(']')) {
      value = value
        .slice(1, -1)
        .split(',')
        .map((v) => v.trim().replace(/^["']|["']$/g, ''))
        .filter(Boolean);
    } else {
      value = value.replace(/^["']|["']$/g, '');
    }
    data[key] = value;
  }
  return { data, body };
}

function sectionsOf(body) {
  return [...body.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
}

/**
 * Fail if a generated file on disk is not byte-identical to what the generator
 * produces now. Reports the first differing line rather than dumping both files,
 * because the useful information is "which part changed".
 */
function checkGenerated(label, path, render, command, problems) {
  if (!existsSync(path)) {
    problems.push(`${label}: missing — run \`${command}\``);
    return;
  }
  const actual = readFileSync(path, 'utf8');
  const expected = render();
  if (actual === expected) return;
  const a = actual.split('\n');
  const b = expected.split('\n');
  const i = a.findIndex((line, n) => line !== b[n]);
  problems.push(
    `${label}: is out of date (first difference at line ${i + 1}) — run \`${command}\``
  );
}

/** Every `SC 1.4.3` / `success criterion 1.4.3` style reference in prose. */
function citedInProse(text) {
  const found = new Set();
  for (const m of text.matchAll(/\b(?:SC|success criterion)\s*(\d+\.\d+\.\d+)\b/gi)) {
    found.add(m[1]);
  }
  return [...found];
}

function main() {
  const problems = [];
  const notes = [];
  const json = process.argv.includes('--json');

  if (!existsSync(SKILLS_DIR)) {
    console.error(`no skills directory at ${SKILLS_DIR}`);
    process.exit(3);
  }

  const dirs = readdirSync(SKILLS_DIR)
    .filter((name) => statSync(join(SKILLS_DIR, name)).isDirectory())
    .sort();

  if (dirs.length === 0) {
    console.error('skills/ contains no skills');
    process.exit(3);
  }

  for (const dir of dirs) {
    const path = join(SKILLS_DIR, dir, 'SKILL.md');
    const where = `skills/${dir}/SKILL.md`;

    if (!existsSync(path)) {
      problems.push(`${where}: missing SKILL.md`);
      continue;
    }
    const text = readFileSync(path, 'utf8');
    const { data, body } = parseFrontmatter(text);

    if (!data) {
      problems.push(`${where}: missing or malformed frontmatter (must open with ---)`);
      continue;
    }

    // 1. identity
    if (!data.name) problems.push(`${where}: frontmatter has no 'name'`);
    else if (data.name !== dir) {
      problems.push(`${where}: frontmatter name '${data.name}' does not match directory '${dir}'`);
    } else if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(data.name)) {
      problems.push(`${where}: name '${data.name}' is not kebab-case`);
    }

    // 2. description must say when to use it — that is what an agent matches on
    if (!data.description) {
      problems.push(`${where}: frontmatter has no 'description'`);
    } else if (!/^Use when\b/i.test(data.description)) {
      problems.push(
        `${where}: description must start with "Use when" — this is the text an agent ` +
          `matches a request against, so it must state the trigger, not the category`
      );
    } else if (data.description.length < 60) {
      problems.push(`${where}: description is too short to match on (${data.description.length} chars)`);
    }

    // 3. the criteria it claims to address.
    //
    //    Declared on a "**Criteria:**" line in the body, deliberately NOT in
    //    frontmatter: `wcag` is not part of the Agent Skills frontmatter, and a
    //    non-standard key there is an interop liability — SkillSleuth flags it
    //    as SG-META-009 and it is right to. Keeping the frontmatter to `name`
    //    and `description` means these skills load in strict parsers.
    let declaredCount = 0;
    const declaredLine = /^\*\*Criteria:\*\*\s*(.+)$/m.exec(body);
    if (!declaredLine) {
      problems.push(`${where}: missing a "**Criteria:** SC x.y.z <name>, …" line under the title`);
    } else {
      const parts = declaredLine[1].split(/,\s*(?=SC\s)/);
      for (const part of parts) {
        const m = /^SC\s+(\d+\.\d+\.\d+)\s+(.+?)\s*$/.exec(part.trim());
        if (!m) {
          problems.push(`${where}: cannot parse "${part.trim()}" — expected "SC 1.2.3 Criterion Name"`);
          continue;
        }
        const [, id, name] = m;
        declaredCount++;
        if (OBSOLETE[id]) {
          problems.push(`${where}: declares SC ${id} (${name}), which was removed in WCAG 2.2`);
        } else if (!CRITERIA[id]) {
          problems.push(`${where}: declares SC ${id} (${name}), which is not a WCAG 2.2 criterion`);
        } else if (CRITERIA[id].name !== name) {
          // Catches both typos and spec renames. A skills library that cites
          // "Contrast (Minimum)" as "Minimum Contrast" is wrong in a way no
          // reader will notice and no linter will catch.
          problems.push(
            `${where}: SC ${id} is named "${CRITERIA[id].name}" in WCAG 2.2, not "${name}"`
          );
        }
      }
      if (declaredCount === 0) {
        problems.push(`${where}: the Criteria line declares no success criteria`);
      }
    }

    // 4. required sections
    const sections = sectionsOf(body);
    for (const want of REQUIRED_SECTIONS) {
      if (!sections.some((s) => s.toLowerCase() === want.toLowerCase())) {
        problems.push(`${where}: missing required section "## ${want}"`);
      }
    }

    // 5. it must show, not only tell
    if (!/```/.test(body)) {
      problems.push(`${where}: contains no fenced code block — a skill must show the pattern`);
    }

    // 6. criteria referenced in prose must be real
    for (const id of citedInProse(body)) {
      if (OBSOLETE[id]) {
        problems.push(`${where}: references SC ${id}, which was removed in WCAG 2.2`);
      } else if (!CRITERIA[id]) {
        problems.push(`${where}: references SC ${id}, which is not a WCAG 2.2 criterion`);
      }
    }

    notes.push(`ok  ${dir.padEnd(28)} ${String(declaredCount).padStart(2)} criteria, ${sections.length} sections`);
  }

  // 7. the axe rule -> skill map must agree with three other files.
  //
  //    This is the check that makes the mapping worth anything. Anyone can write
  //    "color-contrast -> fix-color-contrast"; verifying that the rule exists in
  //    the axe snapshot AND that the skill declares SC 1.4.3 turns a claim into a
  //    derivable fact. See scripts/generate-rule-docs.js.
  problems.push(...ruleMapProblems());

  // 8. generated files must be exactly current.
  //
  //    Comparing whole files rather than checking "does the index mention each
  //    skill" is deliberate: the weaker check passes when a skill is renamed in
  //    the index but not in the directory, which is the actual way a curated
  //    list rots. Regenerating and diffing cannot pass while wrong.
  checkGenerated('skills/README.md', INDEX, renderIndex, 'npm run index', problems);
  checkGenerated(
    'docs/COVERAGE.md',
    join(ROOT, 'docs', 'COVERAGE.md'),
    renderCoverage,
    'npm run coverage',
    problems
  );
  checkGenerated(
    'docs/badge-coverage.svg',
    join(ROOT, 'docs', 'badge-coverage.svg'),
    renderBadge,
    'npm run coverage',
    problems
  );
  checkGenerated(
    'docs/RULE-MAP.md',
    join(ROOT, 'docs', 'RULE-MAP.md'),
    renderRuleMap,
    'npm run rule-docs',
    problems
  );

  const stale = [];
  if (problems.some((p) => p.includes('is out of date'))) stale.push('generated files');
  if (stale.length) {
    notes.push(`    run \`npm run build-docs\` to regenerate stale output`);
  }

  if (json) {
    console.log(JSON.stringify({ skills: dirs.length, problems, notes }, null, 2));
  } else {
    for (const n of notes) console.log(`  ${n}`);
    console.log('');
    if (problems.length === 0) {
      console.log(`  ${dirs.length} skills verified against WCAG ${spec.version} (${Object.keys(CRITERIA).length} criteria)`);
      console.log('');
    } else {
      for (const p of problems) console.error(`  FAIL ${p}`);
      console.error('');
      console.error(`  ${problems.length} problem(s)`);
      console.error('');
    }
  }

  process.exit(problems.length === 0 ? 0 : 1);
}

main();
