#!/usr/bin/env node
/**
 * a11y-skills — list, search, inspect, audit and install the skills in this repository.
 *
 * Deliberately zero-dependency and offline. It reads files and copies them. It
 * never reaches the network, never installs anything, and never executes
 * anything it finds inside a skill.
 *
 *   npx github:AdilSiddiquiHQ/a11y-skills list
 *   npx github:AdilSiddiquiHQ/a11y-skills search "focus ring"
 *   npx github:AdilSiddiquiHQ/a11y-skills criteria 2.4.7
 *   npx github:AdilSiddiquiHQ/a11y-skills rules color-contrast
 *   npx github:AdilSiddiquiHQ/a11y-skills audit ./dist/index.html
 *   npx github:AdilSiddiquiHQ/a11y-skills install
 *
 * `audit` is the one command that is not self-contained: running axe-core needs
 * axe-core and a browser. It says so and stops, rather than installing anything.
 * The mapping from an axe rule to the skill that fixes it — the part that is
 * actually this library's contribution — needs neither, and works offline.
 *
 * `--json` works on list, search, info, criteria, rules and audit so an agent or
 * another tool can drive the library without screen-scraping the human output.
 */

import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';
import { findChromium } from '../lib/chromium.js';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SKILLS_DIR = join(ROOT, 'skills');
const SPEC_PATH = join(ROOT, 'verify', 'wcag-2.2.json');
const AXE_RULES_PATH = join(ROOT, 'verify', 'axe-rules.json');
const RULE_MAP_PATH = join(ROOT, 'verify', 'rule-map.json');

const pkg = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8'));
const VERSION = pkg.version;

const SPEC = existsSync(SPEC_PATH) ? JSON.parse(readFileSync(SPEC_PATH, 'utf8')) : { criteria: {} };

// The two places agents actually look. Claude Code and OpenCode are both
// common; install into both only when asked, never silently.
const DEFAULT_DESTS = {
  claude: join(homedir(), '.claude', 'skills'),
  opencode: join(homedir(), '.config', 'opencode', 'skills'),
};

/**
 * Colour, following the conventions everyone already expects: `--no-color`,
 * then `NO_COLOR`, then `FORCE_COLOR`, then a TTY check. Respecting NO_COLOR
 * matters because most of this CLI's output gets piped into a file or another
 * tool, and escape sequences in a log are noise.
 */
function colourEnabled() {
  if (process.argv.includes('--no-color')) return false;
  if (process.env.NO_COLOR) return false;
  if (process.env.FORCE_COLOR && process.env.FORCE_COLOR !== '0') return true;
  return Boolean(process.stdout.isTTY);
}

const GREEN = colourEnabled();
const C = GREEN
  ? { bold: '\x1b[1m', dim: '\x1b[2m', green: '\x1b[32m', reset: '\x1b[0m' }
  : { bold: '', dim: '', green: '', reset: '' };

const jsonMode = () => process.argv.includes('--json');

function usage() {
  console.log(`
${C.bold}a11y-skills${C.reset} ${C.dim}v${VERSION}${C.reset} — WCAG 2.2 skills for coding agents

${C.bold}USAGE${C.reset}
  a11y-skills list                       show every skill and what it is for
  a11y-skills search <words>             find the skill for a problem you can describe
  a11y-skills info <skill>               one skill: criteria, sections, path
  a11y-skills criteria [x.y.z]           which skills address a success criterion
  a11y-skills rules [axe-rule]           axe rule -> the skill that fixes it
  a11y-skills audit <file|url>           run axe-core and read the fixing skill for each finding
  a11y-skills install [options]           copy the skills into your agent

${C.bold}INSTALL OPTIONS${C.reset}
  --dest <dir>     where to install (default: ${DEFAULT_DESTS.claude})
  --agent <name>   claude | opencode      (default: claude)
  --force          overwrite skills that are already installed
  --dry-run        print what would be copied, copy nothing

${C.bold}AUDIT OPTIONS${C.reset}
  --fail-on <level>   critical | serious | moderate | minor | none   (default: serious)
  --wcag-only         ignore best-practice rules, report WCAG failures only
  --md                a Markdown report, for a CI comment or step summary
  --browser <path>    a Chromium binary to use instead of searching for one

  audit needs axe-core and a browser, which are devDependencies here and not
  installed by npx. It tells you the exact command rather than installing anything:
    npm i -D axe-core playwright && npx playwright install chromium

${C.bold}OUTPUT${C.reset}
  --json           machine-readable output (list, search, info, criteria, rules, audit)
  --no-color       never emit colour; also honours the NO_COLOR and FORCE_COLOR
                   environment variables

${C.bold}EXAMPLES${C.reset}
  npx github:AdilSiddiquiHQ/a11y-skills search "dialog focus"
  npx github:AdilSiddiquiHQ/a11y-skills criteria 1.4.3 --json
  npx github:AdilSiddiquiHQ/a11y-skills rules color-contrast
  npx github:AdilSiddiquiHQ/a11y-skills audit https://example.com --wcag-only
  npx github:AdilSiddiquiHQ/a11y-skills install --agent opencode --force
`);
}

