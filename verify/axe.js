/**
 * Run axe-core in a real browser.
 *
 * Why a browser and not jsdom: the single most common accessibility failure is
 * colour contrast, and contrast cannot be computed without layout. jsdom has no
 * layout, so an axe run under jsdom silently reports `color-contrast` as
 * incomplete and a fixture asserting on it would pass for the wrong reason.
 *
 * Playwright drives a real Chromium; axe-core is injected into the page. Both
 * are devDependencies. Nothing in `bin/` or the skills requires them — the
 * shipped product is still zero-dependency Markdown.
 */

import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { homedir } from 'node:os';

const require = createRequire(import.meta.url);
const HIM = dirname(fileURLToPath(import.meta.url));

export const ROOT = join(HIM, '..');
export const FIXTURES_DIR = join(HIM, 'fixtures');

const AXE_PATH = require.resolve('axe-core/axe.min.js');
const AXE_SOURCE = readFileSync(AXE_PATH, 'utf8');

/**
 * Locate a Chromium to drive.
 *
 * Order matters: an explicit override, then a search of the Playwright browser
 * cache. The search exists because the cached browser is shared with whatever
 * else installed Playwright, and because `playwright-core` does not download
 * anything — so on a machine where the browsers came from somewhere else, the
 * default path does not exist. "No browser found" is a much worse error than
 * twenty lines of searching.
 */
export function findChromium() {
  if (process.env.CHROMIUM_PATH && existsSync(process.env.CHROMIUM_PATH)) {
    return process.env.CHROMIUM_PATH;
  }

  const cache = join(homedir(), 'Library', 'Caches', 'ms-playwright');
  const linuxCache = join(homedir(), '.cache', 'ms-playwright');
  const roots = [cache, linuxCache, join(homedir(), 'AppData', 'Local', 'ms-playwright')];

  const candidates = [];
  for (const root of roots) {
    if (!existsSync(root)) continue;
    for (const entry of readdirSync(root)) {
      if (entry.startsWith('chromium_headless_shell-')) {
        candidates.push(
          join(root, entry, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
          join(root, entry, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
          join(root, entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell')
        );
      }
      if (entry.startsWith('chromium-')) {
        candidates.push(
          join(root, entry, 'chrome-linux', 'chrome'),
          join(root, entry, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
          join(root, entry, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium')
        );
      }
    }
  }

  const found = candidates.find((p) => existsSync(p));
  if (found) return found;

  throw new Error(
    'No Chromium found. Install one with `npx playwright install chromium`, ' +
      'or point CHROMIUM_PATH at an existing binary.'
  );
}

/** Launch once and reuse across fixtures; browser startup dominates runtime. */
export async function openBrowser() {
  const { chromium } = await import('playwright');
  return chromium.launch({ executablePath: findChromium() });
}

/**
 * Run axe against an HTML string and return a compact result.
 *
 * Everything axe reports is returned, including best-practice rules, because
 * the fixture contract is stricter than a WCAG filter: an `after.html` must be
 * completely clean, not merely clean of the rule the fixture is about.
 */
export async function scanHtml(browser, html) {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.addScriptTag({ content: AXE_SOURCE });
    const result = await page.evaluate(async () => {
      const r = await window.axe.run(document, {
        resultTypes: ['violations'],
      });
      return r.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        nodes: v.nodes.map((n) => ({
          target: n.target.join(' '),
          html: (n.html || '').slice(0, 160),
          summary: n.failureSummary?.split('\n').filter(Boolean)[0] || '',
        })),
      }));
    });
    return result;
  } finally {
    await page.close();
  }
}

/** Every fixture case, sorted for deterministic output. */
export function fixtureCases() {
  if (!existsSync(FIXTURES_DIR)) return [];
  const cases = [];
  for (const skill of readdirSync(FIXTURES_DIR).sort()) {
    const skillDir = join(FIXTURES_DIR, skill);
    if (!existsSync(skillDir)) continue;
    for (const name of readdirSync(skillDir).sort()) {
      const dir = join(skillDir, name);
      const metaPath = join(dir, 'meta.json');
      if (!existsSync(metaPath)) continue;
      cases.push({
        skill,
        name,
        dir,
        meta: JSON.parse(readFileSync(metaPath, 'utf8')),
        beforePath: join(dir, 'before.html'),
        afterPath: join(dir, 'after.html'),
      });
    }
  }
  return cases;
}

export function readIfExists(path) {
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}
