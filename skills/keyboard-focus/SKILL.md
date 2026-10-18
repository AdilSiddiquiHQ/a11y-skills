---
name: keyboard-focus
description: Use when something cannot be operated without a mouse, when focus order or a focus indicator is wrong, when a dialog or menu loses focus, or when a sticky header hides the focused control.
---

# Keyboard and focus

**Criteria:** SC 2.1.1 Keyboard, SC 2.1.2 No Keyboard Trap, SC 2.1.3 Keyboard (No Exception), SC 2.1.4 Character Key Shortcuts, SC 2.4.3 Focus Order, SC 2.4.7 Focus Visible, SC 2.4.11 Focus Not Obscured (Minimum), SC 1.4.13 Content on Hover or Focus

Make a component fully operable from the keyboard, keep focus order sane, make
the focus indicator visible, and keep it from being hidden behind your own UI.

## When to use

- "You can't reach this with Tab." / "The focus ring disappeared."
- Building or reviewing a dialog, menu, combobox, tooltip, or custom control.
- A sticky header, footer, banner or chat widget covers the page.
- Focus jumps somewhere unexpected after an action.

## Procedure

1. **Tab through it once and write down the order.** Not what the DOM order is —
   the order focus actually lands. The two differ whenever `tabindex` is
   positive or CSS reorders visually (`flex-direction: row-reverse`, absolute
   positioning, grid ordering).

   The rule: **DOM order must match visual order.** Fix the DOM, not the visual
   design. A positive `tabindex` is almost always the wrong fix.

   ```html
   <!-- Fails SC 2.4.3: focus order (1, 2) does not match visual order (2, 1) -->
   <div style="display:flex; flex-direction:row-reverse">
     <button style="order:2">Second visually</button>
     <button style="order:1">First visually</button>
   </div>
   ```

2. **Reach every interactive thing.** A `div` with an `onclick` is not focusable
   and does not respond to Enter or Space. Use the element that already has the
   behaviour:

   ```html
   <!-- Fails SC 2.1.1 and SC 4.1.2 -->
   <div class="btn" onclick="save()">Save</div>

   <!-- Passes: focusable, correct role, keyboard-activated -->
   <button type="button" onclick="save()">Save</button>
   ```

   If a native element truly cannot be used, the replacement must supply
   `tabindex="0"`, the role, and both Enter and Space handling. Say so
   explicitly, because a partial reimplementation is the most common way this
   goes wrong.

3. **Keep a visible indicator, and keep it the same everywhere.** Do not remove
   the outline without replacing it with something at least as visible. A ring
   that is `1px` of a colour at 1.5:1 contrast is not "visible" in any useful
   sense.

   ```css
   /* Passes SC 2.4.7: a 2px ring at 3:1 against both the control and the page */
   :focus-visible { outline: 2px solid #005fcc; outline-offset: 2px; }
   /* Do NOT write `outline: none` without a replacement on the same rule. */
   ```

4. **Check that nothing you drew covers the focused element** — this is
   SC 2.4.11 Focus Not Obscured (Minimum), new in WCAG 2.2, and it only applies
   to the focused component (it must not be *entirely* hidden).

   ```css
   /* Fails SC 2.4.11 when the focused row scrolls under this bar */
   .site-header { position: sticky; top: 0; height: 64px; }

   /* Passes: reserve the space so focus can never land underneath */
   html { scroll-padding-top: 72px; }
   ```

   `scroll-padding-top` on the scrolling container is the whole fix. Reach for
   JavaScript only if the header height changes at runtime.

5. **Manage focus when content appears or disappears.** When opening a dialog:
   move focus in. When closing: return it to the control that opened it. Never
   leave focus on `body` — the next Tab starts from the top of the page and the
   keyboard user is lost.

   ```js
   const opener = document.activeElement;      // remember before you open
   dialog.showModal();                          // <dialog> handles the trap and Esc
   dialog.querySelector('[autofocus]')?.focus();
   // on close:
   opener?.focus();                             // not body, not the first link on the page
   ```

   Use `<dialog>` with `showModal()` where you can. It gives the focus trap, the
   `Esc` behaviour and the inert background for free — and a modal dialog that
   traps focus while `Esc` works is *not* a keyboard trap (SC 2.1.2).