function skillDirs() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((n) => statSync(join(SKILLS_DIR, n)).isDirectory())
    .sort();
}

/** Read just enough of a skill to describe, search and install it. */
function readSkill(name) {
  const path = join(SKILLS_DIR, name, 'SKILL.md');
  const text = readFileSync(path, 'utf8');
  const description = /^description:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? '';
  const criteriaLine = /^\*\*Criteria:\*\*\s*(.+)$/m.exec(text)?.[1] ?? '';
  const criteria = [...criteriaLine.matchAll(/SC\s+(\d+\.\d+\.\d+)/g)].map((m) => m[1]);
  const sections = [...text.matchAll(/^##\s+(.+?)\s*$/gm)].map((m) => m[1].trim());
  return { name, description, criteria, sections, path: `skills/${name}/SKILL.md` };
}

function criterionName(id) {
  return SPEC.criteria?.[id]?.name ?? null;
}
function criterionLevel(id) {
  return SPEC.criteria?.[id]?.level ?? null;
}

/** Terms that match a skill: its name, its description, and its criteria text. */
function haystack(skill) {
  const criteriaText = skill.criteria
    .map((id) => `${id} ${criterionName(id) ?? ''} ${criterionLevel(id) ?? ''}`)
    .join(' ');
  return `${skill.name} ${skill.description} ${criteriaText}`.toLowerCase().replace(/-/g, ' ');
}

function cmdList() {
  const names = skillDirs();
  if (names.length === 0) {
    console.error('no skills found');
    process.exit(3);
  }
  const skills = names.map(readSkill);

  if (jsonMode()) {
    console.log(JSON.stringify({ version: VERSION, count: skills.length, skills }, null, 2));
    return;
  }

  console.log('');
  for (const s of skills) {
    console.log(`${C.bold}${s.name}${C.reset}  ${C.dim}${s.criteria.join(' · ')}${C.reset}`);
    for (const line of wrap(s.description, 76)) console.log(`  ${line}`);
    console.log('');
  }
  console.log(`${C.dim}${names.length} skills · search: a11y-skills search "<your problem>"${C.reset}`);
  console.log('');
}

function cmdSearch(argv) {
  const terms = argv.filter((a) => !a.startsWith('--'));
  if (terms.length === 0) {
    console.error('usage: a11y-skills search <words>');
    process.exit(2);
  }

  const words = terms.join(' ').toLowerCase().split(/\s+/).filter(Boolean);
  const skills = skillDirs().map(readSkill);

  const hits = skills
    .map((s) => {
      const hay = haystack(s);
      const matched = words.filter((w) => hay.includes(w));
      return { skill: s, matched, score: matched.length };
    })
    .filter((h) => h.matched.length > 0)
    .sort((a, b) => b.score - a.score || a.skill.name.localeCompare(b.skill.name));

  if (jsonMode()) {
    console.log(
      JSON.stringify(
        {
          query: terms.join(' '),
          terms: words,
          count: hits.length,
          results: hits.map((h) => ({
            name: h.skill.name,
            description: h.skill.description,
            criteria: h.skill.criteria,
            matched: h.matched,
            score: h.score,
          })),
        },
        null,
        2
      )
    );
    return;
  }

  if (hits.length === 0) {
    console.log(`\n  no skill matches ${words.map((w) => `"${w}"`).join(' ')}\n`);
    console.log(`  ${C.dim}try fewer words, or run: a11y-skills list${C.reset}\n`);
    process.exit(1);
  }

  console.log('');
  for (const h of hits) {
    const missing = words.filter((w) => !h.matched.includes(w));
    console.log(`${C.bold}${h.skill.name}${C.reset}  ${C.dim}${h.skill.criteria.join(' · ')}${C.reset}`);
    for (const line of wrap(h.skill.description, 76)) console.log(`  ${line}`);
    if (missing.length) console.log(`  ${C.dim}(no match for: ${missing.join(', ')})${C.reset}`);
    console.log('');
  }
  console.log(`${C.dim}${hits.length} of ${skills.length} skills matched${C.reset}`);
  console.log('');
}

function cmdInfo(argv) {
  const name = argv.find((a) => !a.startsWith('--'));
  if (!name) {
    console.error('usage: a11y-skills info <skill>');
    process.exit(2);
  }
  if (!skillDirs().includes(name)) {
    console.error(`no skill named '${name}' — run: a11y-skills list`);
    process.exit(1);
  }

  const skill = readSkill(name);

  if (jsonMode()) {
    console.log(
      JSON.stringify(
        {
          name: skill.name,
          description: skill.description,
          path: skill.path,
          sections: skill.sections,
          criteria: skill.criteria.map((id) => ({ id, name: criterionName(id), level: criterionLevel(id) })),
        },
        null,
        2
      )
    );
    return;
  }

  console.log('');
  console.log(`${C.bold}${skill.name}${C.reset}`);
  console.log('');
  for (const line of wrap(skill.description, 76)) console.log(`  ${line}`);
  console.log('');
  console.log(`  ${C.bold}Success criteria${C.reset}`);
  for (const id of skill.criteria) {
    const lvl = criterionLevel(id);
    console.log(`    SC ${id}  ${criterionName(id) ?? '?'}${lvl ? `  ${C.dim}(${lvl})${C.reset}` : ''}`);
  }
  console.log('');
  console.log(`  ${C.bold}Sections${C.reset}`);
  for (const s of skill.sections) console.log(`    ${s}`);
  console.log('');
  console.log(`  ${C.dim}${skill.path}${C.reset}`);
  console.log('');
}

function cmdCriteria(argv) {
  const id = argv.find((a) => !a.startsWith('--'));
  const skills = skillDirs().map(readSkill);

  const map = new Map();
  for (const s of skills) {
    for (const c of s.criteria) {
      if (!map.has(c)) map.set(c, []);
      map.get(c).push(s.name);
    }
  }

  if (id) {
    const name = criterionName(id);
    if (!name) {
      console.error(`SC ${id} is not a WCAG 2.2 criterion`);
      process.exit(1);
    }
    const who = map.get(id) ?? [];
    if (jsonMode()) {
      console.log(JSON.stringify({ id, name, level: criterionLevel(id), skills: who }, null, 2));
      return;
    }
    console.log('');
    console.log(`  ${C.bold}SC ${id} ${name}${C.reset} ${C.dim}(${criterionLevel(id)})${C.reset}`);
    console.log('');
    if (who.length === 0) console.log(`  ${C.dim}no skill addresses this criterion${C.reset}`);
    else for (const n of who) console.log(`    ${n}`);
    console.log('');
    return;
  }

  const ids = [...map.keys()].sort((a, b) => {
    const A = a.split('.').map(Number);
    const B = b.split('.').map(Number);
    return A[0] - B[0] || A[1] - B[1] || A[2] - B[2];
  });

  if (jsonMode()) {
    console.log(
      JSON.stringify(
        { total: Object.keys(SPEC.criteria ?? {}).length, addressed: ids.length, criteria: ids.map((i) => ({ id: i, name: criterionName(i), skills: map.get(i) })) },
        null,
        2
      )
    );
    return;
  }

  console.log('');
  for (const i of ids) {
    const lvl = criterionLevel(i) ?? '?';
    console.log(`  SC ${i}  ${C.dim}${lvl.padEnd(3)}${C.reset} ${criterionName(i)}`);
    console.log(`        ${C.dim}${map.get(i).join(', ')}${C.reset}`);
  }
  console.log('');
  console.log(
    `  ${C.dim}${ids.length} of ${Object.keys(SPEC.criteria ?? {}).length} WCAG ${SPEC.version ?? '2.2'} criteria addressed${C.reset}`
  );
  console.log('');
}

/* -------------------------------------------------------------------------
 * axe rule -> skill
 *
 * The join between "what a scanner reported" and "what to do about it". The two
 * halves come from different places on purpose: the rule list and the criteria
 * each rule tests are a snapshot of axe-core (verify/axe-rules.json), and the
 * chosen skill per rule is curated (verify/rule-map.json) and validated in CI
 * against both the snapshot and the skills' own criteria lines.
 * ------------------------------------------------------------------------- */

function ruleData() {
  const axe = existsSync(AXE_RULES_PATH)
    ? JSON.parse(readFileSync(AXE_RULES_PATH, 'utf8'))
    : { rules: {}, version: '?' };
  const map = existsSync(RULE_MAP_PATH)
    ? JSON.parse(readFileSync(RULE_MAP_PATH, 'utf8'))
    : { rules: {} };
  return { axe, map };
}

/** Skills that declare any of these criteria: the derived "also relevant" set. */
function skillsForCriteria(ids, skills) {
  return skills.filter((s) => s.criteria.some((c) => ids.includes(c))).map((s) => s.name);
}

/** A criterion id -> "SC 1.4.3 Contrast (Minimum) (AA)", or notes its removal. */
function describeCriterion(id) {
  const name = criterionName(id);
  if (name) return `SC ${id} ${name} (${criterionLevel(id)})`;
  if (SPEC.obsolete?.[id]) return `SC ${id} — removed in WCAG 2.2`;
  return `SC ${id} — not a WCAG 2.2 criterion`;
}

function cmdRules(argv) {
  const id = argv.find((a) => !a.startsWith('--'));
  const { axe, map } = ruleData();
  const rules = axe.rules ?? {};
  const ids = Object.keys(rules).sort();

  if (ids.length === 0) {
    console.error('verify/axe-rules.json is missing or empty — run: npm run axe-rules');
    process.exit(3);
  }

  const skills = skillDirs().map(readSkill);

  if (!id) {
    if (jsonMode()) {
      console.log(
        JSON.stringify(
          {
            axe: axe.version,
            count: ids.length,
            mapped: Object.keys(map.rules ?? {}).length,
            rules: ids.map((r) => {
              const e = map.rules?.[r];
              return {
                id: r,
                help: rules[r].help,
                criteria: rules[r].criteria,
                bestPractice: rules[r].bestPractice,
                enabledByDefault: rules[r].enabledByDefault,
                skill: e?.skill ?? null,
                why: e?.why ?? null,
              };
            }),
          },
          null,
          2
        )
      );
      return;
    }

    console.log('');
    for (const r of ids) {
      const e = map.rules?.[r];
      const crit = rules[r].criteria.length
        ? rules[r].criteria.join(' ')
        : rules[r].bestPractice
          ? 'best-practice'
          : '';
      const off = rules[r].enabledByDefault ? '' : ' off';
      console.log(
        `  ${r.padEnd(32)} ${(e?.skill ?? `${C.dim}no skill yet${C.reset}`).padEnd(
          e ? 30 : 30
        )} ${C.dim}${(crit + off).trim()}${C.reset}`
      );
    }
    console.log('');
    console.log(
      `  ${C.dim}${Object.keys(map.rules ?? {}).length} of ${ids.length} axe rules mapped to a skill ` +
        `· 'off' = axe ships it disabled · a11y-skills rules <id> for one${C.reset}`
    );
    console.log('');
    return;
  }

  const rule = rules[id];
  if (!rule) {
    const near = ids.filter((r) => r.includes(id) || id.includes(r)).slice(0, 5);
    console.error(
      `no axe rule named '${id}'${near.length ? ` — did you mean: ${near.join(', ')}?` : ''}`
    );
    process.exit(1);
  }

  const entry = map.rules?.[id];
  const known = rule.criteria.filter((c) => SPEC.criteria?.[c]);
  const also = skillsForCriteria(known, skills).filter((n) => n !== entry?.skill);

  if (jsonMode()) {
    console.log(
      JSON.stringify(
        {
          id,
          help: rule.help,
          url: rule.url,
          criteria: rule.criteria.map((c) => ({
            id: c,
            name: criterionName(c),
            level: criterionLevel(c),
            removed: !criterionName(c) && Boolean(SPEC.obsolete?.[c]),
          })),
          bestPractice: rule.bestPractice,
          enabledByDefault: rule.enabledByDefault,
          skill: entry?.skill ?? null,
          why: entry?.why ?? null,
          alsoRelevant: also,
        },
        null,
        2
      )
    );
    return;
  }

  console.log('');
  console.log(`  ${C.bold}${id}${C.reset}  ${C.dim}${rule.help}${C.reset}`);
  console.log('');
  console.log(
    `  ${C.dim}WCAG${C.reset}  ${
      rule.criteria.length
        ? rule.criteria.map(describeCriterion).join(', ')
        : `${C.dim}none — axe classes this as best practice${C.reset}`
    }`
  );
  console.log(
    `  ${C.dim}axe${C.reset}   ${
      rule.enabledByDefault
        ? 'enabled by default'
        : `disabled by default ${C.dim}— a finding means somebody turned it on${C.reset}`
    }`
  );
  console.log(`  ${C.dim}docs${C.reset}  ${C.dim}${rule.url}${C.reset}`);
  console.log('');

  if (entry) {
    const skill = readSkill(entry.skill);
    console.log(`  ${C.bold}read${C.reset}  ${C.bold}skills/${entry.skill}/${C.reset}`);
    console.log(`        ${entry.why}`);
    for (const line of wrap(skill.description, 72)) console.log(`        ${C.dim}${line}${C.reset}`);
  } else {
    console.log(`  ${C.dim}no skill yet — docs/RULE-MAP.md records why${C.reset}`);
  }

  if (also.length) {
    console.log('');
    console.log(
      `  ${C.dim}also relevant (${also.length}): ${also.slice(0, 8).join(', ')}${
        also.length > 8 ? ', …' : ''
      }${C.reset}`
    );
  }
  console.log('');
}

/* -------------------------------------------------------------------------
 * audit
 * ------------------------------------------------------------------------- */

const IMPACT_ORDER = ['minor', 'moderate', 'serious', 'critical'];

/** axe leaves `impact` null on some findings; treat that as moderate, not zero. */
const impactOf = (v) => v.impact ?? 'moderate';

function needsWhat(what, how) {
  console.error(`
  audit needs ${what}, and this CLI installs nothing on your behalf.

  ${how}
`);
  process.exit(3);
}

function cmdAudit(argv) {
  const opts = { md: false, wcagOnly: false, failOn: 'serious', browser: null, target: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--fail-on') opts.failOn = argv[++i];
    else if (a === '--browser') opts.browser = argv[++i];
    else if (a === '--md') opts.md = true;
    else if (a === '--wcag-only') opts.wcagOnly = true;
    else if (a === '--json' || a === '--no-color' || a === '--color') continue;
    else if (a.startsWith('-')) {
      console.error(`unknown option: ${a}`);
      process.exit(2);
    } else if (!opts.target) opts.target = a;
    else {
      console.error(`unexpected argument: ${a}`);
      process.exit(2);
    }
  }

  if (!opts.target) {
    console.error('usage: a11y-skills audit <file.html|https://url> [--wcag-only] [--md] [--json]');
    process.exit(2);
  }
  const levels = [...IMPACT_ORDER, 'none'];
  if (!levels.includes(opts.failOn)) {
    console.error(`--fail-on must be one of: ${levels.join(' | ')}`);
    process.exit(2);
  }

  const isUrl = /^https?:\/\//i.test(opts.target);
  const targetPath = isUrl ? opts.target : resolve(opts.target);
  if (!isUrl && !existsSync(targetPath)) {
    console.error(`no such file: ${opts.target}`);
    process.exit(3);
  }

  const { axe, map } = ruleData();
  const skills = skillDirs().map(readSkill);

  return runAudit(opts, { isUrl, targetPath, axe, map, skills });
}

async function runAudit(opts, { isUrl, targetPath, axe, map, skills }) {
  const require = createRequire(import.meta.url);

  let axeSource;
  try {
    axeSource = readFileSync(require.resolve('axe-core/axe.min.js'), 'utf8');
  } catch {
    needsWhat('axe-core', 'npm i -D axe-core');
  }

  let chromium;
  try {
    ({ chromium } = await import('playwright'));
  } catch {
    needsWhat('playwright', 'npm i -D playwright');
  }

  const executablePath = opts.browser ?? findChromium();
  if (!executablePath) {
    needsWhat(
      'a Chromium browser',
      'npx playwright install chromium\n  or set CHROMIUM_PATH, or pass --browser <path-to-chrome>'
    );
  }

  const url = isUrl ? opts.target : pathToFileURL(targetPath).href;
  const browser = await chromium.launch({ executablePath });
  let scanned;
  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: 'load' });
    await page.addScriptTag({ content: axeSource });
    scanned = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ['violations', 'incomplete'] });
      const compact = (list) =>
        list.map((v) => ({
          id: v.id,
          impact: v.impact,
          help: v.help,
          helpUrl: v.helpUrl,
          nodes: v.nodes.map((n) => ({
            target: n.target.join(' '),
            html: (n.html || '').slice(0, 180),
            // axe puts the actual reason on the lines after "Fix any of the
            // following:", so the first line is the least useful one to keep.
            summary: (() => {
              const lines = (n.failureSummary || '')
                .split('\n')
                .map((l) => l.trim().replace(/^[-•]\s*/, ''))
                .filter(Boolean);
              return (lines.find((l) => !/^Fix (any|all) of the following:?$/i.test(l)) || '').slice(0, 160);
            })(),
          })),
        }));
      return { violations: compact(r.violations), incomplete: compact(r.incomplete) };
    });
    await page.close();
  } finally {
    await browser.close();
  }

  const enrich = (v) => {
    const known = (axe.rules?.[v.id]?.criteria ?? []).filter((c) => SPEC.criteria?.[c]);
    const entry = map.rules?.[v.id];
    return {
      ...v,
      criteria: known,
      skill: entry?.skill ?? null,
      why: entry?.why ?? null,
      alsoRelevant: skillsForCriteria(known, skills).filter((n) => n !== entry?.skill),
      bestPractice: known.length === 0,
      enabledByDefault: axe.rules?.[v.id]?.enabledByDefault ?? true,
    };
  };

  let violations = scanned.violations.map(enrich);
  const needsReview = scanned.incomplete.map(enrich);
  if (opts.wcagOnly) violations = violations.filter((v) => v.criteria.length > 0);

  violations.sort(
    (a, b) =>
      IMPACT_ORDER.indexOf(impactOf(b)) - IMPACT_ORDER.indexOf(impactOf(a)) ||
      a.id.localeCompare(b.id)
  );

  const byImpact = {};
  for (const v of violations) byImpact[impactOf(v)] = (byImpact[impactOf(v)] ?? 0) + 1;
  const withSkill = violations.filter((v) => v.skill).length;
  const threshold = opts.failOn === 'none' ? Infinity : IMPACT_ORDER.indexOf(opts.failOn);
  const failing = violations.filter((v) => IMPACT_ORDER.indexOf(impactOf(v)) >= threshold);

  const summary = {
    violations: violations.length,
    nodes: violations.reduce((n, v) => n + v.nodes.length, 0),
    rules: violations.length,
    byImpact,
    withSkill,
    withoutSkill: violations.length - withSkill,
    needsReview: needsReview.length,
    failing: failing.length,
    failOn: opts.failOn,
  };

  if (jsonMode()) {
    console.log(
      JSON.stringify(
        {
          target: opts.target,
          axe: axe.version,
          summary,
          violations: violations.map((v) => ({
            id: v.id,
            impact: impactOf(v),
            help: v.help,
            helpUrl: v.helpUrl,
            criteria: v.criteria.map(describeCriterion),
            bestPractice: v.bestPractice,
            enabledByDefault: v.enabledByDefault,
            skill: v.skill,
            why: v.why,
            alsoRelevant: v.alsoRelevant,
            nodes: v.nodes,
          })),
          needsReview: needsReview.map((v) => ({
            id: v.id,
            impact: impactOf(v),
            help: v.help,
            criteria: v.criteria.map(describeCriterion),
            skill: v.skill,
          })),
        },
        null,
        2
      )
    );
    process.exit(failing.length ? 1 : 0);
  }

  if (opts.md) {
    process.stdout.write(renderAuditMarkdown(opts, { axe, summary, violations, needsReview }));
    process.exit(failing.length ? 1 : 0);
  }

  console.log('');
  console.log(`  ${C.bold}a11y-skills audit${C.reset}  ${C.dim}${opts.target}${C.reset}`);
  console.log(`  ${C.dim}axe-core ${axe.version} · ${url.startsWith('file:') ? 'local file' : 'live URL'}${C.reset}`);
  console.log('');

  if (violations.length === 0) {
    console.log(`  ${C.green}no violations${C.reset}${opts.wcagOnly ? ' against WCAG-tagged rules' : ''}`);
    console.log('');
  }

  for (const v of violations) {
    const impact = impactOf(v);
    console.log(
      `  ${impact === 'critical' || impact === 'serious' ? impact : C.dim + impact + C.reset}  ` +
        `${C.bold}${v.id}${C.reset}  ${C.dim}${v.nodes.length} node${v.nodes.length === 1 ? '' : 's'}${C.reset}`
    );
    console.log(`           ${C.dim}${v.help}${C.reset}`);
    console.log(
      `           ${C.dim}WCAG${C.reset}  ${
        v.criteria.length ? v.criteria.map(describeCriterion).join(', ') : 'best practice'
      }${v.enabledByDefault ? '' : ` ${C.dim}(axe ships this rule off)${C.reset}`}`
    );
    if (v.skill) {
      console.log(`           ${C.dim}read${C.reset}  skills/${v.skill}/  ${C.dim}— ${v.why}${C.reset}`);
      if (v.alsoRelevant.length) {
        console.log(`           ${C.dim}also  ${v.alsoRelevant.length} other skills address this${C.reset}`);
      }
    } else {
      console.log(`           ${C.dim}read  no skill yet — docs/RULE-MAP.md records why${C.reset}`);
    }
    const first = v.nodes[0];
    if (first) {
      console.log(`           ${C.dim}e.g.  ${first.target}${C.reset}`);
      if (first.html) console.log(`                 ${C.dim}${first.html}${C.reset}`);
      if (first.summary) console.log(`                 ${C.dim}${first.summary}${C.reset}`);
    }
    console.log('');
  }

  const parts = IMPACT_ORDER.filter((i) => byImpact[i]).map((i) => `${byImpact[i]} ${i}`);
  console.log(
    `  ${C.bold}${violations.length}${C.reset} finding${violations.length === 1 ? '' : 's'} ` +
      `across ${summary.rules} rule${summary.rules === 1 ? '' : 's'}` +
      `${parts.length ? ` ${C.dim}(${parts.join(', ')})${C.reset}` : ''}`
  );
  console.log(
    `  ${C.dim}${withSkill} can be looked up here, ${summary.withoutSkill} cannot yet${
      opts.wcagOnly ? ' · best-practice rules ignored' : ''
    }${C.reset}`
  );
  if (needsReview.length) {
    console.log(
      `  ${C.dim}${needsReview.length} result${needsReview.length === 1 ? '' : 's'} need a human — ` +
        `axe could not decide (e.g. ${needsReview.slice(0, 3).map((v) => v.id).join(', ')})${C.reset}`
    );
  }
  console.log(
    `  ${C.dim}--fail-on ${opts.failOn} → ${failing.length ? `exit 1 (${failing.length} at or above the threshold)` : 'exit 0'}${C.reset}`
  );
  console.log('');

  process.exit(failing.length ? 1 : 0);
}

