---
name: svg-and-icons
description: Use when adding an SVG, an icon font, or an icon-only button, when a screen reader announces an unlabelled graphic, or when an icon is invisible or conveyed only by colour against its background.
---

# SVG and icons

**Criteria:** SC 1.1.1 Non-text Content, SC 4.1.2 Name, Role, Value, SC 1.4.11 Non-text Contrast, SC 1.4.1 Use of Color

An icon has to answer one question before any markup is written: does it carry
meaning that the surrounding text does not? If it does, it needs a name and
enough contrast; if it does not, it must be hidden from assistive tech so it does
not add noise. The most common failure is an icon-only button whose only
content is an unlabelled `<svg>`, which a screen reader announces as a bare
"button" or ignores entirely.

## When to use

- An icon-only button, a logo, an inline `<svg>`, or an icon font.
- "The screen reader just says 'graphic'." / "It says 'button' and nothing else."
- "The search icon disappears on the hover state."
- Charts, star ratings, status dots, or any icon that carries information.

## Procedure

1. **Decide whether the icon is meaningful or decorative.** If the surrounding
   text already says it, the icon is decorative and must be hidden. If it is the
   only carrier of the meaning, it needs an accessible name (SC 1.1.1, SC 4.1.2).

2. **Name the control, not the graphic.** Put the label on the button and hide
   the icon inside it. A name on both produces a double or conflicting
   announcement.

   ```html
   <!-- Fails SC 4.1.2 — a button whose only content is an unlabelled graphic,
        announced as "button" with no name -->
   <button class="icon-btn">
     <svg viewBox="0 0 24 24"><path d="…"/></svg>
   </button>

   <!-- Fails SC 1.1.1 — the trash icon is the only indication of the action,
        and its glyph would otherwise be read as a private-use character -->
   <i class="icon icon-trash" aria-hidden="true"></i>
   ```

   ```html
   <!-- Passes SC 4.1.2 and SC 1.1.1 — name on the control, icon hidden -->
   <button type="button" class="icon-btn" aria-label="Search">
     <!-- focusable="false" keeps the svg out of the tab order in older engines -->
     <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
       <path d="…"/>
     </svg>
   </button>

   <!-- Passes SC 1.1.1 — a standalone meaningful SVG, named by its <title> -->
   <svg role="img" aria-labelledby="roi-title" viewBox="0 0 120 60">
     <title id="roi-title">Return on investment rose to 12% in March.</title>
     <path d="…"/>
   </svg>
   ```

3. **Make a standalone SVG expose `role="img"` and a name.** A `<title>` alone
   is unreliable; `role="img"` with `aria-labelledby` pointing at the `<title>`
   is the pattern that holds across screen readers. The `<title>` should be the
   first child.

4. **Do not adopt an icon font for meaning.** Private-use glyphs are announced as
   gibberish or silence, and they fail when the font does not load. Use inline
   SVG. If you inherit a font, pair the glyph with a real text label and hide the
   glyph from the accessibility tree.

5. **Keep contrast on the icon itself (SC 1.4.11).** Graphical objects and UI
   components need at least **3:1** against their adjacent colours. Drive the
   fill from the text colour so the icon inherits a passing colour, and check the
   icon against its real background — including hover, focus and disabled states.

   ```css
   /* Passes SC 1.4.11 — the icon inherits the text colour, so it meets 3:1
      wherever the text does, and the focus ring stays visible. */
   .icon-btn { color: #1f2933; background: #ffffff; }
   .icon-btn svg { fill: currentColor; }
   .icon-btn:focus-visible { outline: 2px solid #1f2933; outline-offset: 2px; }
   ```

6. **Never use colour alone (SC 1.4.1).** A status that changes from a green dot
   to a red dot conveys nothing to a user who cannot see the difference. Pair it
   with text or a shape change, and make sure the text alternative says which
   state it is.

7. **Name charts as a whole, and give a text alternative.** `role="img"` plus a
   concise `aria-label` names the chart; the underlying numbers still need to be
   available as text or a data table.

## Verify

Automated checks find a missing name, not a useless one. Verify by ear.

| Check | Passing looks like | Criterion |
|---|---|---|
| Tab to each icon-only button with a screen reader | "Search, button" — a role and a name | 4.1.2 |
| Read the page with a screen reader | decorative icons are silent; no "graphic, graphic" | 1.1.1 |
| Measure each icon and each state against its background | at least 3:1 | 1.4.11 |
| Convert the page to greyscale | no meaning is lost | 1.4.1 |

```js
// Assert a name on the control and that the graphic inside is hidden.
const btn = document.querySelector('.icon-btn');
const svg = btn.querySelector('svg');
console.assert(btn.getAttribute('aria-label')?.trim(), 'icon button has no accessible name');
console.assert(svg.getAttribute('aria-hidden') === 'true', 'decorative svg is exposed to AT');

// A standalone meaningful svg must expose role=img and a name.
const chart = document.querySelector('#roi');
console.assert(chart.getAttribute('role') === 'img', 'meaningful svg is not role=img');
console.assert(
  document.getElementById(chart.getAttribute('aria-labelledby'))?.textContent.trim(),
  'role=img svg has no accessible name'
);
```

The assertions above check the source, not the computed name. Confirm the spoken
name in the browser's accessibility tree or, better, with a screen reader.

## Failure modes

- **A `<svg>` with a `<title>` but no `role="img"`.** Some screen readers skip it
  and announce only the button around it, or nothing.
- **`aria-hidden="true"` on a meaningful graphic with no text alternative
  anywhere.** The icon is the action and the action disappears.
- **An icon font glyph read as a private-use character.** It sounds like noise,
  and it vanishes entirely when the webfont fails to load.
- **A label on both the button and the nested `<svg>`.** The control ends up with
  two names, and screen readers read one, the other, or both.
- **Using the `title` attribute as the only name.** It is a mouse tooltip: not
  reliably announced, and never shown on touch.
- **Colour as the only signal of state (SC 1.4.1).** A green or red indicator
  dot, a colour change on selected rows, or a red border as the sole error cue.
- **Contrast measured against the page while the icon sits on a coloured chip.**
  The measured pairing is not the pairing the user sees (SC 1.4.11).
- **Overcorrection — labelling every decorative icon.** A screen reader then
  reads "icon, icon, icon" through a toolbar that used to be quiet.
