---
name: accessible-authentication
description: Use when building or reviewing a login, sign-up, password reset, or two-factor step, when paste is blocked, when a password manager will not fill the form, or when a CAPTCHA or code entry stands between a user and their account.
---

# Accessible authentication

**Criteria:** SC 3.3.8 Accessible Authentication (Minimum), SC 3.3.9 Accessible Authentication (Enhanced), SC 1.3.5 Identify Input Purpose, SC 3.3.1 Error Identification

Authentication is a cognitive function test in disguise: it asks a user to
remember a password, transcribe a code, or solve a puzzle. WCAG 2.2 accepts that
you may ask, but requires that a user who cannot do it still has a way in. The
mistake that costs the most is blocking paste "for security" — it removes the one
mechanism most people with cognitive disabilities rely on.

## When to use

- "I can't paste into the password field." / "My password manager won't fill it."
- Building or reviewing sign-in, registration, password reset, or a two-factor step.
- A CAPTCHA, puzzle, arithmetic challenge, or "enter characters 3, 7 and 11" gates access.
- Reviewing a request to add `onpaste="return false"` or `autocomplete="off"`.
- A one-time code arrives by email or SMS and the field will not accept the whole value.

## Procedure

1. **Name the cognitive function test.** Memory (a password or PIN), transcription
   (typing a code you read elsewhere), and puzzle-solving are tests. Under
   SC 3.3.8 (Level AA, **new in 2.2**) a test is permitted only if at least one of
   these is true — an **alternative** method without a cognitive test, a
   **mechanism** that assists completing it, or the test is **object recognition**
   or **personal content** the user supplied. SC 3.3.9 (Level AAA) removes the
   object-recognition and personal-content exceptions, so at AAA even "pick the
   photo you uploaded" needs an alternative. Allowing a password manager to fill
   the field is a *mechanism*: the user no longer has to recall anything.

2. **Never block paste, copy, or the password manager.** A paste handler that
   cancels the event, `draggable="false"`, or `user-select: none` on the field
   makes the task impossible for someone using a manager.

   ```html
   <!-- Fails SC 3.3.8 — paste is cancelled and the code is split into
        six boxes, so neither a paste nor autofill can fill it -->
   <form>
     <input type="password" name="pw" autocomplete="off"
            onpaste="return false" oncopy="return false">
     <div class="otp" onpaste="return false">
       <input maxlength="1" inputmode="numeric" aria-label="Digit 1">
       <input maxlength="1" inputmode="numeric" aria-label="Digit 2">
       <input maxlength="1" inputmode="numeric" aria-label="Digit 3">
     </div>
   </form>
   ```

3. **Keep a code in one field.** Splitting a code across per-character boxes
   breaks `autocomplete="one-time-code"`, breaks paste, and turns one edit field
   into six for a screen reader. Use one input, allow paste, and constrain it in
   the right way — `type="text"` with `inputmode="numeric"`, not `type="number"`.

   ```html
   <!-- Passes SC 3.3.8 — the manager can fill, paste is allowed, one field -->
   <form method="post" action="/login">
     <label for="user">Email</label>
     <input id="user" name="email" type="email" autocomplete="username" required>

     <label for="pw">Password</label>
     <input id="pw" name="password" type="password"
            autocomplete="current-password" required aria-describedby="pw-help">
     <p id="pw-help">Your password manager can fill this field.</p>

     <button type="submit">Sign in</button>
   </form>

   <label for="code">6-digit code</label>
   <input id="code" name="code" type="text" inputmode="numeric"
          autocomplete="one-time-code" pattern="[0-9]{6}" maxlength="6">
   ```

4. **Identify the purpose of every credential field (SC 1.3.5).** The
   `autocomplete` token is what tells browsers and assistive tech what the field
   is, and it is what makes autofill work:

   | Field | `autocomplete` |
   |---|---|
   | username or email | `username` |
   | existing password | `current-password` |
   | new password | `new-password` |
   | one-time code | `one-time-code` |
   | one-time PIN | `one-time-code` |

   `autocomplete="on"` is not a value that helps anyone, and
   `autocomplete="off"` on a login field is both ineffective and hostile.

5. **Offer an alternative path.** Passkeys or WebAuthn, a magic link, or an
   emailed code let a user who cannot complete the test still authenticate.
   Biometric or device-PIN unlock is not a cognitive function test. Do not make
   the password the only route.

6. **Make failures identifiable (SC 3.3.1).** A rejected credential must produce
   a text message tied to the field, mark the field `aria-invalid="true"`, and
   move focus so the message is reached. "Invalid input" identifies nothing;
   keep the username so the user is not asked to re-enter it.

   ```html
   <label for="pw">Password</label>
   <input id="pw" type="password" autocomplete="current-password"
          aria-invalid="true" aria-describedby="pw-err">
   <p id="pw-err" role="alert">
     That password did not match. Try again, or
     <a href="/reset">reset your password</a>.
   </p>
   ```

## Verify

Automated tools do not test paste or autofill. Do these by hand.

| Do this | Passing looks like | Criterion |
|---|---|---|
| Paste into password with Ctrl/Cmd+V and with the context menu | the value appears | 3.3.8 |
| Open the browser or OS password manager and autofill | both fields fill and submit succeeds | 1.3.5, 3.3.8 |
| Paste a full one-time code from an email | all characters land in one field | 3.3.8 |
| Submit a wrong credential | a text error tied to the field, `aria-invalid`, focus moved, username retained | 3.3.1 |
| Create a new account and re-open the form | the manager offers `new-password`, not `current-password` | 1.3.5 |

```js
// Confirm the autocomplete tokens, and that no paste handler cancels the event.
for (const [sel, token] of [['#pw', 'current-password'], ['#code', 'one-time-code']]) {
  const el = document.querySelector(sel);
  if (el.autocomplete !== token) {
    console.error(`${sel} should autocomplete="${token}", got "${el.autocomplete}"`);
  }
  const ev = new ClipboardEvent('paste', { bubbles: true, cancelable: true });
  el.dispatchEvent(ev);
  if (ev.defaultPrevented) console.error(`${sel} blocks paste`);
}
```

## Failure modes

- **Blocking paste "to stop clipboard attacks".** The common `onpaste="return
  false"` removes the mechanism that makes SC 3.3.8 pass. It does not stop
  clipboard managers from reading the clipboard anyway.
- **Splitting a code into one box per character.** It looks tidy and ships
  everywhere. It breaks `autocomplete="one-time-code"`, blocks paste, and leaves
  a screen reader user with six separate edit fields that need manual focus
  moves.
- **`autocomplete="off"` on a login form.** Browsers often ignore it for
  passwords, so it looks harmless, but clients that do honour it break the
  password manager — the mechanism SC 3.3.8 depends on.
- **`type="number"` for a code.** It strips a leading zero, exposes spinner
  buttons, and breaks autofill in some browsers. Use `type="text"` with
  `inputmode="numeric"`.
- **A CAPTCHA with no alternative.** A single visual puzzle with no audio
  version and no object-recognition fallback is a cognitive test with no
  mechanism, which fails SC 3.3.8.
- **Asking for selected characters of a password** ("enter the 3rd, 5th and 9th
  character"). This is a pure memory test with almost no mechanism; allow the
  user to paste the whole password instead.
- **Overcorrection — disabling the password manager to "prevent credential
  theft".** It makes the flow non-conforming and does not stop credential theft.
  Prefer passkeys, which are both stronger and free of a cognitive test.
