---
name: skip-links
description: Use when a keyboard user must tab through the whole navigation on every page, when a "skip to content" link is unreachable or does nothing, or when focus lands in the wrong place after using one.
---

# Skip links

**Criteria:** SC 2.4.1 Bypass Blocks, SC 2.4.3 Focus Order, SC 2.4.7 Focus Visible, SC 1.3.1 Info and Relationships

A skip link is a small piece of markup with three independent failure points: it
must be reachable, it must be visible when it holds focus, and it must move focus —
not just the scroll position — to the target. The mistake that matters most is
hiding it with `display: none`, which removes it from the tab order and the
accessibility tree, so the one user it exists for can never reach it.

## When to use

- Tab lands on the logo and then walks the entire menu on every page.
- A "Skip to main content" link exists in the source but never appears.
- Activating the skip link scrolls but the next Tab jumps back into the navigation.
- Reviewing a template, a single-page app shell, or a design system's `Layout`.
- Deciding whether landmarks and headings already satisfy SC 2.4.1.

## Procedure

1. **Make it the first focusable element, and reachable (SC 2.4.1, SC 2.4.3).**
   SC 2.4.1 requires a mechanism to bypass repeated blocks; a skip link is the most
   robust one. SC 2.4.3 requires the focus order to preserve meaning and
   operability, so the link must be first in the *tab order*, which means first in
   the DOM — do not reorder it with CSS `order`, `float`, or absolute positioning
   that puts it after the navigation.

   ```html
   <!-- Fails SC 2.4.1 — display:none removes it from the tab order and the
        accessibility tree, so no keyboard user can reach it -->
   <a href="#main" style="display:none">Skip to main content</a>
   <header>…</header>

   <!-- Passes — first in the DOM, revealed on focus, and the target exists -->
   <a class="skip-link" href="#main">Skip to main content</a>
   <header>
     <nav aria-label="Primary">…</nav>
   </header>
   <main id="main" tabindex="-1">…</main>
   ```

2. **Reveal it on focus and keep it visible (SC 2.4.7).** SC 2.4.7 requires a
   visible focus indicator, and SC 1.4.11 asks that indicator to meet 3:1. Off-screen
   positioning is fine; `display: none` and `visibility: hidden` are not, because
   they defeat step 1.

   ```css
   /* Passes — off-canvas until focused, then on-screen and high-contrast */
   .skip-link {
     position: absolute;
     left: 0.5rem;
     top: 0.5rem;
     padding: 0.5rem 1rem;
     background: Canvas;
     color: CanvasText;
     border: 2px solid CanvasText;
     transform: translateY(-200%);
   }
   .skip-link:focus {
     transform: translateY(0);
     z-index: 100;
     outline: 3px solid CanvasText;
     outline-offset: 2px;
   }
   ```

   Use `transform`, not `left: -9999px`, so the browser does not scroll a long way
   to reach it; and never remove the `outline` on `:focus` for the link itself.

3. **Point the link at a focusable target (SC 2.4.1, SC 2.4.3).** The target needs
   a matching `id`. Browsers move the *sequential focus starting point* to a target
   on an in-page jump, but this is inconsistent across engines and assistive
   technologies, so add `tabindex="-1"` to the target to make it programmatically
   focusable and reliable.

   ```html
   <!-- Fails — href points nowhere; the click does nothing -->
   <a class="skip-link" href="#main">Skip to main content</a>
   <div id="content">…</div>

   <!-- Passes — the id matches and the target can receive focus -->
   <a class="skip-link" href="#main">Skip to main content</a>
   <main id="main" tabindex="-1">…</main>
   ```

   Some screen readers announce the `main` landmark's name when focus lands on it,
   which is why the target should itself be a landmark. If the target is not a
   landmark, the user lands on generic content with no announcement.

4. **Keep the landing spot clear of sticky headers (SC 2.4.1, SC 2.4.3).** A fixed
   header can cover the top of the target, hiding the first line and, for SC 2.4.11
   Focus Not Obscured (Minimum), the focused element. Reserve the space:

   ```css
   :root { --header-h: 64px; }
   [id] { scroll-margin-top: calc(var(--header-h) + 0.5rem); }
   ```

