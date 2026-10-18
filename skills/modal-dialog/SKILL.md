---
name: modal-dialog
description: Use when a dialog opens and Tab goes behind it, when focus is lost or jumps to the top of the page after closing, or when Escape does not close the dialog.
---

# Modal dialog

**Criteria:** SC 2.1.1 Keyboard, SC 2.1.2 No Keyboard Trap, SC 2.4.3 Focus Order, SC 4.1.2 Name, Role, Value

A modal dialog is the one component where containing focus is correct, and the
platform gives it to you. `<dialog>` with `showModal()` contains focus, closes on
`Escape`, and makes the rest of the page inert. The mistake that matters most is
a hand-built `role="dialog"` overlay: focus escapes behind it, `Escape` stops
working, and the page underneath stays reachable.

## When to use

- "The dialog opens but Tab goes behind it."
- "After I close it, focus jumps back to the top of the page."
- "Escape does not close it — I have to hunt for the X."
- Reviewing any `role="dialog"` or `aria-modal="true"` implementation.

## Procedure

1. **Reach for the native element first.** `<dialog>` is a modal dialog, and
   `showModal()` is what makes it modal. `show()` does not.

   ```html
   <!-- Fails SC 4.1.2 — a role with no accessible name, and no modal behaviour -->
   <div class="modal" role="dialog" aria-modal="true">
     <h2>Delete file?</h2>
     <button>Delete</button>
   </div>

   <!-- Passes — the platform supplies containment, Escape, and inertness -->
   <dialog id="confirm" aria-labelledby="confirm-title">
     <h2 id="confirm-title">Delete file?</h2>
     <form method="dialog">
       <button value="cancel">Cancel</button>
       <button value="confirm">Delete</button>
     </form>
   </dialog>
   ```

2. **Give it a name.** `role="dialog"` has no implicit name, so SC 4.1.2 requires
   `aria-labelledby` pointing at the visible title (preferred) or an `aria-label`.
   A dialog whose title is rendered in a `<div>` with no id is unnamed.

3. **Move focus in on open, and return it to the opener on close.** `showModal()`
   handles the first part by focusing the first focusable descendant or an
   element carrying `autofocus`. Wire the second part yourself.

   ```js
   const dialog = document.getElementById('confirm');
   const opener = document.activeElement;            // capture before opening

   dialog.addEventListener('close', () => opener?.focus()); // not document.body
   dialog.showModal();
   ```

4. **Let `Escape` close it.** `showModal()` handles `Escape` unless a `cancel`
   handler calls `preventDefault()`. If you intercept it, you must still provide
   another keyboard route out, or you have built a keyboard trap (SC 2.1.2).

5. **Cycle Tab within the modal.** This containment is deliberate and is *not* a
   violation of SC 2.1.2 for a modal dialog, because `Escape` releases it. A
   non-modal dialog, popover, menu, or tooltip must release focus on Tab.
   `<dialog>` handles the cycle in modal mode.

6. **Keep the background unreachable, not merely dimmed.** Prefer the `inert`
   attribute over `aria-hidden="true"`: `inert` removes a subtree from the tab
   order and the accessibility tree together, while `aria-hidden` alone leaves
   controls focusable but invisible to assistive technology.

7. **If you cannot use `<dialog>`** — say an old runtime without `showModal()` —
   you take on all of it: `role="dialog"`, `aria-modal="true"`, a name, an
   `Escape` handler, the Tab cycle, moving focus in, restoring focus on close,
   and `inert` on the background. Write each of those down and test each one; a
   partial reimplementation is the norm, not the exception.

## Verify

Test with the keyboard only, in this order — each step fails a specific criterion:

| Do this | Passing looks like | Criterion |
|---|---|---|
| Open the dialog | focus lands on the dialog or its first meaningful control, and the title is announced | 2.4.3, 4.1.2 |
| Press Tab repeatedly to the end | focus cycles inside the dialog, then wraps to the start; it never appears behind the overlay | 2.1.1, 2.4.3 |
| Operate every control with Enter and Space | each one activates | 2.1.1 |
| Press Escape | the dialog closes and focus is back on the button that opened it | 2.1.2, 2.4.3 |
| Reopen and close twice | focus returns to the same opener each time | 2.4.3 |

Then assert the name in code. Automated rules catch a missing name; whether focus
moved to the right control is a judgement call and must be walked with the
keyboard.

```js
const dialog = document.querySelector('dialog[open]');
// The name lives in the accessibility tree, so confirm the reference resolves.
const labelledby = dialog?.getAttribute('aria-labelledby');
console.assert(labelledby && document.getElementById(labelledby),
  'SC 4.1.2: dialog has no accessible name');
```

## Failure modes

- **`aria-modal="true"` on a `div` with no trap and no `Escape`.** The screen
  reader stops reading the background, so the user believes they are contained,
  while Tab walks straight out and there is no way back. It is worse than an
  unlabelled dialog.
- **`aria-hidden="true"` on a container that still holds the focus.** Focus can
  remain inside a hidden subtree: the focused control vanishes from the
  accessibility tree while still receiving keystrokes.
- **Returning focus to `document.body`.** The keyboard user restarts Tab from
  the top of a long page. Restore focus to the opener, and if the opener is gone,
  to the nearest surviving control.
- **`show()` instead of `showModal()`.** The dialog renders centred and looks
  modal, but the trap, the `Escape` key, and the inert background are all absent.
- **`Escape` swallowed by an input handler.** A keydown listener that calls
  `stopPropagation()`, or a `cancel` handler calling `preventDefault()` without an
  alternative, strands keyboard users inside the dialog.
- **Focusing the close button instead of the title or the first task control.**
  It is technically inside the dialog, so it passes a casual review, but it hides
  the dialog's context from screen reader users.