6. **Only suppress Tab inside a modal dialog.** A trap in a menu, dropdown or
   tooltip fails SC 2.1.2: the user must always be able to move focus away.

7. **Never bind a single character as a shortcut (SC 2.1.4).** A shortcut that uses
   one letter, number or symbol without a modifier — `j`, `k`, `/` — fires while the
   user is typing in a text field, and a speech-input user triggering "press k" by
   saying a word containing it cannot avoid it. It is allowed only if one of these
   is true, and the first is the one to implement:

   | Way to pass | What it means |
   |---|---|
   | **Turn it off** | A documented mechanism, at least a user preference |
   | **Remap it** | The user can bind another key, including a modified one |
   | **Only on focus** | Active only while a specific component has focus |

   ```js
   // Fails SC 2.1.4 — fires while the user is typing "kale" in the search field
   document.addEventListener('keydown', (e) => { if (e.key === 'k') openSearch(); });

   // Passes — the shortcut is ignored wherever text is being entered
   document.addEventListener('keydown', (e) => {
     const typing = e.target.closest('input, textarea, select, [contenteditable]');
     if (e.key === 'k' && !typing && !e.ctrlKey && !e.metaKey && !e.altKey) openSearch();
   });
   ```

   Guarding against text fields is necessary and not sufficient: it does not help a
   speech-input user, and it is not the mechanism the criterion asks for. Provide the
   preference — most editors and inboxes already do, which is why `G` then `I` is
   fine and a bare `I` is not.

8. **Keyboard access has no exception at AAA (SC 2.1.3).** SC 2.1.1 allows an
   "underlying function" route — a keyboard-operable alternative somewhere else on
   the page. SC 2.1.3 removes that escape hatch: every individual control must be
   operable, not just the feature it belongs to. In practice this is the difference
   between "there is a keyboard-accessible button that opens the same dialog" and
   "the dialog itself can be driven from the keyboard once open". Chip groups, custom
   sliders, colour pickers and drag handles are where this shows up.

   ```html
   <!-- Passes SC 2.1.1 only: the slider is operable by mouse, and there is a
        separate numeric input. At AAA the slider itself must respond to arrows. -->
   <div class="slider" role="slider" aria-valuenow="40"></div>
   <input type="number" aria-label="Opacity percentage" value="40">
   ```

## Verify

Test with the keyboard only, in this order — each step fails a specific criterion:

| Do this | Passing looks like | Criterion |
|---|---|---|
| Press Tab from the address bar | focus enters the page and is always visible | 2.4.7 |
| Tab through the whole component | every control is reached exactly once, in visual order | 2.1.1, 2.4.3 |
| Operate each control with Enter and Space | it activates | 2.1.1 |
| Scroll so the focused item is under a sticky bar | it never becomes fully hidden | 2.4.11 |
| Open each overlay, press Esc | it closes and focus returns to the trigger | 2.4.3 |

## Failure modes

- **`outline: none` in a CSS reset.** The single most common cause of SC 2.4.7
  failures. Replace it with `:focus-visible`, do not delete it.
- **Fixing order with positive `tabindex`.** It works until someone edits the
  markup, then silently breaks. Fix the DOM.
- **Focusing `body` after closing a dialog.** This is the bug that makes
  keyboard users restart from the top of a long page.
- **Trapping focus in a non-modal widget.** Menus and comboboxes must release
  focus on Tab.
- **Checking the ring against the page but not against the control.** A blue
  ring on a blue button is invisible; check both backgrounds.
- **Assuming `:focus-visible` always shows a ring.** It does not trigger for
  programmatic focus. If you move focus with `.focus()` after an action, use
  `:focus` styling for that case or verify the user can still see where they are.
