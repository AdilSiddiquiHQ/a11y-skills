---
name: pointer-and-gestures
description: Use when a feature only works by dragging, swiping or pinching, when a control fires on pointer-down so it cannot be cancelled, when touch targets are too small, or when the app breaks when a second input device appears.
---

# Pointer and gestures

**Criteria:** SC 2.5.1 Pointer Gestures, SC 2.5.2 Pointer Cancellation, SC 2.5.5 Target Size (Enhanced), SC 2.5.6 Concurrent Input Mechanisms

Four criteria about the same surface: the screen, and how a finger, a stylus or a
mouse meets it. The failures here are invisible to a keyboard-only test and
invisible to a screen reader test, which is why they survive review — a drag-only
reorder control is perfectly accessible to everybody who can drag.

## When to use

- Reordering is drag-and-drop with no buttons.
- A carousel or sheet is dismissed by swipe only.
- A button fires on `pointerdown` or `mousedown`, so there is no way to slide off
  and cancel.
- Row actions are 16×16 icons at the edge of a table.
- "It stops working when I plug in a mouse" or "on my tablet with a keyboard".
- axe is installed and does not report any of this, which is expected — see below.

## Procedure

1. **Offer a single-pointer alternative to every multi-pointer gesture (SC 2.5.1).**
   The criterion is explicit and its exceptions are narrow: paths that are *essential*
   may require a gesture, everything else must have an alternative that works with a
   single pointer that does not move — one finger, one click, no dragging.

   ```html
   <!-- Fails SC 2.5.1 — the only way to reorder is a drag -->
   <li draggable="true">Milk</li>

   <!-- Passes — the drag stays, and buttons do the same job with one pointer -->
   <li>
     Milk
     <button type="button" data-move="up" aria-label="Move Milk up">↑</button>
     <button type="button" data-move="down" aria-label="Move Milk down">↓</button>
   </li>
   ```

   The exception is about the *meaning* of the path, not its difficulty: a
   signature pad, a drawing tool, a slider that sets a value by position. "Users
   expect to drag it" is not an exception. Pinch-to-zoom on a map has the
   conventional `+`/`−` alternative, so it needs one.

2. **Activate on pointer-up, and let the user cancel (SC 2.5.2).** At least one of
   these must hold, and the practical reading is the first: the down-event does not
   trigger anything, and the up-event or click does. A control that fires on
   `pointerdown` cannot be aborted by moving the finger away, which is how a user
   discovers mid-press that they hit the wrong thing.

   ```js
   // Fails SC 2.5.2 — no way back once the finger lands
   button.addEventListener('pointerdown', submit);

   // Passes — a click fires on pointer-up, and pointer-up elsewhere cancels it
   button.addEventListener('click', submit);
   ```

   The other two routes — undo afterwards, or "up-event reverses the down-event" —
   are almost always worse to build and worse to use. Up-event activation is the
   answer, and it is also what makes keyboard Enter/Space work for free.

3. **Make targets 44×44 if you can, 24×24 if you must (SC 2.5.5, SC 2.5.8).**
   WCAG 2.2 sets two bars and it is worth knowing which is which:

   | Criterion | Level | Minimum |
   |---|---|---|
   | SC 2.5.8 Target Size (Minimum) | AA | 24×24 CSS px |
   | SC 2.5.5 Target Size (Enhanced) | AAA | 44×44 CSS px |

   SC 2.5.8 has spacing and inline exceptions; SC 2.5.5 has fewer. Either way the
   fix is usually padding, not a bigger icon: an icon is a drawing, a target is the
   area that responds.

   ```css
   /* Fails SC 2.5.8 — the clickable area is the glyph */
   .row-action { width: 16px; height: 16px; }

   /* Passes both — 44px of hit area around a 16px icon */
   .row-action {
     display: inline-flex;
     align-items: center;
     justify-content: center;
     min-width: 44px;
     min-height: 44px;
   }
   ```

   **axe does not check this unless you ask.** Both its `target-size` rule and
   `p-as-heading` ship disabled by default, and `target-size` is the only automated
   check for SC 2.5.8 — a criterion WCAG 2.2 itself added. A clean audit therefore
   says nothing at all about target sizes. The fixture in
   `verify/fixtures/wcag22-new-criteria/undersized-targets/` enables the rule
   explicitly, which is the only way to test it.

