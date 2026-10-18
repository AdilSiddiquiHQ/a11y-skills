---
name: accessible-forms
description: Use when building or reviewing a form, when a screen reader cannot tell which field failed, when autofill does not work, or when a multi-step process asks for the same information twice.
---

# Accessible forms

**Criteria:** SC 1.3.1 Info and Relationships, SC 1.3.5 Identify Input Purpose, SC 3.3.1 Error Identification, SC 3.3.2 Labels or Instructions, SC 3.3.3 Error Suggestion, SC 3.3.7 Redundant Entry, SC 3.3.8 Accessible Authentication (Minimum), SC 4.1.3 Status Messages, SC 2.4.6 Headings and Labels

Forms are where accessibility failures cost the most, because they are where a
user is trying to *complete a task*, not read a page. This covers labels,
errors, autofill and the WCAG 2.2 criteria that most reviews miss.

## When to use

- Building a form or a multi-step flow.
- "Screen reader says 'edit text' but not what the field is."
- A user reports not knowing which field failed, or that autofill did not fill.
- Reviewing a checkout, signup, or any form with grouped fields.

## Procedure

1. **Label every control with a real `<label>`.** A placeholder is not a label —
   it disappears on the first keystroke and fails SC 3.3.2.

   ```html
   <!-- Fails: after typing, there is no visible label at all -->
   <input type="text" placeholder="Full name">

   <!-- Passes: label persists, hint is separate and programmatically tied -->
   <label for="name">Full name</label>
   <input id="name" name="name" autocomplete="name"
          aria-describedby="name-hint">
   <p id="name-hint">As it appears on your ID.</p>
   ```

2. **Say which fields are required in text, not only by colour or an asterisk.**
   An asterisk with no legend is not an instruction (SC 3.3.2).

   ```html
   <label for="card">Card number <span class="req">(required)</span></label>
   <input id="card" required aria-required="true">
   ```

3. **Identify the input purpose so autofill and assistive tech can act** —
   SC 1.3.5, Level AA, applies to fields collecting information *about the
   user*:

   | Field | `autocomplete` |
   |---|---|
   | full name | `name` |
   | given / family name | `given-name` / `family-name` |
   | email | `email` |
   | phone | `tel` |
   | street address | `street-address` |
   | postal code / country | `postal-code` / `country` |
   | username | `username` |
   | new / current password | `new-password` / `current-password` |
   | one-time code | `one-time-code` |
   | credit card number | `cc-number` |
   | date of birth | `bday` (add `bday-day`, `bday-month`, `bday-year` if split) |

   Use the exact token. `autocomplete="on"` is not a value that helps anyone.

4. **Make errors programmatic, not just coloured.** Three things must be true of
   every field that fails (SC 3.3.1):
   - the error is **text**, not a red border alone (which also fails SC 1.4.1);
   - it is tied to the input with `aria-describedby`;
   - the input is marked `aria-invalid="true"`.

   ```html
   <label for="date">Departure date</label>
   <input id="date" aria-invalid="true"
          aria-describedby="date-err">
   <p id="date-err" class="err">
     <span aria-hidden="true">✕</span>
     Enter the date as DD/MM/YYYY, for example 14/03/2027.
   </p>
   ```

   That message also satisfies SC 3.3.3 Error Suggestion, because it says how to
   fix it. "Invalid input" does not.

5. **Announce errors and success without moving focus** (SC 4.1.3). Put the
   status in a live region — and `role="status"` for a count or a save
   confirmation:

   ```html
   <p role="status" aria-live="polite" id="form-status"></p>
   ```

   On submit, move focus to an **error summary** that links to each bad field,
   or to the first bad field itself. Do not leave focus on the submit button
   with the errors rendered somewhere the user cannot reach.

6. **Group related controls** with `fieldset`/`legend` (SC 1.3.1). A radio
   group with no legend is announced as unrelated options:

   ```html
   <fieldset>
     <legend>Delivery speed</legend>
     <label><input type="radio" name="speed" value="std"> Standard (3–5 days)</label>
     <label><input type="radio" name="speed" value="exp"> Express (next day)</label>
   </fieldset>
   ```

7. **Don't ask twice.** SC 3.3.7 Redundant Entry (Level A, **new in 2.2**): in
   the same process, information the user already entered must be auto-populated
   or selectable. A checkout that asks for the billing address again after the
   shipping address is a WCAG 2.2 failure now, not just an annoyance.

8. **Don't make authentication a puzzle.** SC 3.3.8 Accessible Authentication
   (Level AA, **new in 2.2**): a cognitive function test (transcribing a code,
   remembering a password, solving a puzzle) needs an alternative or a helper.
   In practice:

   ```html
   <!-- Required: do not block paste or the password manager -->
   <input type="password" autocomplete="current-password"
          aria-describedby="pw-hint">
   <p id="pw-hint">Paste from your password manager is supported.</p>
   ```

   Blocking paste (`onpaste="return false"`) is a failure. So is a code field
   that refuses to accept a pasted value or splits into boxes with no paste path.

## Verify

Walk the failure path, not the happy path — that is where these criteria live:

| Do this | Passing looks like | Criterion |
|---|---|---|
| Submit with every field empty | errors are text, tied to inputs, focus lands on the first | 3.3.1, 3.3.3 |
| Read a field with a screen reader | name, required state, and hint are announced | 3.3.2, 1.3.1 |
| Trigger the browser's autofill | each field fills | 1.3.5 |
| Complete step 2, go back to step 1 | what you typed is still there | 3.3.7 |
| Paste a password reset code | it pastes | 3.3.8 |
| Submit successfully | the confirmation is announced | 4.1.3 |

## Failure modes

- **`aria-invalid` without a message.** The state is conveyed but not the
  reason, which is not a usable error.
- **Relying on `:invalid` for error UI.** It fires as the user types the first
  character and is not announced as an error.
- **Removing the label visually with `display:none`.** That removes it from the
  accessible name too. Visually-hidden text is the correct technique when a
  design hides the label.
- **`autocomplete` on the wrong element.** It belongs on the `input` itself, not
  on a wrapper.
- **One live region per field.** Announcing every keystroke's validity is worse
  than announcing nothing. One summary region is enough.
- **Disabled submit buttons.** A user with no mouse may never discover why the
  form will not submit. Keep it enabled and report errors on submit instead.
