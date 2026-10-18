---
name: menu-button
description: Use when a button opens a menu that the arrow keys cannot navigate, when Tab gets stuck inside an open menu, or when a hover menu vanishes as you move the pointer towards it.
---

# Menu button

**Criteria:** SC 2.1.1 Keyboard, SC 2.1.2 No Keyboard Trap, SC 4.1.2 Name, Role, Value, SC 1.4.13 Content on Hover or Focus

A menu button is a single control that opens a list of actions. It is the WAI-ARIA
Authoring Practices
[Menu Button](https://www.w3.org/WAI/ARIA/apg/patterns/menu-button/) pattern, and
the role it opens is `role="menu"` with `role="menuitem"` children. The mistake
that matters most is putting `role="menu"` on ordinary navigation, which promises
application-menu keyboard behaviour that the markup does not provide.

## When to use

- "You can open the menu with a click but not with the keyboard."
- "Once the menu is open, Tab will not leave it."
- "The hover menu closes before my pointer reaches it."
- Reviewing a `role="menu"` / `role="menuitem"` implementation.

## Procedure

1. **Confirm it is really a menu.** `role="menu"` tells assistive technology to
   expect the desktop menu model: arrow keys move between items, Escape closes.
   A set of navigation links is not a menu — use a `<ul>` of links, or a
   `<details>` disclosure. Reserve `role="menu"` for a small list of commands.

2. **Build the trigger and the menu with explicit ARIA.**

   ```html
   <!-- Fails: role="menu" on navigation, promising keys that do not exist -->
   <nav role="menu">
     <a role="menuitem" href="/">Home</a>
     <a role="menuitem" href="/pricing">Pricing</a>
   </nav>

   <!-- Passes — a button that opens a menu of actions -->
   <button id="mb" aria-haspopup="menu" aria-expanded="false" aria-controls="m1">Account</button>
   <div id="m1" role="menu" aria-labelledby="mb" hidden>
     <a role="menuitem" href="/settings">Settings</a>
     <button role="menuitem" onclick="signOut()">Sign out</button>
   </div>
   ```

   `aria-haspopup="menu"` states what the button opens; `aria-expanded` states
   whether it is open; `aria-labelledby` gives the menu a name (SC 4.1.2). The
   role goes **on the focusable element itself** — a `<li role="menuitem">`
   wrapping a `<button>` produces a nested interactive element whose role and
   name do not match.

3. **Return the name honestly.** A text trigger is named by its text. An
   icon-only trigger (a hamburger, a chevron) needs `aria-label`; without it the
   button has no accessible name (SC 4.1.2).

4. **Implement the APG keyboard model.** Enter, Space, and Down Arrow open the
   menu and move focus to the first item; Up Arrow opens it and moves focus to the
   last; Down and Up move within it; Home and End go to the first and last; Escape
   closes it and returns focus to the button; Tab closes it and moves on.

   ```js
   menu.addEventListener('keydown', (e) => {
     if (e.key === 'Escape') { close(); button.focus(); }   // SC 2.1.2: Escape restores focus
     else if (e.key === 'Tab') { close(); }                  // never swallow Tab
   });
   ```

5. **Move DOM focus onto menu items.** In `role="menu"`, focus lives on the
   item, so the roving `tabindex` keeps exactly one item at `tabindex="-1"` and
   moves `focus()` to the active one. This differs from a combobox, which keeps
   focus in the input and uses `aria-activedescendant`; do not mix the two.

6. **If the menu opens on pointer hover, you owe the user the three SC 1.4.13
   guarantees.** It must be *dismissible* (Escape closes it without moving
   focus), *hoverable* (the pointer can travel from the trigger onto the menu
   without it closing), and *persistent* (it stays until the user dismisses it,
   moves away, or the content is no longer valid). A `mouseleave` on the trigger
   alone breaks hoverable; a fixed timer breaks persistent.

7. **Keep `aria-expanded` truthful.** Every close path — Escape, Tab, choosing an
   item, clicking outside — sets it back to `"false"` (SC 4.1.2).

## Verify

Keyboard only, in this order:

| Do this | Passing looks like | Criterion |
|---|---|---|
| Tab to the trigger | focus reaches it and its name and "has popup" are announced | 2.1.1, 4.1.2 |
| Press Enter, Space, and Down Arrow | each opens the menu and focuses the first item | 2.1.1 |
| Press Up Arrow on the closed button | the menu opens focused on the last item | 2.1.1 |
| Move with Down/Up/Home/End | focus moves between items | 2.1.1 |
| Press Escape | the menu closes and focus is back on the trigger | 2.1.2, 4.1.2 |
| Press Tab while the menu is open | the menu closes and focus moves to the next control | 2.1.2 |
| Hover the trigger, then move the pointer onto the menu | the menu stays open until you leave or dismiss it | 1.4.13 |

Assert the state wiring; the hover travel is a judgement call.

```js
const mb = document.getElementById('mb');
const menu = document.getElementById('m1');
console.assert(mb.getAttribute('aria-expanded') === String(!menu.hidden),
  'SC 4.1.2: aria-expanded disagrees with the menu visibility');
```

## Failure modes

- **`role="menu"` on a site navigation list.** The role promises arrow keys and
  Escape. Without them, screen reader users hear a menu whose items they can only
  reach with Tab, and the announced interaction model is a lie (SC 4.1.2).
- **Tab captured while the menu is open, or Escape unimplemented.** Either leaves
  a keyboard trap: the user cannot move focus away from the menu (SC 2.1.2).
- **`aria-expanded` stuck on `"true"` after a click-outside close.** The visible
  menu is gone but the button still reports it as open (SC 4.1.2).
- **The menu closes when the pointer leaves the trigger.** A `mouseout` on the
  button fires before the pointer reaches the menu, so a mouse user can never
  select an item — the hoverable requirement of SC 1.4.13.
- **Items built as `<li role="menuitem">` around a `<button>` or `<a>`.** Two
  nested interactive elements produce an item whose accessible name and role do
  not line up with what is focusable, and screen readers announce it inconsistently
  (SC 4.1.2).
- **Focus returned to `document.body` on Escape.** The user loses their place and
  the next Tab starts at the top of the page. Restore focus to the trigger (SC
  2.4.3 behaviour under SC 2.1.2).
- **`role="menuitem"` on a `<div>` with no `tabindex` and no activation handler.**
  A real and common mistake when copying a pattern: the item is announced but
  cannot be reached or activated at all (SC 2.1.1).
