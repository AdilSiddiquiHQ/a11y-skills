---
name: tooltip-popover
description: Use when a tooltip only appears on hover and not on keyboard focus, when it vanishes as the pointer moves onto it, or when Escape does not dismiss it.
---

# Tooltip and popover

**Criteria:** SC 1.4.13 Content on Hover or Focus, SC 2.1.1 Keyboard, SC 4.1.2 Name, Role, Value, SC 1.4.11 Non-text Contrast

A tooltip is short, non-interactive text revealed on hover and on focus. The
WAI-ARIA Authoring Practices
[Tooltip](https://www.w3.org/WAI/ARIA/apg/patterns/tooltip/) pattern requires that
it be dismissible, hoverable, and persistent, which is SC 1.4.13 verbatim. The
mistake that matters most is wiring it to `mouseover` alone: keyboard users never
see it, and the `title` attribute is not a substitute you control.

## When to use

- "The tooltip shows on hover but not when I Tab to the button."
- "It disappears the moment I move my pointer towards it."
- "Escape does nothing; I have to move the mouse away to get rid of it."
- Building or reviewing a `role="tooltip"` or a `popover`.

## Procedure

1. **Decide whether it is a tooltip at all.** A tooltip is supplementary text with
   no interactive content. If it holds a link or a button, or if the user must read
   it to finish the task, it is a disclosure, a popover, or a dialog, not a
   tooltip. Put essential instructions in the page, not in a tooltip.

2. **Open on focus as well as hover, and connect it to the trigger with
   `aria-describedby`.**

   ```html
   <!-- Fails SC 1.4.13 and SC 2.1.1: hover-only, not focusable, no Escape, no name -->
   <span class="icon" onmouseover="show()" onmouseout="hide()">?</span>

   <!-- Passes — focusable trigger, keyboard focus opens it, reference resolves -->
   <button type="button" aria-describedby="tip-1">Estimated delivery</button>
   <div id="tip-1" role="tooltip">Arrives in 2–3 working days</div>
   ```

   A `<button>` is focusable by default, so SC 2.1.1 is met before any script
   runs. If the trigger is an icon with no text, it needs `aria-label` (SC 4.1.2);
   `aria-describedby` adds a description, not a name.

3. **Implement the three SC 1.4.13 requirements exactly.** The tooltip must be
   dismissible without moving focus, hoverable, and persistent.

   ```js
   trigger.addEventListener('focus', show);      // keyboard users get it too
   trigger.addEventListener('blur', hide);
   trigger.addEventListener('mouseenter', show);
   trigger.addEventListener('mouseleave', (e) => {
     if (!tip.contains(e.relatedTarget)) hide(); // hoverable: survive the travel
   });
   document.addEventListener('keydown', (e) => {
     if (e.key === 'Escape' && isVisible) hide(); // dismissible: focus does not move
   });
   ```

4. **Do not move focus into a tooltip.** It has no focusable content, so focus
   stays on the trigger and `aria-describedby` does the announcing.

5. **Let it persist.** Keep the tooltip visible until the user blur, moves the
   pointer away, presses Escape, or the content stops being valid. A fixed timer
   that hides it is a failure of the persistent requirement.

6. **Meet the contrast floors.** The icon or indicator that reveals the tooltip is
   non-text content that conveys meaning, so it needs at least 3:1 against its
   background at its smallest rendered size (SC 1.4.11 Non-text Contrast). If the
   tooltip's own background is distinguished from the page only by a border, that
   boundary is the same kind of visual information and needs the same 3:1.

7. **Prefer the platform for interactive popovers.** Where the content is
   interactive, the `popover` attribute puts it in the top layer, gives light
   dismiss, and closes it on Escape for free, which is most of SC 1.4.13 and
   removes the z-index and clipping problems a hand-positioned bubble has.

## Verify

| Do this | Passing looks like | Criterion |
|---|---|---|
| Tab to the trigger | the tooltip appears and is announced as a description | 2.1.1, 4.1.2 |
| Press Escape while it is showing | it dismisses and focus stays on the trigger | 1.4.13 |
| Hover the trigger, then move the pointer onto the tooltip | it stays visible while the pointer is on it | 1.4.13 |
| Wait with the pointer resting on the tooltip | it does not disappear on its own | 1.4.13 |
| Blur or move the pointer away | it hides | 1.4.13 |
| Check the trigger icon against its background | the graphic is at least 3:1 | 1.4.11 |

The contrast figure is measurable; whether the tooltip is useful is not. Measure
the ratio, do not eyeball it.

```js
const trigger = document.querySelector('[aria-describedby]');
const id = trigger.getAttribute('aria-describedby');
const tip = document.getElementById(id);
console.assert(tip && tip.getAttribute('role') === 'tooltip',
  'SC 4.1.2: aria-describedby does not resolve to a tooltip');
```

## Failure modes

- **Hover-only tooltips.** The listener is on `mouseover` and nothing is on
  `focus`, so a keyboard user never receives the information the tooltip carries
  (SC 1.4.13, SC 2.1.1).
- **A tooltip that disappears as the pointer travels to it.** `mouseleave` on the
  trigger fires before the pointer reaches the bubble, so its content cannot be
  read or, worse, anything inside it cannot be reached. This is the hoverable
  requirement of SC 1.4.13.
- **`Escape` not handled.** The only way to dismiss the tooltip is to move the
  pointer or focus away, which is the dismissible requirement of SC 1.4.13.
- **A timer hides the tooltip after a fixed delay.** It disappears while the user
  is still reading, which is the persistent requirement of SC 1.4.13.
- **`aria-describedby` pointing at a `display: none` or `aria-hidden="true"`
  element.** The reference resolves in the DOM but the text is not exposed, so
  nothing is announced (SC 4.1.2).
- **The `title` attribute used as the tooltip.** It cannot be styled, cannot be
  dismissed, appears on hover only, and is inconsistently exposed, so it fails the
  hoverable, dismissible, and keyboard requirements at once.
- **Interactive content inside a `role="tooltip"`.** A link or button in a tooltip
  cannot be focused, because focus never enters a tooltip; that content belongs in
  a popover or dialog (SC 2.1.1).
- **A low-contrast trigger icon.** A light-grey glyph on white at around 2:1 is
  the sole visual cue for a control and fails the 3:1 floor (SC 1.4.11).