function renderAuditMarkdown(opts, { axe, summary, violations, needsReview }) {
  const parts = IMPACT_ORDER.filter((i) => summary.byImpact[i]).map(
    (i) => `${summary.byImpact[i]} ${i}`
  );

  const rows = violations.map((v) => {
    const criteria = v.criteria.length ? v.criteria.map(describeCriterion).join(', ') : 'best practice';
    const read = v.skill ? `[\`${v.skill}\`](../skills/${v.skill}/)` : '_no skill yet_';
    return `| ${impactOf(v)} | \`${v.id}\` | ${v.nodes.length} | ${criteria} | ${read} |`;
  });

  const details = violations.map((v) => {
    const lines = [
      `### \`${v.id}\` — ${impactOf(v)}`,
      '',
      v.help + (v.enabledByDefault ? '' : ' _(axe ships this rule disabled by default)_'),
      '',
      `- Criteria: ${v.criteria.length ? v.criteria.map(describeCriterion).join(', ') : 'best practice'}`,
      v.skill
        ? `- Read: [\`${v.skill}\`](../skills/${v.skill}/) — ${v.why}`
        : '- Read: no skill yet; `docs/RULE-MAP.md` records why',
      `- Nodes (${v.nodes.length}):`,
    ];
    for (const n of v.nodes.slice(0, 5)) {
      lines.push(`  - \`${n.target}\`${n.summary ? ` — ${n.summary}` : ''}`);
    }
    if (v.nodes.length > 5) lines.push(`  - … and ${v.nodes.length - 5} more`);
    return lines.join('\n');
  });

  return `## a11y-skills audit

\`${opts.target}\` — axe-core ${axe.version}

**${summary.violations} finding${summary.violations === 1 ? '' : 's'} across ${summary.rules} rule${
    summary.rules === 1 ? '' : 's'
  }**${parts.length ? ` (${parts.join(', ')})` : ''}. ${summary.withSkill} have a skill here, ${
    summary.withoutSkill
  } do not.${opts.wcagOnly ? ' Best-practice rules were ignored.' : ''}

| Impact | Rule | Nodes | Criteria | Read |
|---|---|---|---|---|
${rows.join('\n') || '| — | _none_ | 0 | — | — |'}

${
  needsReview.length
    ? `**${needsReview.length} results need a human.** axe could not decide these — ${needsReview
        .slice(0, 5)
        .map((v) => `\`${v.id}\``)
        .join(', ')}${needsReview.length > 5 ? ', …' : ''}. A clean automated report is not a clean page.\n`
    : ''
}
${details.length ? `### Findings\n\n${details.join('\n\n')}\n` : ''}
---

<sub>Generated by \`a11y-skills audit\`. Automated checks find a minority of real
accessibility problems; read each skill's \`## Verify\` section before treating this
as done.</sub>
`;
}

