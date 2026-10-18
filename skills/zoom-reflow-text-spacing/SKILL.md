---
name: zoom-reflow-text-spacing
description: Use when zooming or pinch-zoom breaks the layout, when text is clipped or overlaps at 320px or 400% zoom, when increasing text spacing cuts content off, when the viewport meta disables zoom, when the app only works in landscape, or when text is baked into an image.
---

# Zoom, reflow and text spacing

**Criteria:** SC 1.4.4 Resize Text, SC 1.4.10 Reflow, SC 1.4.12 Text Spacing, SC 1.4.5 Images of Text, SC 1.3.4 Orientation, SC 1.4.8 Visual Presentation

These criteria are all the same complaint from a different user: "I made the
screen work for me and your layout broke." The mistake that matters most is
treating overflow as a cosmetic problem and fixing it with `overflow: hidden`,
which hides the content instead of reflowing it — a double failure, because
SC 1.4.10 is about not losing information, and clipping is the most complete way
to lose it.

## When to use

- A user zooms to 400% and the page scrolls two-dimensionally.
- The viewport meta tag contains `user-scalable=no` or `maximum-scale=1`.
- A card, badge, or button clips its label when the user increases text spacing.
- Fixed heights and `white-space: nowrap` appear on text containers.
- The site works on a phone only in landscape, or shows "rotate your device".
- Headings, buttons or prices are exported as PNGs from a design tool.
- You are asked to add a "large text" or "comfortable reading" mode.

## Procedure

1. **Clear the viewport meta (SC 1.4.4).** Text must be resizable to 200% without
   loss of content or functionality and without assistive technology. Blocking the
   user's own zoom is the fastest way to fail.

   ```html
   <!-- Fails SC 1.4.4 — pinch-zoom is disabled on touch devices -->
   <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no">

   <!-- Passes — the user keeps their zoom -->
   <meta name="viewport" content="width=device-width, initial-scale=1">
   ```

2. **Size text in relative units and let containers grow (SC 1.4.4, SC 1.4.8).**
   `rem` for font size, `em` or unitless for line height, and no fixed pixel height
   on anything that holds text. SC 1.4.4 asks for 200%; setting the root font size
   in `px` and then refusing to scale it based on the user's preference defeats it.
   SC 1.4.8 (AAA) separately asks for resize to 150% without horizontal scrolling,
   which is a lower bar than SC 1.4.10 but reached the same way.

   ```css
   /* Fails SC 1.4.4 — text is clipped the moment it grows */
   .tag { font-size: 12px; height: 20px; overflow: hidden; }

   /* Passes — size relative to the root, height comes from the content */
   .tag { font-size: 0.75rem; padding: 0.25em 0.5em; overflow: visible; }
   ```

3. **Reflow at 320 CSS px (SC 1.4.10).** Content must be usable at a viewport width
   equivalent to 320 CSS px — 1280 CSS px at 400% zoom — with no horizontal
   scrolling (no two-dimensional scrolling for a block of content). Vertical
   scrolling is fine. The exception is content whose meaning or use requires two
   dimensions: data tables, maps, video, games, presentations, and toolbars that
   hold a row of controls. Those may scroll horizontally; everything else must wrap.

   ```css
   /* Fails SC 1.4.10 — a fixed shell forces sideways scrolling at 320px */
   .shell { width: 960px; }

   /* Fails too — 100vw includes the scrollbar and overflows by ~15px */
   .hero { width: 100vw; }

   /* Passes — fluid, wrapping, bounded by a measure instead of a pixel width */
   .shell { width: 100%; max-width: 72ch; margin-inline: auto; }
   .hero  { width: 100%; }
   ```

   Multi-column layouts use `flex-wrap: wrap` or `grid-template-columns:
   repeat(auto-fit, minmax(16rem, 1fr))`; they collapse to one column as the
   viewport narrows rather than overflowing it.

4. **Support the four text-spacing overrides (SC 1.4.12).** The user must be able
   to set all four of these and still get all content and functionality, with no
   clipping:

   | Property | Required value |
   |---|---|
   | Line height | 1.5 × the font size |
   | Paragraph spacing (space after) | 2 × the font size |
   | Letter spacing | 0.12em |
   | Word spacing | 0.16em |

   The value is what the *user* may set. Never set `!important` on your own spacing
   to block it, and never clip text whose box you fixed.

   ```css
   /* Fails SC 1.4.12 — a fixed height clips the label as spacing grows */
   .banner {
     height: 24px;
     line-height: 1.1;
     white-space: nowrap;
   }

   /* Passes — the box grows with the text, spacing is overridable */
   .banner {
     min-height: 1.5em;
     line-height: 1.5;
     overflow-wrap: anywhere;
   }
   ```

5. **Give the reader a mechanism for the SC 1.4.8 (AAA) presentation choices.** If
   you claim AAA, the page must offer a way to: choose foreground and background
   colours; limit the measure to 80 characters (40 for CJK); avoid justified text;
   reach line spacing of at least space-and-a-half within paragraphs with paragraph
   spacing at least 1.5× the line spacing; and resize text to 150% without
   horizontal scrolling. A reading mode, a stylesheet the page exposes, or
   sufficiently permissive CSS all count as the mechanism.

   ```css
   /* A defensible default that makes the AAA target reachable */
   .article {
     max-width: 70ch;      /* under the 80-character limit */
     text-align: start;    /* never justify */
     line-height: 1.6;     /* at least space-and-a-half */
   }
   ```

