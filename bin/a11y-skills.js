#!/usr/bin/env node
/**
 * a11y-skills — list, search, inspect and install the skills in this repository.
 *
 * Deliberately zero-dependency and offline. It reads files and copies them. It
 * never reaches the network, never installs anything, and never executes
 * anything it finds inside a skill.
 *
 *   npx github:AdilSiddiquiHQ/a11y-skills list
 *   npx github:AdilSiddiquiHQ/a11y-skills search "focus ring"
 *   npx github:AdilSiddiquiHQ/a11y-skills criteria 2.4.7
 *   npx github:AdilSiddiquiHQ/a11y-skills install
 *
 * `--json` works on list, search, info and criteria so an agent or another tool
 * can drive the library without screen-scraping the human output.
 */

import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SKILLS_DIR = join(ROOT, 'skills');
const SPEC_PATH = join(ROOT, 'verify', 'wcag-2.2.json');

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
  a11y-skills install [options]           copy the skills into your agent

${C.bold}INSTALL OPTIONS${C.reset}
  --dest <dir>     where to install (default: ${DEFAULT_DESTS.claude})
  --agent <name>   claude | opencode      (default: claude)
  --force          overwrite skills that are already installed
  --dry-run        print what would be copied, copy nothing

${C.bold}OUTPUT${C.reset}
  --json           machine-readable output (list, search, info, criteria)
  --no-color       never emit colour; also honours the NO_COLOR and FORCE_COLOR
                   environment variables

${C.bold}EXAMPLES${C.reset}
  npx github:AdilSiddiquiHQ/a11y-skills search "dialog focus"
  npx github:AdilSiddiquiHQ/a11y-skills criteria 1.4.3 --json
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
