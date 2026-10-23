#!/usr/bin/env node
/**
 * The fix suggester is the one place the CLI hands out a value instead of a
 * pointer. That makes it the one place a wrong answer is silently applied to
 * someone's page, so it gets the same treatment as the skills: the maths is
 * checked against known WCAG pairs, and every rule it claims to fix must still
 * exist in the axe snapshot.
 *
 * The end-to-end half lives in run-fixtures.js: for every fixture whose
 * before.html fails colour contrast, the harness applies the suggested colour in
 * a real browser and requires the finding to disappear.
 */

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { contrast, parseHex, passingColor, suggestFix } from '../lib/fixes.js';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const AXE = JSON.parse(readFileSync(join(ROOT, 'verify', 'axe-rules.json'), 'utf8')).rules;

let failures = 0;
const ok = (label) => console.log(`  ok    ${label}`);
const bad = (label, detail) => {
  failures++;
  console.log(`  FAIL  ${label}`);
  if (detail) console.log(`        ${detail}`);
};

function check(label, fn) {
  try {
    const problem = fn();
    if (problem) bad(label, problem);
    else ok(label);
  } catch (err) {
    bad(label, err.message);
  }
}

const eq = (actual, expected, what) =>
  actual === expected ? null : `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`;
const assert = (cond, msg) => (cond ? null : msg);

console.log('\nfix suggestions\n');

// --- the maths, against pairs whose ratios are published -------------------

check('parseHex accepts #rgb and #rrggbb, rejects everything else', () =>
  eq(parseHex('#fff')?.r, 255, '#fff r') ??
  eq(parseHex('#b0b0b0')?.g, 176, '#b0b0b0 g') ??
  assert(parseHex('rgba(0,0,0,0.5)') === null, 'rgba should be rejected') ??
  assert(parseHex('red') === null, 'named colour should be rejected')
);

check('black on white is 21:1, a colour against itself is 1:1', () =>
  eq(Math.round(contrast(parseHex('#000000'), parseHex('#ffffff'))), 21, 'black/white') ??
  eq(Number(contrast(parseHex('#777777'), parseHex('#777777')).toFixed(2)), 1, 'same colour')
);

check('#777777 on white is 4.48:1 and fails 4.5:1', () => {
  const r = contrast(parseHex('#777777'), parseHex('#ffffff'));
  return assert(r > 4.47 && r < 4.5, `expected ~4.478, got ${r.toFixed(5)}`);
});

check('#767676 on white is 4.54:1 and passes', () => {
  const r = contrast(parseHex('#767676'), parseHex('#ffffff'));
  return assert(r >= 4.5 && r < 4.6, `expected ~4.542, got ${r.toFixed(5)}`);
});

check('the suggestion for #777777 on white is #767676', () => {
  const s = passingColor('#777777', '#ffffff', 4.5);
  return assert(s !== null, 'no suggestion') ?? eq(s.hex, '#767676', 'hex');
});

check('every suggestion actually passes when recomputed from its hex', () => {
  const cases = [
    ['#777777', '#ffffff', 4.5],
    ['#b0b0b0', '#ffffff', 4.5],
    ['#a8a8a8', '#ffffff', 4.5],
    ['#b8b8b8', '#ffffff', 4.5],
    ['#000000', '#000000', 4.5],
    ['#cccccc', '#222222', 7],
  ];
  for (const [fg, bg, need] of cases) {
    const s = passingColor(fg, bg, need);
    if (!s) return `no suggestion for ${fg} on ${bg}`;
    const got = contrast(parseHex(s.hex), parseHex(bg));
    if (got < need) return `${fg} on ${bg}: suggested ${s.hex} is ${got.toFixed(2)}:1, below ${need}`;
    if (Math.abs(got - s.ratio) > 0.006) return `${fg} on ${bg}: reported ${s.ratio}, recomputed ${got}`;
  }
  return null;
});