5. **Offer more than one destination when there is more than one repeated block
   (SC 2.4.1).** If a page has a search form, a mega-menu, and a long sidebar, a
   single "skip to content" still leaves the search in the path. Add per-block skip
   links in the same pattern: to navigation, to search, to the main content.

   ```html
   <a class="skip-link" href="#main">Skip to main content</a>
   <a class="skip-link" href="#search">Skip to search</a>
   <a class="skip-link" href="#primary-nav">Skip to navigation</a>
   ```

6. **Remember that landmarks and headings are an alternative mechanism
   (SC 2.4.1, SC 1.3.1).** A screen reader user can jump between landmarks or
   headings using the rotor or region list, which on its own satisfies SC 2.4.1.
   A skip link is still worth shipping because it is visible and works for sighted
   keyboard users, but it is not the only way to pass. See the
   `headings-and-landmarks` skill for the landmark side.

## Verify

The only real test is a keyboard walkthrough, in the browser you are shipping.

```html
<!-- Keyboard walkthrough, with the expected result per step. -->
<!-- 1. Load the page and press Tab once.                    -> the skip link is
         the focused element and is visible on screen
     2. Press Enter.                                          -> focus moves to
         <main>; #main is document.activeElement
     3. Press Tab.                                            -> focus is now the
         first interactive element inside <main>, NOT a nav item
     4. Press Shift+Tab.                                      -> focus returns into
         the content, not into the menu -->
```

```js
// SC 2.4.1 / SC 2.4.3 — the target must exist and end up focused.
const link = document.querySelector('.skip-link');
if (!link) {
  console.warn('SC 2.4.1: no skip link found (landmarks/headings may still satisfy it)');
} else {
  const id = link.getAttribute('href')?.slice(1);
  const target = id && document.getElementById(id);
  if (!target) console.warn('SC 2.4.1: skip target does not exist', link.getAttribute('href'));
  link.focus();
  const visible = link.getBoundingClientRect().width > 0 &&
    getComputedStyle(link).visibility !== 'hidden';
  link.click();
  console.log({
    'skip link visible on focus (SC 2.4.7)': visible,
    'focus moved to target (SC 2.4.3)': target ? document.activeElement === target : false,
    'target focusable': target ? getComputedStyle(target).display !== 'none' : false,
  });
}
```

If `document.activeElement` is the link itself after activation, focus did not
move: add `tabindex="-1"` to the target. This behaviour is engine- and
screen-reader-dependent, so confirming it in one browser is not proof it works in
another — test at least one Chromium browser, Firefox and Safari.

## Failure modes

- **`display: none` or `visibility: hidden` on the skip link.** It never appears,
  is never focusable, and a source-code review still finds the link and calls it
  done.
- **`href="#"` or a target `id` that does not exist.** The link renders, the styles
  look correct, and activating it does nothing — a silent no-op that fails
  SC 2.4.1.
- **Focus scrolled but not moved.** The page jumps to the content, the next Tab
  returns into the navigation, and the user is exactly where they started. The
  reliable fix is `tabindex="-1"` on the target.
- **A sticky header covering the landing spot.** The target scrolls to the very top
  of the viewport and the fixed header hides the first line, so the user lands on
  unseen content and, for a focusable target, fails SC 2.4.11 as well.
- **Skip links only for screen readers.** Positioning the link so it never shows
  on focus (`clip: rect(1024px, …)`, `outline: none`, `opacity: 0`) helps nobody
  visible and fails SC 2.4.7, which is about a visible focus indicator.
- **Skipping to a wrapper, not to the content.** The link points at a decorative
  hero or an empty `div` above the real content, so the user "skips" to another
  repeated block.
- **Order shuffled with CSS.** `position: absolute` or `order` that places a
  correctly-authored skip link after the navigation in the tab order fails the
  spirit of SC 2.4.3 even though the DOM looks right.
- **Overcorrection: a permanently visible skip bar.** Pinning the skip link open
  for everyone adds a control that sighted mouse users must scroll past on every
  page. It is not a failure, but it is the wrong fix for "it isn't showing" — that
  is almost always a CSS bug where the element never becomes visible at all, not
  a reason to pin it open for everyone.
