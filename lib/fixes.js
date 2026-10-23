/**
 * Turn an axe finding into the change that removes it.
 *
 * The reason this exists: `axe` tells you a paragraph is 2.16:1 against its
 * background and links to a help page. It does not tell you which colour to use.
 * An agent asked to fix that will guess, and a guess is how you get `#767676`
 * on one line and `#777777` on the next.
 *
 * Two kinds of answer, and the difference is the whole point:
 *
 *   exact      the value is computed, so there is one right answer.
 *              Colour contrast, the viewport tag, the minimum target size.
 *   structure  the shape of the fix is determined, the words are not.
 *              A label's text is yours to write; that it needs a `for` pointing
 *              at an id is not a matter of taste.
 *
 * Nothing here invents content. A function that guessed `alt="Chart of Q3
 * revenue"` from a file name would be wrong often enough to be worse than no
 * suggestion, and this repository does not ship advice it cannot stand behind.
 * Where a value is unknowable, the snippet says so in angle brackets.
 *
 * Everything is pure: no filesystem, no browser, no dependencies. The fixture run
 * feeds this real axe output and checks that applying the result actually clears
 * the finding.
 */

const HEX = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i;

/** Parse `#rgb` or `#rrggbb`. Returns null for anything else, including rgba. */
export function parseHex(value) {
  if (typeof value !== 'string') return null;
  const s = value.trim();
  if (!HEX.test(s)) return null;
  const h = s.slice(1);
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
  return {
    r: parseInt(full.slice(0, 2), 16),
    g: parseInt(full.slice(2, 4), 16),
    b: parseInt(full.slice(4, 6), 16),
  };
}

const toHex = ({ r, g, b }) =>
  '#' + [r, g, b].map((c) => Math.max(0, Math.min(255, Math.round(c))).toString(16).padStart(2, '0')).join('');