check('white on mid grey moves the background, not the text', () => {
  const fix = suggestFix({
    rule: 'color-contrast',
    checks: [{ id: 'color-contrast', data: { fgColor: '#ffffff', bgColor: '#777777', contrastRatio: 4.48, expectedContrastRatio: '4.5:1' } }],
  });
  return (
    assert(fix !== null, 'expected a suggestion') ??
    eq(fix.kind, 'exact', 'kind') ??
    assert(/^background-color: #[0-9a-f]{6};$/.test(fix.snippet), `unexpected snippet: ${fix.snippet}`) ??
    assert(/shared with every descendant/.test(fix.note), 'should warn that the background is shared')
  );
});

check('a suggestion is never emitted for a finding that already passes', () =>
  assert(passingColor('#000000', '#ffffff', 4.5)?.changed === false, 'black on white should be marked unchanged')
);

// --- the structural snippets ----------------------------------------------

const fix = (rule, html = '', data = {}) =>
  suggestFix({ rule, html, checks: data ? [{ id: rule, data }] : [] });

check('label derives an id from name and attaches the label to it', () => {
  const f = fix('label', '<input type="email" name="email">');
  return (
    eq(f.kind, 'structure', 'kind') ??
    assert(f.snippet.includes('id="email"'), 'missing derived id') ??
    assert(f.snippet.includes('for="email"'), 'missing for') ??
    assert(/placeholder is not a label/.test(f.note), 'should warn about placeholders')
  );
});

check('label reuses an existing id instead of inventing a second one', () => {
  const f = fix('label', '<input id="contact-email" type="email">');
  return (
    assert(f.snippet.includes('for="contact-email"'), 'missing existing id') ??
    assert(!/id="contact-email"[^>]*id=/.test(f.snippet), 'duplicated id')
  );
});

check('image-alt offers the empty alt and says when it is wrong', () => {
  const f = fix('image-alt', '<img src="q3-revenue.png">');
  return (
    eq(f.snippet, 'alt=""', 'snippet') ??
    assert(/decorative/.test(f.note), 'should name the decorative case') ??
    assert(/file name is not alt text/.test(f.note), 'should refuse to invent alt text')
  );
});

check('html-has-lang and document-title are structural, not guessed', () => {
  const lang = fix('html-has-lang', '<html>');
  const title = fix('document-title', '<html><head></head></html>');
  return (
    eq(lang.kind, 'structure', 'lang kind') ??
    assert(lang.snippet.includes('lang="en"'), 'lang snippet') ??
    eq(title.kind, 'structure', 'title kind') ??
    assert(title.snippet.includes('<title>'), 'title snippet')
  );
});

check('meta-viewport removes only the zoom-blocking directives', () => {
  const html = '<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">';
  const f = fix('meta-viewport', html);
  return (
    eq(f.kind, 'exact', 'kind') ??
    eq(f.snippet, '<meta name="viewport" content="width=device-width, initial-scale=1">', 'snippet')
  );
});

check('target-size gives the number from SC 2.5.8', () => {
  const f = fix('target-size', '<button style="width:16px">×</button>');
  return (
    eq(f.kind, 'exact', 'kind') ??
    assert(f.snippet.includes('24px'), '24px missing') ??
    assert(/2\.5\.8/.test(f.note), 'criterion not named')
  );
});

check('unknown rules get no invented advice', () =>
  eq(suggestFix({ rule: 'not-a-rule', html: '<p>' }), null, 'unknown rule')
);

// --- every fixer must still be a rule axe ships ---------------------------

check('every rule with a fixer exists in the axe snapshot', () => {
  const fixed = [
    'color-contrast',
    'label',
    'button-name',
    'link-name',
    'image-alt',
    'html-has-lang',
    'document-title',
    'meta-viewport',
    'target-size',
    'aria-dialog-name',
  ];
  for (const id of fixed) if (!AXE[id]) return `'${id}' is not in verify/axe-rules.json — renamed or removed?`;
  return null;
});

console.log('');
if (failures) {
  console.log(`  ${failures} fix-suggestion ${failures === 1 ? 'check' : 'checks'} failed\n`);
  process.exit(1);
}
console.log('  fix suggestions agree with the WCAG contrast formula and the axe snapshot\n');
