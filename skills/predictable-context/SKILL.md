---
name: predictable-context
description: Use when focusing or changing a field moves the user somewhere unexpectedly, when a select navigates on change, when the same control is labelled differently on different pages, or when a page reloads or closes without being asked.
---

# Predictable context

**Criteria:** SC 3.2.1 On Focus, SC 3.2.2 On Input, SC 3.2.4 Consistent Identification, SC 3.2.5 Change on Request

A *change of context* is anything that moves the user: a new page, a new window, a
dialog, a moved focus, a form that submits itself. These criteria all say versions
of one thing — the user's action should do what it says, and no more. They matter
most for screen reader and switch users, who cannot glance at a spinner to work out
what happened, and for anybody with a motor impairment, for whom the surprise comes
from a stray keystroke or an overshooting pointer.

## When to use

- A `<select>` navigates as soon as the user picks an option.
- A checkbox submits the form it is inside.
- Focusing an input opens a date picker, expands a menu, or moves focus elsewhere.
- The same action is "Search" on one page, "Find" on another and "Filter" on a third.
- A page reloads, auto-closes or redirects while the user is reading it.
- A reviewer asks why the site "jumps around".

## Procedure

1. **Do nothing on focus (SC 3.2.1).** Receiving focus must not change context. Not
   navigating, not opening a window, not submitting, not moving focus on to another
   element. Focus is how a user *arrives* somewhere, and it is the one event they
   did not necessarily intend.

   ```html
   <!-- Fails SC 3.2.1 — merely tabbing onto the field submits the search -->
   <input name="q" onfocus="this.form.submit()">

   <!-- Passes — focusing the field does nothing but focus the field -->
   <input name="q" aria-describedby="q-hint">
   <p id="q-hint">Press Enter to search.</p>
   ```

   A dropdown that opens on focus is the same failure, and it is the one that hides
   best: a combobox that expands the listbox when the input is focused traps a
   keyboard user in a list they did not open. Open on click, or on an explicit
   key — Enter, ArrowDown — never merely on focus.

2. **Do nothing on input without warning (SC 3.2.2).** Changing the *value* of a
   control must not cause a context change unless the user has been told in advance
   that it will. The classic is a select whose `change` event navigates.

   ```html
   <!-- Fails SC 3.2.2 — choosing a sort order navigates the whole page -->
   <select onchange="location.href='/products?sort=' + this.value">

   <!-- Passes, option A — the user confirms -->
   <label for="sort">Sort by</label>
   <select id="sort" name="sort">…</select>
   <button type="submit">Apply</button>

   <!-- Passes, option B — the behaviour is stated before it happens -->
   <label for="sort">Sort by</label>
   <p id="sort-hint">Choosing an option reloads the results immediately.</p>
   <select id="sort" name="sort" aria-describedby="sort-hint">…</select>
   ```

   The criterion allows the surprise if it is announced first. In practice the
   announcement is easy to miss — screen reader users hear a description only if
   they ask for it — so a submit button or an in-page update without a reload is
   almost always the better fix. A live region that updates a results count is not
   a context change and needs no warning.

3. **Identify things consistently (SC 3.2.4).** A component that does the same job
   on different pages must have the same name and the same accessible name. The
   failure is not a wrong label; it is two labels for one thing.

   ```html
   <!-- Fails SC 3.2.4 — /products and /orders use different words and icons for
        the same action, so "Search" finds nothing on one of them -->
   <button aria-label="Search products">🔍</button>   <!-- /products -->
   <button aria-label="Filter list">🔎</button>       <!-- /orders -->

   <!-- Passes — one component, one name, everywhere it appears -->
   <button aria-label="Search">🔍</button>
   ```

   This is where a design system earns its keep, and where an icon-only button is
   most dangerous: the accessible name lives in `aria-label`, so a copy change on
   one screen silently forks the vocabulary. Audit the strings, not the pages —
   collect every `aria-label` and visible label for the same action and look for
   variants.

