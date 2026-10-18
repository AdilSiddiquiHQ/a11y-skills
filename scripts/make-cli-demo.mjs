#!/usr/bin/env node
/**
 * Build docs/cli.gif — the terminal demo.
 *
 * Like scripts/make-demo.mjs, nothing here is hand-drawn. The two scenes run the
 * real CLI with colour forced on, capture its actual stdout, and render those
 * bytes inside a terminal card. If the CLI exits non-zero, prints "unknown
 * command", or produces no output, the script refuses to build rather than
 * screenshotting a broken demo.
 *
 * Rendering the terminal in HTML rather than grabbing a pty keeps the toolchain
 * to what this repository already has: Node, Playwright and ffmpeg. No Python, no
 * terminal emulator, no committed mystery binary.
 *
 *   npm run demo:cli
 */

import { spawnSync, execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { openBrowser, ROOT } from '../verify/axe.js';

const OUT = join(ROOT, 'docs', 'cli.gif');
const FRAMES = join(tmpdir(), 'a11y-skills-cli-demo');
const BIN = join(ROOT, 'bin', 'a11y-skills.js');

const SCENES = [
  { args: ['search', 'drag'] },
  { args: ['rules', 'color-contrast'] },
];

const WIDTH = 720;
const LINE_HEIGHT = 13 * 1.55;
const CHROME = 34 /* title bar */ + 14 + 14 /* padding */ + 6;

/** The only escape sequences the CLI emits. Anything else is passed through. */
const ANSI = {
  '1': { open: '<b>', close: '</b>' },
  '2': { open: '<span class="dim">', close: '</span>' },
  '32': { open: '<span class="green">', close: '</span>' },
};

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Convert the CLI's own ANSI output into markup. Reset closes everything open. */
function ansiToHtml(text) {
  let out = '';
  const stack = [];
  let i = 0;
  while (i < text.length) {
    const m = /\x1b\[([0-9;]*)m/.exec(text.slice(i));
    if (m && m.index === 0) {
      const code = m[1] || '0';
      if (code === '0') {
        while (stack.length) out += ANSI[stack.pop()].close;
      } else if (ANSI[code]) {
        out += ANSI[code].open;
        stack.push(code);
      }
      i += m[0].length;
    } else {
      out += escapeHtml(text[i]);
      i += 1;
    }
  }
  while (stack.length) out += ANSI[stack.pop()].close;
  return out;
}

function runScene(args) {
  const res = spawnSync(process.execPath, [BIN, ...args], {
    cwd: ROOT,
    encoding: 'utf8',
    env: { ...process.env, FORCE_COLOR: '1' },
  });
  const stdout = res.stdout ?? '';
  if (res.status !== 0) throw new Error(`\`a11y-skills ${args.join(' ')}\` exited ${res.status}`);
  if (!stdout.trim()) throw new Error(`\`a11y-skills ${args.join(' ')}\` printed nothing`);
  if (/unknown (command|option)|^Error/m.test(stdout)) {
    throw new Error(`\`a11y-skills ${args.join(' ')}\` printed an error`);
  }
  return { command: `a11y-skills ${args.join(' ')}`, output: stdout };
}

function sceneHtml({ command, output }) {
  const lines = ansiToHtml(output).replace(/\n+$/, '');
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><title>a11y-skills</title>
<style>
  html, body { margin: 0; height: 100%; }
  body {
    background: #0d1117;
    font: 13px/1.55 "SF Mono", Menlo, Consolas, "DejaVu Sans Mono", monospace;
    display: flex; align-items: stretch;
  }
  .term { flex: 1; display: flex; flex-direction: column; }
  .bar {
    height: 34px; flex: none; background: #161b22; display: flex; align-items: center;
    padding: 0 12px; gap: 7px; border-bottom: 1px solid #30363d;
  }
  .dot { width: 11px; height: 11px; border-radius: 50%; }
  .r { background: #ff5f57 } .y { background: #febc2e } .g { background: #28c840 }
  .cmd {
    margin-left: 10px; color: #8b949e; font-size: 12px;
    white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
  }
  .cmd b { color: #e6edf3; }
  pre {
    margin: 0; padding: 14px 16px; flex: 1; overflow: hidden;
    white-space: pre-wrap; word-break: break-word;
    color: #c9d1d9; font: inherit;
  }
  .dim { color: #7d8590 }
  .green { color: #3fb950 }
  b { color: #e6edf3; font-weight: 700 }
</style></head>
<body><div class="term">
  <div class="bar"><i class="dot r"></i><i class="dot y"></i><i class="dot g"></i>
    <span class="cmd"><b>$</b> ${escapeHtml(command)}</span></div>
  <pre>${lines}</pre>
</div></body></html>`;
}

/** Same guard as the fixture harness: the left-edge must not be a lie. */
function requireFfmpeg() {
  try {
    execFileSync('ffmpeg', ['-version'], { stdio: 'ignore' });
  } catch {
    console.error('ffmpeg not found on PATH. macOS: brew install ffmpeg');
    process.exit(3);
  }
}

async function main() {
  requireFfmpeg();
  rmSync(FRAMES, { recursive: true, force: true });
  mkdirSync(FRAMES, { recursive: true });

  const scenes = SCENES.map((scene) => runScene(scene.args));

  // Size the card to the longest scene so that nothing is ever clipped to make
  // the demo look tidier than the tool actually is. Both scenes get the same
  // height because a crossfade needs it, and ffmpeg would fail otherwise.
  const maxLines = Math.max(
    ...scenes.map((s) => s.output.replace(/\n+$/, '').split('\n').length)
  );
  const viewport = {
    width: WIDTH,
    height: Math.ceil(maxLines * LINE_HEIGHT + CHROME),
  };

  const browser = await openBrowser();
  const frames = [];
  try {
    for (const [i, scene] of scenes.entries()) {
      const page = await browser.newPage({ viewport, deviceScaleFactor: 2 });
      await page.setContent(sceneHtml(scene), { waitUntil: 'load' });
      const png = join(FRAMES, `scene-${i}.png`);
      await page.screenshot({ path: png });
      frames.push(png);
      await page.close();
    }
  } finally {
    await browser.close();
  }

  const args = ['-y'];
  for (const f of frames) args.push('-loop', '1', '-t', '1.6', '-i', f);
  const chain = frames
    .map((_, i) => `[${i}:v]scale=${WIDTH}:-1:flags=lanczos,setsar=1[s${i}]`)
    .join(';');
  const xfade =
    frames.length > 1
      ? `[s0][s1]xfade=transition=fade:duration=0.5:offset=1.4[out]`
      : `[s0]null[out]`;
  // Flat terminal colours and no dither: dithering noise is most of the file
  // size in a GIF like this, and there is no gradient for it to smooth.
  args.push(
    '-filter_complex',
    `${chain};${xfade};[out]split[p0][p1];[p0]palettegen=max_colors=32:stats_mode=single[pal];` +
      '[p1][pal]paletteuse=dither=none',
    '-loop',
    '0',
    '-r',
    '8',
    OUT
  );
  execFileSync('ffmpeg', args, { stdio: 'ignore' });

  const size = readFileSync(OUT).length;
  console.log(`  wrote docs/cli.gif — ${(size / 1024).toFixed(0)} KB · ${scenes.length} scenes`);
  for (const s of scenes) console.log(`    $ ${s.command} (${s.output.trimEnd().split('\n').length} lines)`);
}

main().catch((err) => {
  console.error(`refusing to build the CLI demo: ${err.message}`);
  process.exit(1);
});
