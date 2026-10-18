#!/usr/bin/env node
/**
 * Build docs/demo.gif.
 *
 * The animation is not hand-drawn. It runs axe-core over a fixture's
 * `before.html`, outlines every element axe flags, screenshots it with the
 * violation count in a caption bar, then does the same for `after.html` — which
 * axe reports clean — and crossfades between the two with ffmpeg.
 *
 * So the picture cannot drift from the tool: if a change to the fixture made the
 * "after" fail, this would screenshot a red-outlined page and count the
 * violations instead of quietly showing a nice demo.
 *
 * Requires playwright-core (a devDependency, driving an already-installed
 * Chromium) and ffmpeg on PATH.
 *
 *   npm run demo
 */

import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { openBrowser, ROOT } from '../verify/axe.js';

const FIXTURE = join(ROOT, 'verify', 'fixtures', 'accessible-forms', 'styled-signup');
const OUT = join(ROOT, 'docs', 'demo.gif');
const FRAMES = join(tmpdir(), 'a11y-skills-demo');

const VIEWPORT = { width: 460, height: 430 };

const AXE_SOURCE = readFileSync(
  join(ROOT, 'node_modules', 'axe-core', 'axe.min.js'),
  'utf8'
);

/**
 * Load a document, run axe, then annotate it with what axe found.
 *
 * The annotation happens in a second evaluate pass rather than inside axe's
 * callback so that page styles are applied after the results are fixed — the
 * outlines can never influence the count they are illustrating.
 */
async function render(browser, html, filename) {
  const page = await browser.newPage({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  try {
    await page.setContent(html, { waitUntil: 'load' });
    await page.addScriptTag({ content: AXE_SOURCE });

    const result = await page.evaluate(async () => {
      const r = await window.axe.run(document, { resultTypes: ['violations'] });

      const flagged = new Set();
      for (const v of r.violations) {
        for (const n of v.nodes) {
          for (const selector of n.target) {
            try {
              document.querySelectorAll(selector).forEach((el) => flagged.add(el));
            } catch {
              /* axe target selectors are always valid; ignore if not */
            }
          }
        }
      }

      for (const el of flagged) {
        el.style.outline = '3px solid #d1242f';
        el.style.outlineOffset = '2px';
        el.style.borderRadius = el.style.borderRadius || '2px';
      }

      const nodeCount = r.violations.reduce((a, v) => a + v.nodes.length, 0);

      const bar = document.createElement('div');
      bar.textContent =
        r.violations.length === 0
          ? `${document.title} · after the fix · axe-core: 0 violations`
          : `${nodeCount} failing elements · axe-core: ${r.violations.length} violation rules`;
      Object.assign(bar.style, {
        position: 'fixed',
        top: '0',
        left: '0',
        right: '0',
        height: '28px',
        lineHeight: '28px',
        textAlign: 'center',
        font: '600 12px -apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif',
        letterSpacing: '0.01em',
        color: '#ffffff',
        background: r.violations.length === 0 ? '#157347' : '#d1242f',
        zIndex: '2147483647',
      });
      document.body.appendChild(bar);
      document.body.style.paddingTop = '52px';

      return { violations: r.violations.length, nodes: nodeCount };
    });

    const png = join(FRAMES, filename);
    await page.screenshot({ path: png });
    return { png, ...result };
  } finally {
    await page.close();
  }
}

function requireFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error(
      'ffmpeg not found on PATH.\n' +
        '  macOS:  brew install ffmpeg\n' +
        '  Linux:  sudo apt install ffmpeg'
    );
    process.exit(3);
  }
}

async function main() {
  requireFfmpeg();
  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });

  const beforeHtml = readFileSync(join(FIXTURE, 'before.html'), 'utf8');
  const afterHtml = readFileSync(join(FIXTURE, 'after.html'), 'utf8');

  const browser = await openBrowser();
  let before;
  let after;
  try {
    before = await render(browser, beforeHtml, 'before.png');
    after = await render(browser, afterHtml, 'after.png');
  } finally {
    await browser.close();
  }

  if (after.violations !== 0) {
    console.error(
      `refusing to build the demo: the "after" fixture has ${after.violations} ` +
        'violations, so the animation would be a lie. Fix the fixture first.'
    );
    process.exit(1);
  }
  if (before.violations === 0) {
    console.error('refusing to build the demo: the "before" fixture has no violations to show.');
    process.exit(1);
  }

  const HOLD = 1.4;
  const FADE = 0.6;
  execFileSync(
    'ffmpeg',
    [
      '-y',
      '-loop', '1', '-t', String(HOLD), '-i', before.png,
      '-loop', '1', '-t', String(HOLD), '-i', after.png,
      '-filter_complex',
      '[0:v]scale=560:-1:flags=lanczos,setsar=1[a];' +
        '[1:v]scale=560:-1:flags=lanczos,setsar=1[b];' +
        `[a][b]xfade=transition=fade:duration=${FADE}:offset=${HOLD},split[p0][p1];` +
        '[p0]palettegen=stats_mode=diff[pal];[p1][pal]paletteuse=dither=bayer:bayer_scale=3',
      '-loop', '0',
      '-r', '12',
      OUT,
    ],
    { stdio: 'ignore' }
  );

  const size = readFileSync(OUT).length;
  console.log(
    `  wrote docs/demo.gif — ${(size / 1024).toFixed(0)} KB · ` +
      `before: ${before.violations} rules / ${before.nodes} elements → after: 0`
  );
  console.log(`  frames kept at ${FRAMES}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(3);
});