function wrap(text, width) {
  const words = text.split(/\s+/);
  const lines = [];
  let line = '';
  for (const w of words) {
    if ((line + ' ' + w).trim().length > width) {
      lines.push(line.trim());
      line = w;
    } else {
      line += ' ' + w;
    }
  }
  if (line.trim()) lines.push(line.trim());
  return lines;
}

function parseArgs(argv) {
  const opts = { dest: null, agent: 'claude', force: false, dryRun: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--dest') opts.dest = argv[++i];
    else if (a === '--agent') opts.agent = argv[++i];
    else if (a === '--force') opts.force = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '--help' || a === '-h') opts.help = true;
    else if (a === '--json' || a === '--no-color' || a === '--color') continue;
    else {
      console.error(`unknown option: ${a}`);
      process.exit(2);
    }
  }
  return opts;
}

function cmdInstall(argv) {
  const opts = parseArgs(argv);
  if (opts.help) return usage();

  let dest = opts.dest;
  if (!dest) {
    if (!DEFAULT_DESTS[opts.agent]) {
      console.error(`unknown agent '${opts.agent}' (expected: ${Object.keys(DEFAULT_DESTS).join(' | ')})`);
      process.exit(2);
    }
    dest = DEFAULT_DESTS[opts.agent];
  }
  dest = resolve(dest.replace(/^~(?=\/|$)/, homedir()));

  const names = skillDirs();
  console.log(`\n  ${C.dim}source${C.reset} ${SKILLS_DIR}`);
  console.log(`  ${C.dim}dest  ${C.reset} ${dest}\n`);

  let copied = 0;
  let skipped = 0;

  for (const name of names) {
    const target = join(dest, name);
    const exists = existsSync(target);
    if (exists && !opts.force) {
      console.log(`  ${C.dim}skip${C.reset}  ${name} ${C.dim}(already installed; --force to replace)${C.reset}`);
      skipped++;
      continue;
    }
    if (opts.dryRun) {
      console.log(`  ${C.green}would${C.reset} ${name}`);
      copied++;
      continue;
    }
    mkdirSync(target, { recursive: true });
    cpSync(join(SKILLS_DIR, name), target, { recursive: true });
    console.log(`  ${C.green}ok${C.reset}    ${name}`);
    copied++;
  }

  console.log('');
  if (opts.dryRun) console.log(`  ${copied} would be installed, ${skipped} already present (dry run)\n`);
  else console.log(`  ${copied} installed, ${skipped} skipped\n`);
}

const [cmd, ...rest] = process.argv.slice(2);

switch (cmd) {
  case 'list':
    cmdList();
    break;
  case 'search':
    cmdSearch(rest);
    break;
  case 'info':
    cmdInfo(rest);
    break;
  case 'criteria':
    cmdCriteria(rest);
    break;
  case 'rules':
    cmdRules(rest);
    break;
  case 'audit':
    await cmdAudit(rest);
    break;
  case 'install':
    cmdInstall(rest);
    break;
  case '--version':
  case '-v':
    console.log(VERSION);
    break;
  case '--help':
  case '-h':
  case undefined:
    usage();
    break;
  default:
    console.error(`unknown command: ${cmd}\n`);
    usage();
    process.exit(2);
}
