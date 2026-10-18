---
name: audit-component
description: Use when asked to review a component, page, or HTML snippet for accessibility, or when an accessibility claim needs evidence attached to it rather than an opinion.
---

# Audit a component

**Criteria:** SC 1.1.1 Non-text Content, SC 1.3.1 Info and Relationships, SC 1.3.2 Meaningful Sequence, SC 1.4.1 Use of Color, SC 1.4.3 Contrast (Minimum), SC 2.1.1 Keyboard, SC 2.4.3 Focus Order, SC 2.4.4 Link Purpose (In Context), SC 2.4.6 Headings and Labels, SC 2.4.7 Focus Visible, SC 4.1.2 Name, Role, Value

Review one component (or one page section) against WCAG 2.2 and produce findings
that name the criterion, quote the evidence, and state a fix.

The output is a findings list, not a rewrite. Fixing is a separate step — do not
silently refactor the code you were asked to review.

## When to use

- "Is this accessible?" / "Review this component" / "Check this page."
- Before shipping a component, as a second pair of eyes on markup.
- When a finding needs to be filed somewhere (a ticket, a PR comment) and a
  bare "not accessible" is not actionable.

Do **not** use this for a whole site, and do not use it as evidence that
something *is* accessible. See **Failure modes**.

## Procedure

1. **Identify what you can actually inspect.** From markup alone you can judge
   structure, names, roles and attributes. You cannot judge focus behaviour,
   actual computed contrast, or screen reader output. Split the findings into
   *certain* and *needs runtime check* and never merge them.

2. **Walk the component in this order.** Structure first, because a wrong
   structure invalidates everything downstream:

   | Pass | Question | Criteria |
   |---|---|---|
   | Structure | Is this one landmark/heading level, and is its internal order meaningful? | SC 1.3.1, 1.3.2 |
   | Semantics | Does each interactive element expose the right role? | SC 4.1.2 |
   | Name | Does every control, link, image have an accessible name that matches its visible label? | SC 1.1.1, 2.4.4, 4.1.2 |
   | Appearance | Is anything conveyed by colour alone? Are the declared colours sufficient? | SC 1.4.1, 1.4.3 |
   | Keyboard | Is every interactive element reachable, in a sensible order, with a visible indicator? | SC 2.1.1, 2.4.3, 2.4.7 |
   | Headings and labels | Do they describe the content they head? | SC 2.4.6 |

3. **For each finding, emit exactly this shape.** A finding without the fix is
   not a finding, it is a complaint.

   ```
   [blocking] <one-line what is wrong>
     criterion: SC 1.1.1 Non-text Content (A)
     evidence:  <line number and the exact snippet>
     why:       <what a user experiences, concretely>
     fix:       <the change to make>
   ```

   Severity is only ever one of:
   - `blocking` — fails a Level A or AA criterion. Must be fixed.
   - `advisory` — passes A/AA but fails AAA, or is a documented best practice.
   - `check` — cannot be decided from markup. State what to test and how.

4. **Never invent a criterion.** Cite the number and the level. If no criterion
   fits, the item is `advisory` or it is not an accessibility issue.

## Verify

Re-read each finding and confirm the quoted `evidence:` line actually appears in
the input. A finding whose evidence was paraphrased is a finding that cannot be
checked.

```html
<!-- Bad: this finding is not checkable -->
evidence: the icon button has no label

<!-- Good: this finding can be verified by the reader -->
evidence: line 3 — <button class="close"><svg …></svg></button>
```

## Failure modes

- **Reporting a passing audit.** Markup inspection cannot establish conformance.
  Say what you checked and what remains untested.
- **Treating "has an aria-label" as passing.** An accessible name that does not
  match the visible label fails SC 2.5.3, and a name of "button" is technically
  present and useless.
- **Duplicating the visible label into a redundant attribute.** A `title` on a
  button that already contains its text adds noise and creates a second source
  of truth.
- **Rewriting instead of reporting.** The caller asked what is wrong. Larger
  changes hide which part was the actual defect.
- **Flagging `alt=""` as a defect.** An empty alt on a decorative image is
  correct. The defect is a *missing* `alt` attribute, never an empty one.