6. **Do not lock the page to one orientation (SC 1.3.4).** Content must work in
   both portrait and landscape unless a specific orientation is *essential* — a
   piano keyboard, a bank cheque scanner, a VR scene. Narrowing the column when the
   screen is short is layout, and fine; refusing to render at all is not.

   ```css
   /* Fails SC 1.3.4 — the whole app is unavailable to a phone held upright */
   @media (orientation: landscape) { .app { display: block } }
   .app { display: none }

   /* Passes — the layout responds to the available width and height */
   @media (orientation: landscape) and (max-height: 30rem) { .toolbar { position: static } }
   ```

   axe's `css-orientation-lock` rule looks for exactly this pattern: a media query
   on `orientation` that hides or reveals whole regions. It ships **disabled by
   default**, so a green audit says nothing about orientation. The mobile failure is
   common enough — "rotate your device", shown with an arrow — that it is worth
   grepping for `orientation` as a code review step.

7. **Use text, not a picture of text (SC 1.4.5).** An image of text cannot be
   resized, re-spaced, re-coloured, translated or read by a screen reader, so every
   criterion on this page fails for it at once. It is the one failure that no amount
   of good CSS can reach.

   ```html
   <!-- Fails SC 1.4.5 — the headline is a PNG from the design tool -->
   <img src="headline.png" alt="Save 30% this week">

   <!-- Passes — real text that scales with the reader's settings -->
   <h2 class="headline">Save 30% this week</h2>
   ```

   The exceptions are narrow and worth knowing exactly: logotypes — the wordmark
   itself, not the marketing headline next to it — and situations where the specific
   presentation is essential to the information, such as a font specimen or a
   screenshot of an interface being discussed. SC 1.4.9 removes even the exception
   path at AAA. In practice: SVG with real `<text>` is text; SVG with outlined paths
   is an image of text; a CSS background image of a headline is an image of text.

## Verify

Reflow is a viewport property, so resize the viewport; setting a width on the
document does not reproduce it.

```js
// SC 1.4.10 — run at a real 320px-wide viewport, not a style trick.
const overflowing = [...document.querySelectorAll('body *')]
  .filter((el) => el.scrollWidth > el.clientWidth + 1)
  .map((el) => `${el.tagName}.${el.className || ''} scrollWidth=${el.scrollWidth} clientWidth=${el.clientWidth}`);
console.log('page scrollWidth:', document.documentElement.scrollWidth, '(must be <= 320 at a 320px viewport)');
console.log(overflowing);
```

```js
// SC 1.4.12 — apply the spacing overrides and look for clipped content.
const style = document.createElement('style');
style.textContent = `
  * { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; }
  p { margin-bottom: 2em !important; }
`;
document.head.append(style);
const clipped = [...document.querySelectorAll('*')]
  .filter((el) => el.scrollHeight > el.clientHeight + 1 || el.scrollWidth > el.clientWidth + 1)
  .map((el) => `${el.tagName}.${el.className || ''}`);
console.warn('SC 1.4.12: possible clipping after spacing overrides:', clipped);
```

Walk it manually too: set the browser to 400% zoom at a 1280px window or resize to
320px, scroll the whole page and confirm nothing is cut off, no text overlaps, and
no control becomes unreachable. Automated overflow checks miss overlaps and
off-screen controls, so this step needs your eyes.

## Failure modes

- **`user-scalable=no` or `maximum-scale=1`.** The most common SC 1.4.4 failure in
  the wild, added to stop double-tap zoom on mobile. It removes the user's primary
  zoom path entirely.
- **`overflow: hidden` as the reflow fix.** The layout stops scrolling because the
  overflowing content is gone. This passes a crude "does it scroll sideways?" check
  and fails the actual requirement, which is no *loss* of content.
- **Fixed heights on text boxes.** `height` on a badge, tab, button or table row
  clips the moment the user applies text spacing or a larger font. `min-height`
  plus content-driven height is the fix.
- **`white-space: nowrap` on navigation and table cells.** It holds the layout at
  320px by pushing everything off-screen and creating the two-dimensional scroll
  that SC 1.4.10 forbids.
- **`width: 100vw`.** `100vw` includes the vertical scrollbar, so on any page tall
  enough to scroll it overflows horizontally by the scrollbar width. Use `100%`.
- **"Rotate your device" screens.** A full-page `orientation` media query that
  hides the app in portrait. It is a deliberate SC 1.3.4 failure, usually added to
  avoid fixing one landscape-only widget, and axe will not report it unless
  `css-orientation-lock` is enabled.
- **Text exported as an image.** A hero headline as a PNG or an outlined SVG path,
  usually because the webfont was inconvenient. Nothing in CSS can rescue it: it
  does not scale with the reader's font size, cannot take text spacing, and is
  invisible to search, translation and screen readers alike.
- **Testing reflow by narrowing the document, not the viewport.** `body { width:
  320px }` does not change media queries or viewport units, so it hides every real
  failure.
- **Overcorrection: collapsing everything to one column on desktop.** Fixing a
  too-wide desktop layout by removing all multi-column reading, or dropping the
  sticky header and every layout affordance, trades one usability problem for
  another. SC 1.4.10 is about the 320px width, not about abandoning the wide design.
- **Overcorrection: `!important` on your own line-height.** Pinning spacing to
  protect the design blocks SC 1.4.12 exactly: the user's overrides cannot take
  effect if yours win.
