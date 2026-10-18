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
import { findChromium as findChromiumBinary } from '../lib/chromium.js';

const require = createRequire(import.meta.url);
const HIM = dirname(fileURLToPath(import.meta.url));

export const ROOT = join(HIM, '..');
export const FIXTURES_DIR = join(HIM, 'fixtures');

const AXE_PATH = require.resolve('axe-core/axe.min.js');
const AXE_SOURCE = readFileSync(AXE_PATH, 'utf8');

/**
 * Locate a Chromium to drive.
 *
 * The search lives in lib/chromium.js so the CLI and this harness agree on it.
 * Here it is turned into a hard error, because a fixture run that cannot find a
 * browser has nothing to report.
 */
export function findChromium() {
  const found = findChromiumBinary();
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
 *
 * `options` is passed straight to `axe.run`. Fixtures use it for one thing: some
 * rules axe ships disabled, and a fixture that claims to test SC 2.5.8 Target
 * Size has to turn `target-size` on, because a default scan would simply never
 * mention it. A test that cannot fail is not a test.
 */
export async function scanHtml(browser, html, options = {}) {
  const page = await browser.newPage();
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.addScriptTag({ content: AXE_SOURCE });
    const result = await page.evaluate(async (runOptions) => {
      const r = await window.axe.run(document, {
        resultTypes: ['violations'],
        ...runOptions,
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
    }, options);
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
