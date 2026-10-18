---
name: progress-and-loading
description: Use when building or reviewing a spinner, progress bar, upload, loading state, or session timeout, when a screen reader never hears that loading finished, or when a progress indicator has no name or too little contrast.
---

# Progress and loading

**Criteria:** SC 4.1.3 Status Messages, SC 2.2.1 Timing Adjustable, SC 1.4.11 Non-text Contrast, SC 4.1.2 Name, Role, Value

A loading state is a status message and a value at the same time, and it is the
component most often shipped as a silent animation. The mistake that matters
most is the bare spinner — an element that draws motion and announces nothing —
followed closely by the progress bar that announces every percentage change and
drowns the user.

## When to use

- "The spinner spins and my screen reader says nothing, so I do not know when it is done."
- Building an upload, export, save, or long-running background task.
- A session timeout warning that exists only as a visual countdown.
- Reviewing `<progress>`, `role="progressbar"`, or a loading overlay.

## Procedure

1. **Make the loading state a status message that says what is happening.**
   SC 4.1.3 Status Messages requires a status message to be programmatically
   determinable so assistive technology can present it without receiving focus.
   A bare spinner does not do that.

   ```html
   <!-- Fails SC 4.1.3 and SC 4.1.2: motion with no name and no text -->
   <div class="spinner" aria-hidden="true"></div>

   <!-- Passes: a named status that states what is happening -->
   <div id="load-status" role="status" aria-live="polite">
     <span class="spinner" aria-hidden="true"></span>
     <span class="visually-hidden">Loading results…</span>
   </div>
   ```

   When the load finishes, change the same region's text to "Results loaded" and
   stop, then let the user continue. The region must already be in the DOM and
   empty when the page loads; a region created together with its text is
   commonly silent.

2. **Use `<progress>` for a determinate value.** The native element maps to the
   `progressbar` role and carries the value for free, which is most of
   SC 4.1.2 Name, Role, Value. Give it a name.

   ```html
   <!-- Passes: name, role and value from the platform -->
   <label for="upload">Uploading report.pdf</label>
   <progress id="upload" max="100" value="42">42%</progress>
   ```

   A custom bar is only justified when the native one cannot be styled at all,
   and then it needs `role="progressbar"`, `aria-valuenow`, `aria-valuemin`,
   `aria-valuemax`, and an accessible name — every one of them, or the value is
   not determinable.

3. **Do not announce every tick.** A progress bar wired to a polite live region
   that updates on each percentage change queues dozens of announcements and
   makes the page unusable. Give the value to `progressbar` (which reports on
   demand) and announce in text only at meaningful moments — start, milestones
   if the design has them, and completion.

   ```js
   // Fails: a polite region that changes on every frame
   progress.addEventListener('input', () => {
     status.textContent = `Loading… ${progress.value}%`;
   });

   // Passes: the bar carries the value; the live region announces the outcome
   progress.addEventListener('input', () => {
     if (progress.value === 100) status.textContent = 'Upload complete';
   });
   ```

4. **Make the indeterminate state honestly indeterminate.** A spinner that never
   becomes a value must not claim `aria-valuenow="0"`, which announces a bar
   stuck at zero. For `<progress>`, omit `value`; for a custom bar, omit
   `aria-valuenow` entirely and describe the task in words.

   ```html
   <!-- Passes: no value attribute, so the state is genuinely indeterminate -->
   <progress id="sync" max="100">Syncing…</progress>
   ```

5. **Check the indicator's own contrast (SC 1.4.11 Non-text Contrast, Level
   AA).** The filled portion of a progress bar against its track, and a spinner
   against its background, are graphical objects needed to understand the
   status, and each needs **3:1** against the colours adjacent to it. A pale
   blue bar on a pale grey track looks fine to the designer and fails the
   criterion.

   ```css
   /* Fails: the fill is 1.6:1 against the track */
   .bar { background: #e8e8e8; }
   .bar__fill { background: #bcd4f0; }

   /* Passes: 3:1 or better between fill, track and page */
   .bar { background: #d9d9d9; }
   .bar__fill { background: #1b5fa8; }
   ```

