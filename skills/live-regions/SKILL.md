---
name: live-regions
description: Use when a status message is not announced, when a screen reader repeats the same message twice, when a page reads its own status out loud on load, or when a toast, spinner, or save confirmation needs to reach assistive technology.
---

# Live regions

**Criteria:** SC 4.1.3 Status Messages, SC 1.3.1 Info and Relationships, SC 2.1.1 Keyboard

A live region is how a change reaches a screen reader without moving focus. It is
also the most fragile technique in the accessibility toolkit: the same markup
announces nothing or announces twice depending on *when* it was added to the DOM
and how often it changes. The mistake that matters most is inserting the region
and its text together, which is reliably silent.

## When to use

- "The success message shows on screen but VoiceOver never says it."
- Building a toast, an inline save confirmation, a result count, or a cart total.
- A screen reader reads the same message twice, or reads stale text.
- A page announces its own status the moment it loads.
- Reviewing `aria-live`, `role="status"`, `role="alert"`, or a toast library.

## Procedure

1. **Prefer the implicit role over hand-written `aria-live`.** `role="status"`
   implies `aria-live="polite"` and `aria-atomic="true"`; `role="alert"` implies
   `aria-live="assertive"` and `aria-atomic="true"`. Adding both is redundant and
   usually a sign the author was guessing. Reach for `aria-live` directly only
   when you need non-atomic behaviour or a specific combination the roles do not
   give you.

   ```html
   <!-- Passes: one role, correct politeness implied -->
   <p role="status" id="save-status"></p>

   <!-- Passes only when the update is time-critical and needs to interrupt -->
   <p role="alert" id="session-warning"></p>
   ```

2. **Render the empty region with the page, then fill it.** A live region that
   is inserted *with* its text, or whose text is set in the same task as its
   creation, is usually not announced: assistive technology was not observing
   the element when the change happened. The region must already be in the DOM
   and empty at first paint.

   ```js
   // Fails: the region and its message appear together — commonly silent
   const p = document.createElement('p');
   p.setAttribute('role', 'status');
   p.textContent = 'Saved';
   document.body.append(p);

   // Passes: the region exists and is empty first; only the text changes later
   const status = document.getElementById('save-status'); // already in the markup
   status.textContent = '';                              // clear, so a repeat announces
   requestAnimationFrame(() => { status.textContent = 'Saved'; });
   ```

3. **Choose politeness deliberately.** `polite` waits for the user's current
   utterance to finish; `assertive` interrupts it. Use `polite` for everything
   that is not time-critical — save confirmations, result counts, filter
   updates, form success. Use `assertive` for warnings that lose value if
   delayed, such as a session about to expire. An assertive region on a loading
   spinner interrupts the user mid-word for the entire duration of the load.

4. **Mind what is inside the region, and whether it is atomic.** With
   `aria-atomic="true"` (implied by the roles above) the whole region is
   re-read on any change. That is right for a short status line and wrong for a
   container holding a list or the page's furniture: an atomic region around a
   results list re-reads every result on every keystroke of a filter.

5. **Keep the region visible to assistive technology even when it is hidden
   visually.** A live region that is `display: none` or `visibility: hidden` is
   not announced. Visually-hidden text is the correct technique; removing the
   element from the accessibility tree is not.

   ```css
   /* Passes: off-screen but still in the accessibility tree */
   .visually-hidden {
     position: absolute;
     width: 1px;
     height: 1px;
     margin: -1px;
     padding: 0;
     overflow: hidden;
     clip-path: inset(50%);
     white-space: nowrap;
     border: 0;
   }
   ```

6. **Do not announce on load, and do not duplicate on re-render (SC 4.1.3).**
   If the server renders status text inside the region, some screen readers
   announce it as the page loads, before the user knows what it refers to. That
   is a duplication of the page title and the page's own content. If a client
   framework re-mounts the region on every render, the same text can be
   announced on each pass. Keep the node stable, keep it empty at first paint,
   and change only its text.

7. **Relate the message to the thing it describes, and do not steal focus
   (SC 1.3.1, SC 2.1.1).** A save confirmation belongs next to the record it
   saved; an error belongs to the field, tied with `aria-describedby` or
   `aria-errormessage`, not only to a page-level toast. When a status message
   carries an action — "Saved. Undo" — that control must be reachable with the
   keyboard and must not be the only way to recover, and a polite status must
   never move focus to itself.

## Verify

```js
// Inventory every live region on the page, including the ones frameworks inject.
const regions = [...document.querySelectorAll('[aria-live], [role="status"], [role="alert"], output')];
console.table(
  regions.map((el) => ({
    tag: el.tagName,
    role: el.getAttribute('role'),
    live: el.getAttribute('aria-live'),
    atomic: el.getAttribute('aria-atomic'),
    text: el.textContent.trim().slice(0, 40),
    inTree: el.offsetParent !== null || getComputedStyle(el).position === 'absolute',
    hiddenFromAT: el.getAttribute('aria-hidden') === 'true',
    display: getComputedStyle(el).display,
  })),
);
```

| Do this | Passing looks like | Criterion |
|---|---|---|
| Load the page with a screen reader running | nothing is announced from the status regions | 4.1.3 |
| Trigger the action that produces the message | the message is announced once, without focus moving | 4.1.3 |
| Trigger the identical action a second time | it is announced again (clearing then setting the text) | 4.1.3 |
| Trigger a `polite` message while another utterance is playing | it waits, and is not clipped | 4.1.3 |
| Tab to the region's associated control | the message is available as its description | 1.3.1 |
| Reach any action inside the message with `Tab` | it is focusable and operable | 2.1.1 |
| Force a re-render of the surrounding component | the message is not announced a second time | 4.1.3 |

Every row here needs a screen reader and a human; no automated rule can tell you
whether a change was announced, only that a live region exists. axe-core's
`aria-live` rules check the attributes, not the behaviour.

## Failure modes

- **The region and its text created together.** The single most common reason a
  save confirmation is silent. The region must pre-exist and be empty.
- **Announcing on first load.** Server-rendered text inside `role="status"` is
  read out as the page opens, out of context, and competes with the page title.
  Render it empty and populate it after load.
- **Duplicated announcements on re-render.** A framework re-creates the node, or
  the app both updates a toast and updates an inline status, so the user hears
  the same sentence twice. Keep one region per event, with a stable node.
- **`aria-live="assertive"` on everything.** A loading spinner, a character
  counter, or a "typing" indicator that interrupts on every change makes the
  page unusable rather than informative. Reserve assertive for time-critical
  warnings.
- **An atomic region wrapped around a list or a form.** With the implicit
  `aria-atomic="true"` of `role="status"`, every keystroke re-reads the entire
  contents. Give the region only the sentence that changed.
- **The region hidden from assistive technology.** `display: none`,
  `visibility: hidden`, or `aria-hidden="true"` on a live region stops it
  announcing, and the console still shows the update that "worked".
- **`role="alert"` on a container that holds all errors.** The user is read the
  entire error block, including the parts already announced, every time one
  field changes.
- **The overcorrection: deleting the live region and moving focus instead.**
  Focus jumps to the toast, the user loses their place in the form, and the next
  `Tab` starts from the wrong control. Announce in place.