4. **Change context only when asked (SC 3.2.5, AAA).** The strict version of the
   three above: no context change happens unless the user requested it, or the
   change can be turned off. This rules out timed auto-refresh, self-closing
   windows, redirects while reading, and any interaction that acts on its own.
   Where a legitimately automatic action exists — a session warning, an availability
   check — make it a visible, dismissible notice rather than a reload.

   ```html
   <!-- Fails SC 3.2.5 — the page reloads every 30 seconds while being read -->
   <meta http-equiv="refresh" content="30">

   <!-- Passes — offer the refresh, and let the reader decide -->
   <button type="button" data-refresh>Refresh results</button>
   ```

5. **When the surprise is unavoidable, choose the least disruptive form.** An
   in-page update (a live region, a results count) is not a context change at all.
   Opening a dialog moves focus but is *requested*. A same-page anchor jump is
   requested. Full navigation is the heaviest and should be the last resort.

## Verify

The two A-level failures are behavioural, so a scan cannot find them — grep for the
handlers, then confirm by hand.

```js
// Every control whose value change could navigate, and where it goes.
for (const el of document.querySelectorAll('select, input[type="checkbox"], input[type="radio"]')) {
  console.log(
    `${el.tagName.toLowerCase()}${el.type ? '[' + el.type + ']' : ''}`,
    'name=' + (el.name || '(none)'),
    'onchange=' + (el.getAttribute('onchange') || '-'),
    'formaction=' + (el.getAttribute('formaction') || '-')
  );
}
```

```js
// SC 3.2.1 — focus something and watch for navigation, a dialog, or moved focus.
const before = document.activeElement;
document.querySelectorAll('input, select, textarea, button, a[href]').forEach((el) => {
  el.addEventListener('focus', () => {
    if (document.activeElement !== el && document.activeElement !== before) {
      console.warn('focus moved on focus:', el.tagName, '->', document.activeElement);
    }
  }, { once: true });
});
```

```js
// SC 3.2.4 — collect the accessible names used for the same action.
const names = [...document.querySelectorAll('a, button, [role="button"]')]
  .map((el) => (el.getAttribute('aria-label') || el.textContent.trim().replace(/\s+/g, ' ')).toLowerCase())
  .filter(Boolean);
const counts = names.reduce((m, n) => ((m[n] = (m[n] ?? 0) + 1), m), {});
console.log('one-off names to review:', Object.entries(counts).filter(([, n]) => n === 1).map(([n]) => n));
```

Manual pass, and it must be manual: with a screen reader running, tab through the
page and change a few control values. Nothing should happen beyond the control
itself. Then do the same with a mouse, because a `change` handler that fires on
blur behaves differently when you click away rather than tab away — which is exactly
how the bug reaches production.

## Failure modes

- **A select that navigates on change.** The most common SC 3.2.2 failure in real
  products, usually added for "fluidity" and untested with a screen reader, where
  arrowing through the options fires `change` on every step through some
  implementations.
- **A checkbox that submits its form.** Ticking "show only in stock" reloads the
  page. Same criterion, and it also destroys the reading position.
- **A dropdown that opens on focus.** SC 3.2.1, and worse than it sounds: a
  keyboard user tabs into a control and is now inside an expanded listbox they must
  escape before continuing.
- **`autofocus` on a field further down the page.** On load, focus moves past the
  banner and the first heading; a screen reader user lands mid-form with no
  orientation. It is a context change nobody requested.
- **Two names for one action.** "Search" and "Find"; an icon-only button whose
  `aria-label` was copy-pasted and edited per screen. SC 3.2.4, and it silently
  breaks voice control and text-based navigation.
- **Timed reload or a self-closing window.** `<meta http-equiv="refresh">`, a poll
  that reloads the route, an OAuth popup that closes itself before the user has read
  the code. SC 3.2.5, and in the polling case also a focus and reading-position
  reset.
- **Overcorrection: removing all automatic behaviour.** Live-updating search
  results, an availability check, a session-timeout warning are all fine, and
  removing them makes the product worse. The criterion is about *context changes*;
  an in-page update that leaves focus and position alone is not one.
- **Assuming a passing scan means these pass.** No axe rule tests SC 3.2.1, 3.2.2,
  3.2.4 or 3.2.5. Automation cannot press Tab and see where the page went.
