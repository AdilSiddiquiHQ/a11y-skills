#!/usr/bin/env node
/**
 * a11y-skills — list and install the skills in this repository.
 *
 * Deliberately zero-dependency and offline: this copies files. It does not
 * reach the network, and it does not run anything it finds.
 *
 *   npx github:AdilSiddiquiHQ/a11y-skills list
 *   npx github:AdilSiddiquiHQ/a11y-skills install
 *   npx github:AdilSiddiquiHQ/a11y-skills install --dest ~/.config/opencode/skills
 */

import { readFileSync, readdirSync, existsSync, statSync, mkdirSync, cpSync } from 'node:fs';
import { join, dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { homedir } from 'node:os';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');
const SKILLS_DIR = join(ROOT, 'skills');

const VERSION = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version;

// The two places agents actually look. Claude Code and OpenCode are both
// common; install into both only when asked, never silently.
const DEFAULT_DESTS = {
  claude: join(homedir(), '.claude', 'skills'),
  opencode: join(homedir(), '.config', 'opencode', 'skills'),
};

const C = process.stdout.isTTY
  ? { bold: '\x1b[1m', dim: '\x1b[2m', green: '\x1b[32m', reset: '\x1b[0m' }
  : { bold: '', dim: '', green: '', reset: '' };

function usage() {
  console.log(`
${C.bold}a11y-skills${C.reset} ${C.dim}v${VERSION}${C.reset} — WCAG 2.2 skills for coding agents

${C.bold}USAGE${C.reset}
  a11y-skills list                       show the skills and what each is for
  a11y-skills install [options]           copy the skills into your agent

${C.bold}INSTALL OPTIONS${C.reset}
  --dest <dir>     where to install (default: ${DEFAULT_DESTS.claude})
  --agent <name>   claude | opencode      (default: claude)
  --force          overwrite skills that are already installed
  --dry-run        print what would be copied, copy nothing

${C.bold}EXAMPLES${C.reset}
  npx github:AdilSiddiquiHQ/a11y-skills install
  npx github:AdilSiddiquiHQ/a11y-skills install --agent opencode --force
`);
}

function skillDirs() {
  if (!existsSync(SKILLS_DIR)) return [];
  return readdirSync(SKILLS_DIR)
    .filter((n) => statSync(join(SKILLS_DIR, n)).isDirectory())
    .sort();
}

/** Read just enough to describe a skill. */
function readSkill(name) {
  const path = join(SKILLS_DIR, name, 'SKILL.md');
  const text = readFileSync(path, 'utf8');
  const description = /^description:\s*(.+)$/m.exec(text)?.[1]?.trim() ?? '';
  const criteriaLine = /^\*\*Criteria:\*\*\s*(.+)$/m.exec(text)?.[1] ?? '';
  const criteria = [...criteriaLine.matchAll(/SC\s+(\d+\.\d+\.\d+)/g)].map((m) => m[1]);
  return { name, description, criteria: criteria.join(' · ') };
}

function cmdList() {
  const names = skillDirs();
  if (names.length === 0) {
    console.error('no skills found');
    process.exit(3);
  }
  console.log('');
  for (const s of names.map(readSkill)) {
    console.log(`${C.bold}${s.name}${C.reset}  ${C.dim}${s.criteria}${C.reset}`);
    const d = s.description;
    for (const line of wrap(d, 76)) console.log(`  ${line}`);
    console.log('');
  }
  console.log(`${C.dim}${names.length} skills · install with: a11y-skills install${C.reset}`);
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