4. **Do not assume one input device (SC 2.5.6).** A tablet with a keyboard attached,
   a phone with a Bluetooth mouse, a laptop with a touchscreen and a trackpad: all
   ordinary, and all break code that picks a single modality at load and disables the
   others.

   ```js
   // Fails SC 2.5.6 — the first pointer type seen wins, permanently
   if (isTouch()) document.body.classList.add('touch-only');

   // Fails too — a coarse pointer media query used to disable hover affordances
   // for a user who is currently using a mouse.

   // Passes — input methods are additive, and hover is a progressive enhancement
   matchMedia('(hover: hover)').addEventListener('change', (e) => {
     document.documentElement.classList.toggle('has-hover', e.matches);
   });
   ```

   The usual offender is `pointer: coarse` used to *disable* features rather than
   to adapt them, and `touchstart` handlers with `preventDefault()` that swallow the
   mouse or pen events behind them.

5. **Test with the pointer you do not use.** Open the page on a phone, on a tablet
   with a keyboard, and with a mouse. Try the feature with a trackpad *and* a
   touchscreen if the machine has both. Then try it with the keyboard alone: if a
   gesture has no single-pointer alternative, it has no keyboard path either.

## Verify

```js
// SC 2.5.1 / 2.5.5 — measure the target, not the icon. Anything under 24 is an
// SC 2.5.8 failure, anything under 44 misses the AAA bar in SC 2.5.5.
for (const el of document.querySelectorAll('a[href], button, [role="button"], input:not([type="hidden"]), select')) {
  const r = el.getBoundingClientRect();
  if (r.width === 0 || r.height === 0) continue; // hidden, not a target
  if (Math.min(r.width, r.height) < 44) {
    console.warn(
      `${Math.round(r.width)}×${Math.round(r.height)}  ${el.tagName.toLowerCase()}` +
        `  ${el.getAttribute('aria-label') || el.textContent.trim().slice(0, 24)}` +
        (Math.min(r.width, r.height) < 24 ? '  <- fails SC 2.5.8' : '  (fails SC 2.5.5 at AAA)')
    );
  }
}
```

```js
// SC 2.5.6 — did anything disable an input method outright?
const suspects = [...document.querySelectorAll('*')]
  .filter((el) => getComputedStyle(el).pointerEvents === 'none' && el.matches('a,button,input,select,textarea'))
  .map((el) => `${el.tagName.toLowerCase()} ${el.className}`);
console.warn('interactive elements with pointer-events: none', suspects);
```

Also grep the codebase for the patterns rather than trusting a runtime check:
`pointerdown`, `mousedown`, `touchstart`, `draggable`, `touch-action`, and
`preventDefault` inside any of them. Each one is a place where a finger and a mouse
were assumed to be the same device, or where the down-event was treated as a
decision.

Manual pass: on a touch device, press a button and slide your finger off it before
releasing — nothing should happen. Then plug in a mouse and use the same page
without reloading.

## Failure modes

- **Drag-only reordering.** The canonical SC 2.5.1 failure. It is not enough that a
  screen reader can read the list; the user must be able to reorder it without a
  drag, and a well-meant "keyboard support" that only adds arrow-key handlers while
  a drag is in progress does not count, because the mode has to be entered first.
- **Swipe-only dismissal.** A toast or bottom sheet closed by swiping. Provide a
  close button; an undo action covers SC 2.5.2 but not SC 2.5.1.
- **`pointerdown` as the commit.** Firing navigation, submission or deletion on
  pointer-down. The user cannot change their mind, and on a touchscreen a scrolling
  gesture that begins on the control triggers it.
- **Icon-sized targets.** A 16px SVG with no padding, especially in dense table
  rows, where the next target is one pixel away and a mis-tap does the wrong thing
  permanently. Padding the button is not the same as enlarging the icon.
- **Modality detection that disables a feature.** `if (isTouch) hideHoverMenu()`
  permanently removes affordances from a convertible laptop, and `touchstart` with
  `preventDefault()` swallows the click that a pen or a mouse would have produced.
- **Treating the passing axe run as coverage.** axe cannot see a drag handler, and
  its target-size check is off by default. Nothing in a default audit tests any of
  the four criteria in this skill.
- **Overcorrection: removing the gesture.** Deleting a swipe shortcut or a drag
  gesture to satisfy the criterion. SC 2.5.1 asks for an alternative, not for the
  gesture to be removed; gestures are often the fastest path for the users who can
  perform them.
