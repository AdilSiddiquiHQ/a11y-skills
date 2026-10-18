---
name: accordion-disclosure
description: Use when a section opens on click but not with the keyboard, when a screen reader will not say whether a panel is open or closed, or when a collapsed panel still swallows Tab presses.
---

# Accordion and disclosure

**Criteria:** SC 2.1.1 Keyboard, SC 4.1.2 Name, Role, Value, SC 1.3.1 Info and Relationships, SC 2.4.6 Headings and Labels

An accordion is a stack of show/hide sections. Start from the native element:
`<details>` and `<summary>` are focusable, toggle on Enter and Space, and expose
the open state without a line of ARIA. The mistake that matters most is a `<div>`
with an `onclick`: it is not focusable and announces no state, so the panel is
invisible to everyone who is not using a mouse.

## When to use

- "I can see the question but cannot open it without the mouse."
- "The screen reader says 'button' but never says expanded or collapsed."
- Building an FAQ, a settings group, or a filter panel.
- Reviewing anything that uses `aria-expanded`.

## Procedure

1. **Use `<details>` and `<summary>` for a single show/hide.** The platform
   already satisfies SC 2.1.1 (focusable, keyboard-operable) and SC 4.1.2 (role
   `group`/`button` with an expanded state) with no scripting.

   ```html
   <!-- Fails SC 2.1.1 and SC 4.1.2 — not focusable, no role, no state -->
   <div class="faq-q" onclick="toggle(this)">How do I reset my password?</div>
   <div class="faq-a" hidden>…</div>

   <!-- Passes — keyboard-operable and state-exposing with no ARIA at all -->
   <details>
     <summary>How do I reset my password?</summary>
     <p>Open Settings, then Security.</p>
   </details>
   ```

2. **When the wrapper is mandated, follow the APG
   [Accordion](https://www.w3.org/WAI/ARIA/apg/patterns/accordion/) pattern.** The
   header is a real heading containing a `<button>` that carries `aria-expanded`
   and `aria-controls`.

   ```html
   <!-- Passes SC 1.3.1, SC 2.4.6, and SC 4.1.2 -->
   <h3>
     <button id="b1" aria-expanded="false" aria-controls="s1">Shipping</button>
   </h3>
   <div id="s1" role="region" aria-labelledby="b1" hidden>…</div>
   ```

   The `<button>` supplies the name, the focusability, and the Enter/Space
   activation. Put `aria-expanded` **on the button**, never on the panel: the
   button is the control whose state the user queries.

3. **Keep the state and the visibility one value.** `aria-expanded` is `"false"`
   while the panel is `hidden` and `"true"` while it is shown, changed in the
   same tick. Two places to update means two places to drift.

4. **Keep the header in the heading outline.** Wrap the button in a heading so
   the accordion still appears in a screen reader's heading list (SC 1.3.1 and
   SC 2.4.6). Do not skip levels — an `<h2>` section followed by an `<h6>`
   header breaks the outline; a `<div class="h3">` is not in the outline at all.

5. **Hide closed panels with `hidden` or `display: none`.** A collapsed panel
   that is merely height-limited keeps its links focusable, so keyboard users Tab
   into content they cannot see.

6. **Name icon-only toggles.** A `+`/`−` glyph or a chevron with no text needs
   `aria-label` (and, if a visible label exists, the name must contain it so
   speech input matches, per SC 2.5.3 Label in Name).

## Verify

Keyboard only, in this order:

| Do this | Passing looks like | Criterion |
|---|---|---|
| Tab to the header | focus reaches the toggle | 2.1.1 |
| Press Enter, then Space | the panel opens and closes on each | 2.1.1 |
| Read the toggle with a screen reader | it announces the button name and expanded or collapsed | 4.1.2 |
| Tab while the panel is closed | focus never lands inside the hidden content | 2.1.1 |
| Navigate by headings | every accordion header is reachable as a heading, in order | 1.3.1, 2.4.6 |

Assert the state agreement; the heading question is a judgement call.

```js
const btn = document.getElementById('b1');
const panel = document.getElementById('s1');
console.assert(btn.getAttribute('aria-expanded') === String(!panel.hidden),
  'SC 4.1.2: aria-expanded disagrees with the panel visibility');
```

## Failure modes

- **A `<div>` or `<span>` with `onclick` as the header.** Not focusable, no role,
  no state. It ships constantly because it is styled the same as the button and
  looks identical (SC 2.1.1, SC 4.1.2).
- **`aria-expanded` never toggled, or toggled on the panel.** The button reports
  "collapsed" while the content is visible. The value is set once at render and
  the click handler forgets it (SC 4.1.2).
- **Collapsed content hidden with `max-height: 0; overflow: hidden`.** The
  animation is smooth and the links are still in the tab order, so keyboard users
  land on controls that are not on screen.
- **Headers that are not headings.** The header is a `<div class="h3">`, or
  heading levels jump from `<h2>` to `<h5>`. Screen reader users lose the section
  structure they navigate by (SC 1.3.1, SC 2.4.6).
- **`summary { list-style: none }` with no replacement cue.** Removing the
  triangle leaves open/closed signalled only by colour or by content that has
  already changed, which is a state cue sighted users cannot see (SC 1.4.1).
- **An icon-only toggle with no accessible name.** A chevron `<span>` with no
  `aria-label` and no text gives the button no name at all, so it is announced as
  an unlabelled button (SC 4.1.2).