6. **Give every control in the loading state a name, and keep it operable
   (SC 4.1.2, SC 2.1.1 in practice).** A cancel button, a retry button, or an
   icon-only close needs an accessible name. A hero spinner that covers the page
   and blocks the keyboard traps the user with no cancel; if the task cannot be
   cancelled, it must at least not block focus indefinitely, and it must be
   announced.

7. **Any time limit must be adjustable (SC 2.2.1 Timing Adjustable, Level A),
   with three exceptions.** A session timeout, an upload window, or a
   reservation hold must let the user turn the limit off, adjust it, or extend
   it before it expires — unless it is a real-time event such as an auction,
   the limit is essential to the function, or the limit is longer than **20
   hours**. A login that expires after 15 minutes with no warning and no way to
   extend is a WCAG 2.2 failure, not just an inconvenience.

   ```html
   <!-- Passes SC 2.2.1: the warning offers an explicit extension -->
   <div role="alert" id="timeout-warning" hidden>
     Your session expires in 2 minutes.
     <button type="button" onclick="extendSession()">Stay signed in</button>
   </div>
   ```

   Warn with enough time to act, and make the extension the default action. A
   countdown that reaches zero while the user is reading the warning fails the
   criterion however clear the warning was.

## Verify

```js
// Every progressbar needs a name; a determinate one needs a value.
for (const el of document.querySelectorAll('progress, [role="progressbar"]')) {
  const labelledBy = el.getAttribute('aria-labelledby');
  const name =
    el.getAttribute('aria-label') ||
    (labelledBy &&
      labelledBy.split(/\s+/).map((id) => document.getElementById(id)?.textContent).join(' '));
  const native = el.tagName === 'PROGRESS';
  const hasValue = native ? el.hasAttribute('value') : el.hasAttribute('aria-valuenow');
  console.log({
    name: name || 'MISSING',
    determinate: hasValue,
    now: native ? el.getAttribute('value') : el.getAttribute('aria-valuenow'),
  });
}

// Status regions that change too often are the other half of the failure.
const region = document.querySelector('[role="status"]');
let updates = 0;
new MutationObserver(() => { updates += 1; }).observe(region, { childList: true, characterData: true, subtree: true });
setTimeout(() => console.log('status region updates in 5s:', updates, updates > 5 ? 'likely too chatty' : 'ok'), 5000);
```

| Do this | Passing looks like | Criterion |
|---|---|---|
| Start a load with a screen reader running | the task is announced once, without focus moving | 4.1.3 |
| Read the progress bar with a screen reader | name, role and current value are announced | 4.1.2 |
| Watch the announcements during the load | at most a start and a finish, not one per percent | 4.1.3 |
| Finish the load | completion is announced in the same region | 4.1.3 |
| Sample the bar fill against the track and the spinner against the page | at least 3:1 | 1.4.11 |
| Leave the timed session idle until the warning appears | there is a way to extend, and enough time to use it | 2.2.1 |

The "too chatty" check depends on what the load actually does; run it against a
real task rather than a stub, or it measures nothing.

## Failure modes

- **The bare spinner.** An animated element with `aria-hidden` and no text. The
  page looks busy, the screen reader is silent, and the user cannot tell a slow
  load from a broken button.
- **A polite live region driven by `aria-valuenow`.** Announcing every percent
  queues a stream of speech that outlasts the task, which is worse than
  announcing nothing.
- **A progress bar with no accessible name.** "Progress bar, 42 percent" with
  no idea of what. The name is what makes the value mean something.
- **`aria-valuenow="0"` on an indeterminate spinner.** The state claims a value
  that never moves, and the user waits for a bar that will not progress.
- **A visible countdown with no extension control.** Common on banking and
  admin screens; the session ends mid-task and the work is lost, which is the
  failure SC 2.2.1 exists to prevent.
- **A low-contrast bar or spinner.** The fill and the track are both pale, so
  the value is unreadable before it is announced; 3:1 is the floor for both the
  fill against the track and the indicator against the page.
- **The status region hidden from assistive technology.** `display: none` or
  `aria-hidden="true"` on the loading text stops the announcement, while the
  spinner keeps turning and the console shows the update succeeding.
- **The overcorrection: `role="alert"` on the spinner.** Loading then
  interrupts whatever the user was reading, repeatedly, for the length of the
  task. Reserve assertive for the session-expiry warning.
