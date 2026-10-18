---
name: combobox-autocomplete
description: Use when a search or autocomplete field cannot be driven with the arrow keys, when a label is missing or replaced by a placeholder, or when a screen reader cannot say how many suggestions are showing.
---

# Combobox and autocomplete

**Criteria:** SC 2.1.1 Keyboard, SC 4.1.2 Name, Role, Value, SC 1.3.5 Identify Input Purpose, SC 3.3.2 Labels or Instructions

A combobox is an input paired with a popup list. Reach for the simplest control
that does the job: `<select>` for a short fixed list, and
`<input list="…">` with a `<datalist>` for free text with suggestions. Only build
the WAI-ARIA Authoring Practices
[Combobox](https://www.w3.org/WAI/ARIA/apg/patterns/combobox/) pattern when you
need live filtering, rich option markup, or a list driven by a server. The
mistake that matters most is a hand-rolled combobox whose options are unreachable
from the keyboard.

## When to use

- "I can type in the field but the Down Arrow does nothing."
- "The suggestions appear but the screen reader never mentions them."
- "The field has no label, only grey placeholder text."
- Building or reviewing anything with `role="combobox"` or `aria-autocomplete`.

## Procedure

1. **Choose the least custom control that fits.**

   | Situation | Use |
   |---|---|
   | Short, known, fixed list | `<select>` |
   | Free text with a hint list | `<input list="…">` + `<datalist>` |
   | Live filtering, rich options, remote data | ARIA combobox (the rest of this skill) |

   `<datalist>` is announced and keyboard-navigable by the platform, so it clears
   SC 2.1.1 and SC 4.1.2 without ARIA. Do not rebuild it with a `role="listbox"`
   just to style the options if the platform version is enough.

2. **Label the field, and state the expected value.** An explicit `<label for>`
   gives SC 3.3.2 its instruction and SC 4.1.2 its name. A placeholder is neither:
   it disappears on the first keystroke and assistive technology may not expose it.

   ```html
   <!-- Fails SC 4.1.2 and SC 3.3.2 — placeholder only, no label, no instruction -->
   <input placeholder="Country">

   <!-- Passes — explicit label, programmatic input purpose, stated expectation -->
   <label for="country">Country (start typing to filter the list)</label>
   <input id="country" name="country" autocomplete="country-name"
          role="combobox" aria-expanded="false" aria-controls="country-list"
          aria-autocomplete="list">
   <ul id="country-list" role="listbox" aria-label="Countries" hidden>…</ul>
   ```

3. **Name the field's purpose with `autocomplete` where it collects user data.**
   SC 1.3.5 applies to inputs that gather information about the user — name,
   address, email, telephone, country, and similar. Map the field to the token the
   specification defines (`name`, `email`, `tel`, `street-address`, `country-name`,
   `postal-code`, …). A search box has no such purpose, so `autocomplete="off"` on
   it is harmless; on an identity field it is a failure of SC 1.3.5 and it breaks
   password managers and browser autofill.

4. **Wire the relationship between input and listbox.** `role="combobox"` goes on
   the **input**, not on a wrapper and not on the list. `aria-controls` references
   the listbox id; `aria-expanded` reflects whether the popup is showing.

5. **Track the active option with `aria-activedescendant`.** Keep DOM focus in the
   input at all times and point `aria-activedescendant` at the id of the option the
   user is on. Every option needs a stable id, and the reference must be removed or
   repointed the moment that option leaves the DOM (SC 4.1.2).

6. **Implement the APG keyboard model, and never trap Tab.**

   ```js
   input.addEventListener('keydown', (e) => {
     if (e.key === 'ArrowDown') { e.preventDefault(); open(); moveActive(1); }
     else if (e.key === 'ArrowUp') { e.preventDefault(); open(); moveActive(-1); }
     else if (e.key === 'Enter' && activeOption) { e.preventDefault(); choose(activeOption); }
     else if (e.key === 'Escape' && expanded) { close(); }        // keep the typed text
     else if (e.key === 'Tab') { close(); }                        // SC 2.1.1 / SC 2.1.2: let Tab through
   });
   ```

   Home and End move within the input text. `Escape` closes the popup and leaves
   the typed value alone; Tab closes the popup and moves on to the next control.

7. **Announce the result count in a live region** so a screen reader user knows
   the list changed without moving focus (`SC 4.1.3 Status Messages`). Setting the
   count only in the visible options is not enough for someone typing with the
   popup collapsed in their reading flow.

## Verify

Keyboard only, in this order:

| Do this | Passing looks like | Criterion |
|---|---|---|
| Tab to the field | focus lands on the input and its label is announced | 2.1.1, 3.3.2 |
| Type a few characters | the popup opens and `aria-expanded` becomes `"true"` | 4.1.2 |
| Press Down then Up | the active option moves and is announced | 2.1.1 |
| Press Enter on an option | it is chosen and the popup closes | 2.1.1 |
| Press Escape | the popup closes and focus stays in the input | 2.1.1 |
| Press Tab with the popup open | the popup closes and focus moves to the next control | 2.1.2 |
| Read the field with a screen reader | it reports a combobox with a name and its list relationship | 4.1.2 |
| Inspect an identity field | `autocomplete` carries the matching token | 1.3.5 |

Assert the wiring; whether the announcement is intelligible is a judgement call.

```js
const input = document.getElementById('country');
const list = document.getElementById('country-list');
console.assert(input.getAttribute('role') === 'combobox', 'SC 4.1.2: role is not on the input');
console.assert(input.getAttribute('aria-controls') === list.id, 'SC 4.1.2: aria-controls does not resolve');
const active = input.getAttribute('aria-activedescendant');
console.assert(!active || document.getElementById(active), 'SC 4.1.2: active option id is dangling');
```

## Failure modes

- **`role="combobox"` on the wrapper or the listbox instead of the input.** The
  screen reader reports a combobox with no editable text, or a listbox, and the
  typing interaction is unannounced (SC 4.1.2).
- **`aria-expanded` left `"false"`, or never present.** The popup opens visually
  while assistive technology is told nothing changed, and there is no way to know
  a list appeared (SC 4.1.2).
- **A dangling `aria-activedescendant`.** The option was filtered out of the DOM
  and the reference was not repointed, so the announcement goes silent mid-typing
  and an idref points at nothing.
- **Tab trapped inside the popup.** The list is a focus trap, or it only closes on
  Escape. Tab must close the popup and move to the next control (SC 2.1.1,
  SC 2.1.2).
- **`autocomplete="off"` on a name, address, or email field.** This is a common
  way to stop the browser's own autofill dropdown from covering a custom one, and
  it trades a cosmetic clash for a SC 1.3.5 failure and broken password managers.
- **The placeholder is the label.** Grey text inside the field is not a name:
  SC 4.1.2 has nothing to announce, and SC 3.3.2 gives no instruction once typing
  starts.
- **Options made focusable instead of using `aria-activedescendant`.** Putting
  `tabindex` on each `<li>` pulls focus out of the input, so the user can no longer
  type, and the keystrokes go to the wrong place (SC 2.1.1).