/** WCAG 2.x relative luminance. The 0.03928 threshold is from the definition. */
export function luminance({ r, g, b }) {
  const channel = (v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio, 1 to 21. Order does not matter. */
export function contrast(a, b) {
  const la = luminance(a);
  const lb = luminance(b);
  const [hi, lo] = la >= lb ? [la, lb] : [lb, la];
  return (hi + 0.05) / (lo + 0.05);
}

const blend = (fg, toward, t) => ({
  r: fg.r + (toward.r - fg.r) * t,
  g: fg.g + (toward.g - fg.g) * t,
  b: fg.b + (toward.b - fg.b) * t,
});

/**
 * The smallest step from `fg` toward black or white that reaches `required`
 * against `bg`, at 8 bits per channel.
 *
 * Returns null when the text is already the extreme in both directions — white
 * text on a mid grey cannot be fixed by changing the text, only the background,
 * and pretending otherwise would send someone in a circle.
 */
export function passingColor(fgHex, bgHex, required) {
  const fg = parseHex(fgHex);
  const bg = parseHex(bgHex);
  if (!fg || !bg || !(required > 0)) return null;
  if (contrast(fg, bg) >= required) return { hex: toHex(fg), ratio: contrast(fg, bg), changed: false };

  const attempts = [];
  for (const [direction, toward] of [
    ['darker', { r: 0, g: 0, b: 0 }],
    ['lighter', { r: 255, g: 255, b: 255 }],
  ]) {
    if (contrast(toward, bg) < required) continue;

    let lo = 0;
    let hi = 1;
    for (let i = 0; i < 60; i++) {
      const mid = (lo + hi) / 2;
      if (contrast(blend(fg, toward, mid), bg) >= required) hi = mid;
      else lo = mid;
    }

    // Round to what CSS can actually express, then walk the last few 8-bit steps
    // until the rounded colour really passes. A suggestion that is correct in
    // floating point and fails in a browser is the exact bug this library exists
    // to avoid.
    let candidate = blend(fg, toward, hi);
    let hex = toHex(candidate);
    let ratio = contrast(parseHex(hex), bg);
    for (let step = 0; step < 255 && ratio < required; step++) {
      candidate = {
        r: candidate.r + (toward.r - candidate.r) * 0.004,
        g: candidate.g + (toward.g - candidate.g) * 0.004,
        b: candidate.b + (toward.b - candidate.b) * 0.004,
      };
      hex = toHex(candidate);
      ratio = contrast(parseHex(hex), bg);
    }
    if (ratio >= required) attempts.push({ hex, ratio, direction, travelled: hi });
  }

  if (attempts.length === 0) return null;
  attempts.sort((a, b) => a.travelled - b.travelled);
  return { ...attempts[0], changed: true };
}

const round2 = (n) => Math.round(n * 100) / 100;

/**
 * The smallest change that reaches `required`, and which side of the pair it is
 * on.
 *
 * Changing the text is usually the right lever, but not always: white text on a
 * mid grey cannot be fixed by moving the text at all without turning it almost
 * black, while moving the grey one step fixes it. Picking the smaller move is
 * the difference between advice someone follows and advice someone ignores.
 *
 * `travelled` is the fraction of the way to black or white, so it is a rough
 * perceptual cost and comparable between the two sides.
 */
export function smallestFix(fgHex, bgHex, required) {
  const fg = parseHex(fgHex);
  const bg = parseHex(bgHex);
  if (!fg || !bg) return null;
  if (contrast(fg, bg) >= required) return null;

  const candidates = [];
  const text = passingColor(fgHex, bgHex, required);
  if (text?.changed) candidates.push({ target: 'text', ...text });
  // Symmetric ratio, so moving the background is the same calculation with the
  // roles swapped: the colour that must move is passed as the first argument.
  const background = passingColor(bgHex, fgHex, required);
  if (background?.changed) candidates.push({ target: 'background', ...background });

  if (candidates.length === 0) return null;
  candidates.sort((a, b) => a.travelled - b.travelled);
  return candidates[0];
}

function parseRequired(value) {
  const m = /([\d.]+)/.exec(String(value ?? ''));
  return m ? Number(m[1]) : null;
}

const attr = (html, name) => {
  const m = new RegExp(`\\b${name}\\s*=\\s*("([^"]*)"|'([^']*)')`, 'i').exec(html || '');
  return m ? (m[2] ?? m[3]) : null;
};

/** A stable id to associate a label with, derived from what the control says. */
function deriveId(html) {
  const existing = attr(html, 'id');
  if (existing) return { id: existing, existing: true };
  const base =
    attr(html, 'name') ||
    attr(html, 'type') ||
    (/\btextarea\b/i.test(html) ? 'message' : '') ||
    (/\bselect\b/i.test(html) ? 'choice' : '') ||
    'field';
  const id = base
    .toLowerCase()
    .replace(/[^a-z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'field';
  return { id, existing: false };
}

function metaViewport(html) {
  const content = attr(html, 'content');
  if (content === null) return null;
  const kept = content
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s) => !/^(maximum-scale|user-scalable)\s*=/i.test(s));
  if (kept.length === content.split(',').filter((s) => s.trim()).length) return null;
  return `<meta name="viewport" content="${kept.join(', ')}">`;
}

/**
 * @param {{ rule: string, html?: string, target?: string, checks?: Array<{id:string,data:object|null}> }} finding
 * @returns {{ kind: 'exact'|'structure', snippet: string, note: string } | null}
 */
export function suggestFix(finding) {
  const { rule, html = '', checks = [] } = finding || {};
  const data = checks.find((c) => c?.data)?.data ?? {};

  if (rule === 'color-contrast') {
    const required = parseRequired(data.expectedContrastRatio);
    if (!required) return null;
    const bg = typeof data.bgColor === 'string' ? data.bgColor : null;
    if (!bg || !parseHex(bg)) return null;
    const fg = typeof data.fgColor === 'string' ? data.fgColor : null;
    if (!fg || !parseHex(fg)) return null;
    const result = smallestFix(fg, bg, required);
    if (!result) {
      return {
        kind: 'structure',
        snippet: `background-color: <not ${bg}>;`,
        note: `The text is ${fg} and the background is ${bg}. Neither side can move far enough to reach ${required}:1 without a redesign of the pair.`,
      };
    }
    const was = round2(Number(data.contrastRatio ?? contrast(parseHex(fg), parseHex(bg))));
    if (result.target === 'background') {
      return {
        kind: 'exact',
        snippet: `background-color: ${result.hex};`,
        note: `Keeps the text at ${fg} and gives ${round2(result.ratio)}:1, was ${was}:1 — a ${Math.round(result.travelled * 100)}% move of the background, versus ${Math.round((1 - result.travelled) * 100)}%+ of the text. This background is shared with every descendant drawn on it; check them after applying.`,
      };
    }
    return {
      kind: 'exact',
      snippet: `color: ${result.hex};`,
      note: `${round2(result.ratio)}:1 on ${bg}, was ${was}:1. ${result.direction} by ${Math.round(result.travelled * 100)}%.`,
    };
  }

  if (rule === 'label') {
    const { id, existing } = deriveId(html);
    const control = /^<\s*(input|select|textarea)\b[^>]*>/i.exec(html)?.[0] ?? '';
    const withId = existing
      ? control
      : control.replace(/^<\s*(input|select|textarea)\b/i, (m) => `${m} id="${id}"`);
    return {
      kind: 'structure',
      snippet: [`<label for="${id}">Label text</label>`, withId].filter(Boolean).join('\n'),
      note: existing
        ? `The control already has id="${id}". The words are yours; the association is the fix.`
        : `Add id="${id}" and a label pointing at it. The words are yours; the association is the fix. A placeholder is not a label.`,
    };
  }

  if (rule === 'button-name' || rule === 'link-name') {
    const what = rule === 'button-name' ? 'button' : 'link';
    const visible = /<(button|a)\b[^>]*>\s*([A-Za-z][^<]{1,60})</i.exec(html)?.[2]?.trim();
    return {
      kind: 'structure',
      snippet: visible ? `<!-- visible text "${visible}" is enough; do not add aria-label as well -->` : `aria-label="What this ${what} does"`,
      note: visible
        ? 'A name from visible text is better than an attribute; an aria-label replaces the text a screen reader reads.'
        : `An icon-only ${what} needs a name. aria-label is the shortest correct fix; visually hidden text is the more robust one.`,
    };
  }

  if (rule === 'image-alt') {
    return {
      kind: 'structure',
      snippet: 'alt=""',
      note: 'Correct and complete if the image is decorative. If it carries meaning, write the text instead — a file name is not alt text.',
    };
  }

  if (rule === 'html-has-lang') {
    return {
      kind: 'structure',
      snippet: '<html lang="en">',
      note: 'Use the page\'s actual language subtag (en, de, ar, zh-Hant). A wrong lang is worse than none: a screen reader will switch voice and mispronounce everything.',
    };
  }

  if (rule === 'document-title') {
    return {
      kind: 'structure',
      snippet: '<title>Page name — Site name</title>',
      note: 'The title is what a screen reader announces first and what a tab shows. Put the page-specific part first.',
    };
  }

  if (rule === 'meta-viewport') {
    const fix = metaViewport(html);
    if (!fix) return null;
    return {
      kind: 'exact',
      snippet: fix,
      note: 'maximum-scale and user-scalable=no block pinch zoom, which fails SC 1.4.4. Keep the rest of the directives.',
    };
  }

  if (rule === 'target-size') {
    return {
      kind: 'exact',
      snippet: 'min-width: 24px;\nmin-height: 24px;',
      note: 'SC 2.5.8 requires 24×24 CSS px, or enough spacing that a 24px circle centred on the target does not overlap another. Size is the simpler of the two.',
    };
  }

  if (rule === 'aria-dialog-name') {
    return {
      kind: 'structure',
      snippet: 'aria-labelledby="dialog-title"\n<h2 id="dialog-title">…</h2>',
      note: 'Point the dialog at the heading it already contains. Do not duplicate the heading text in aria-label; a visible heading that is also the name is the more robust pattern.',
    };
  }

  return null;
}
