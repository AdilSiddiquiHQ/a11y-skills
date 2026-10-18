---
name: screen-reader-test-plan
description: Use when asked to test a page or flow with a screen reader, when writing an accessibility test script, or when reading order and focus order cannot be judged from the markup alone.
---

# Screen reader test plan

**Criteria:** SC 4.1.2 Name, Role, Value, SC 1.3.1 Info and Relationships, SC 4.1.3 Status Messages, SC 2.4.3 Focus Order

A screen reader presents a page as a flat, linear stream of announcements with no
visual layout. That single fact drives the whole test: reading order and browse
mode matter more than anything a screenshot shows. Record the *expected
announcement* at each step, then compare it with what you actually hear — "it
read fine" is not a result.

Test with the keyboard alone first. A screen reader is not a substitute for
keyboard testing, and a passing keyboard test does not mean the announcements are
correct.

## When to use

- "Test this with VoiceOver / NVDA / JAWS."
- Writing or reviewing a QA script, a test plan, or an acceptance checklist.
- A ticket says "screen reader users cannot use this form or widget."
- Reading order or focus order cannot be decided by reading the markup.

## Procedure

1. **Pick your setup and write it down.** One reader, one browser, exact versions,
   for example NVDA with Firefox, or VoiceOver with Safari. One reader is a
   sample, not proof of conformance across all of them.

2. **Run the ordered script below.** For each step, write the expected
   announcement before you listen, so a mismatch is visible rather than absorbed.
   The criteria in the last column are what the step proves.

   | # | Do this | Expected announcement | Criterion |
   |---|---|---|---|
   | 1 | Load the page and stop at the start | the document title, then the page landmark: "banner" | SC 1.3.1 |
   | 2 | Move to the top (Ctrl+Home, or VO+Home) and read forward in **browse mode** | landmarks by name — "banner", "navigation", "main"; each heading as "heading level 1, Checkout"; lists as "list, 4 items"; tables as "table, 3 columns, 4 rows" with header cells | SC 1.3.1 |
   | 3 | Jump by heading (`H` in NVDA/JAWS, VO+Cmd+H in VoiceOver) | the outline is logical and no level is skipped | SC 1.3.1 |
   | 4 | Jump by landmark (`D`, or the rotor) | exactly one "main", a named "navigation" | SC 1.3.1 |
   | 5 | Leave browse mode and **Tab** through every control | each control gives role, name and state: "Sign in, button", "Email, edit, required", "Remember me, checkbox, not checked" | SC 4.1.2, SC 2.4.3 |
   | 6 | Tab through again and watch the *order* | the sequence follows the visual and logical order, with no jump backwards | SC 2.4.3 |
   | 7 | Operate each control with Enter, Space and the arrow keys | the state changes are announced: "expanded", "checked", "selected" | SC 4.1.2 |
   | 8 | Submit the form with invalid data | the error is announced and the field reports "invalid entry" | SC 4.1.2 |
   | 9 | Trigger an async update (save, filter, result count) | the status is announced without focus moving | SC 4.1.3 |
   | 10 | Open a dialog | focus moves inside and the dialog name is announced: "Sign in, dialog"; Escape closes it and focus returns to the trigger | SC 2.4.3, SC 4.1.2 |

3. **Give browse mode and reading order their own attention.** Browse mode is the
   virtual cursor with which a screen reader user skims content; if something is
   not reachable in browse mode, it is effectively invisible. Focus mode is where
   keystrokes go to the page so a control can be typed into. Both must work — a
   custom widget that never triggers focus mode cannot be typed into, and one
   that never returns to browse mode traps the user.

4. **Match the flat order to the intended order.** Because the reader presents
   the DOM linearly, positioned and reordered content is read in *source* order,
   not visual order. Compare the announcement sequence with the layout and fix
   the DOM, not the CSS.

5. **Log the result as a transcript,** expected against actual, including version
   and browser, so someone else can reproduce it.

   ```text
   # /checkout — NVDA 2024.4 with Firefox (expected announcement)
   [load]        "Checkout — Example, page"
   [browse]      "banner"
   [browse]      "navigation, Main"
   [browse]      "main"
   [browse]      "heading level 1, Checkout"
   [Tab]         "Full name, edit, required"
   [Tab]         "Card number, edit, has popup collapsed"
   [submit]      "There is 1 error"                 # error summary, announced
   [after save]  "Order placed"                     # role=status region
   ```

6. **Provide the status region the script expects (SC 4.1.3).** A saved message
   must reach the user without stealing focus:

   ```html
   <!-- The announcement at step 9 comes from a live region, not a focus move. -->
   <p id="cart-status" role="status"></p>
   ```

## Verify

The verify step is the recording itself. A step passes only when the actual
announcement matches the expected one written before the test.

```text
PASS: heard "Search, button"
FAIL: heard "button"            -> no accessible name (SC 4.1.2)
FAIL: heard nothing             -> element not in the accessibility tree (SC 1.3.1)
```

Flags that must count as failures, not near-misses:

- "unlabelled", "no name", or a bare role with nothing after it.
- "clickable" on something that is not a button or link, or a link announced as
  a button.
- A heading level that jumps from 1 to 3.
- A status change that is never announced (SC 4.1.3).
- Focus that moves somewhere different from the visual order (SC 2.4.3).

## Failure modes

- **Testing in browse mode only.** The reader skims the page and everything
  sounds fine, but the control cannot be typed into because focus mode is never
  entered.
- **Reading the DevTools accessibility tree instead of listening.** The tree
  shows the computed name and role; it does not show that a live region is
  never announced or that the reading order is confusing.
- **Recording "it read fine".** Without the expected announcement written down
  first, there is nothing to compare against and nothing to reproduce.
- **Declaring conformance from one screen reader.** NVDA, JAWS, VoiceOver and
  TalkBack differ in what they announce; a single pass is a sample.
- **Skipping state and value changes.** A toggle that never says "expanded" or a
  slider that never announces its value passes a role-and-name check and fails
  the user.
- **Assuming visual order is reading order.** Absolutely positioned sidebars and
  flex `order` values are read where they sit in the DOM.
- **Testing only the happy path.** Errors, empty states and dialogs (steps 8 to
  10) are where these criteria are actually decided.
- **Overcorrection — adding positive `tabindex` to "fix" focus order.**
  `tabindex="1"` throws an element to the front of the sequence and breaks the
  natural order everywhere else. Fix the DOM order instead.
