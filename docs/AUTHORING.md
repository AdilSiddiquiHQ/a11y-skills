# Authoring a skill

This is the exact specification for a skill in this repository. It is enforced
by `verify/verify-skills.js`, not by convention, so read it before writing one.

Skills are the product. A skill that is vague, or that states an accessibility
claim the reader cannot check, is worse than no skill — it teaches an agent to
be confidently wrong.

## Non-negotiables

1. **Frontmatter contains exactly two keys: `name` and `description`.** No
   `wcag`, no `tags`, no `version`. Unknown keys are not portable — strict
   parsers reject them, and SkillSleuth reports them as `SG-META-009`.
2. **`name` is kebab-case and matches the directory name exactly.**
3. **`description` starts with `Use when`** and names the *trigger in the words
   a user would use*, not the category. That string is what an agent matches a
   request against. `Use when a dialog loses focus or cannot be closed with
   Escape` — not `Use when improving dialog accessibility`.
4. **A `**Criteria:**` line directly under the `#` title**, listing the success
   criteria this skill addresses as `SC <number> <Exact Name>`, comma-separated.
   Names must match `verify/wcag-2.2.json` character for character. `SC 1.4.3
   Contrast (Minimum)` is right; `SC 1.4.3 Minimum Contrast` fails the build.
5. **These four sections, spelled exactly:** `## When to use`, `## Procedure`,
   `## Verify`, `## Failure modes`.
6. **At least one fenced code block.** A skill that only tells is a blog post.
7. **At least four failure modes**, each one a real thing that ships. This is
   the section that justifies the skill's existence.

## Shape

````markdown
---
name: modal-dialog
description: Use when building or reviewing a modal dialog, when focus escapes or is lost when a dialog opens, or when a dialog cannot be closed with Escape.
---

# Modal dialog

**Criteria:** SC 2.1.1 Keyboard, SC 2.1.2 No Keyboard Trap, SC 2.4.3 Focus Order, SC 4.1.2 Name, Role, Value

One short paragraph: what correct looks like, and the single mistake that
matters most.

## When to use

- "The dialog opens but Tab goes behind it."
- Writing a custom overlay because the design called for one.
- Reviewing a `role="dialog"` implementation.

## Procedure

1. Numbered steps, in the order a person would actually do them.
2. Show code, and put the criterion next to the claim it justifies.
3. State the *default* (a native element, the simplest correct approach) before
   any manual reimplementation, and say the manual path is a last resort.

```html
<!-- Fails SC 4.1.2 — a div with no role and no accessible name -->
<div class="modal">…</div>

<!-- Passes — the platform gives focus management, Escape and inertness -->
<dialog aria-labelledby="t"><h2 id="t">Title</h2></dialog>
```

## Verify

How to tell success from failure. A command, a DOM assertion, or a keyboard
walkthrough with the expected result per step. "Verify" must be falsifiable —
"looks right" is not a verify step.

```js
// Assert the thing you claimed, not something adjacent to it.
```

## Failure modes

- **A named mistake.** What it looks like in the wild and why it happens.
- **A second one.** Prefer mistakes that pass a linter or an automated check.
- **A third one.** Things a reviewer would wave through.
- **A fourth one.** Include the overcorrection here — the "fix" that creates a
  worse problem, such as removing a focus ring, or replacing a native control
  with a broken ARIA reimplementation.
````

## Voice

- Second person, imperative. "Check the ratio", not "you may want to consider
  checking the ratio".
- No hedging, no "simply", no "just".
- British or American spelling, consistently within a file.
- Numbers and thresholds spelled out exactly. Never approximate a WCAG value.

## Accuracy rules

These matter more than anything else in this document, because a wrong
accessibility claim is the one failure a reader cannot see.

- **Never invent a criterion number.** If you are unsure, check
  `verify/wcag-2.2.json`.
- **Never cite 4.1.1 Parsing.** It was removed in WCAG 2.2. Skills in this repo
  must not reference it except to say that it was removed.
- **Thresholds are fixed:** 4.5:1 body text, 3:1 large text (≥24px, or
  ≥18.66px bold), 3:1 non-text, 24 × 24 CSS px target size (AA), 44 × 44 (AAA),
  2 CSS px focus perimeter at 3:1 for SC 2.4.13. Do not round or generalise
  them.
- **Distinguish what is automated from what is not.** Automated testing finds on
  the order of a third of real issues. Any `## Verify` step that requires
  judgement must say so.
- **Do not claim a component "is accessible"** because it follows a checklist.
  Claim only that it meets the criteria listed.
- **Prefer the platform.** A native element beats an ARIA reimplementation, and
  the skill must say so.
- Cite [WAI-ARIA Authoring Practices](https://www.w3.org/WAI/ARIA/apg/) patterns
  by name where a keyboard interaction is standard, rather than inventing one.

## Self-check

Before you report a skill done:

```bash
node verify/verify-skills.js
```

Fix everything it reports **except** problems mentioning `skills/README.md` —
that index is generated and will be rebuilt centrally after your skills land.
