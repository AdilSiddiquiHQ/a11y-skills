---
name: triage-automated-results
description: Use when an automated accessibility scan reports issues to triage, when a Lighthouse or axe score is being treated as conformance, or when a tool finding needs a verdict, an owner, and a criterion.
---

# Triage automated results

**Criteria:** SC 1.4.3 Contrast (Minimum), SC 1.1.1 Non-text Content, SC 4.1.2 Name, Role, Value, SC 1.4.11 Non-text Contrast

Automated testing finds on the order of a third of real accessibility issues.
Clearing the report is not conformance, and a green score is not a claim anyone
should sign. Triage is the work of turning each finding into a verdict — real,
false positive, or needs a person — plus the criterion, the user impact, and the
fix. The findings a tool cannot decide are where the actual problems live.

## When to use

- "Lighthouse says 96 — are we done?"
- A CI job emits axe, WAVE, Pa11y, or IBM Equal Access results.
- Deciding whether a finding is real, a tool limitation, or needs human judgement.
- Someone wants to close a ticket because a scanner turned green.
- A tool flags a rule and you need to know which criterion and what to check next.

## Procedure

1. **State the limit before you start.** Automated tooling checks a subset of
   criteria that can be decided mechanically. It cannot test keyboard
   operability, reading order, focus order, captions, error identification, or
   whether text is *meaningful*. Record which criteria were covered
   automatically and which still need a person.

2. **Sort every finding into three buckets.** Do not "fix" a finding until it is
   in one:

   | Bucket | Meaning | Example |
   |---|---|---|
   | confirmed | a real failure against a criterion | a button with no accessible name (SC 4.1.2) |
   | false positive | a tool limitation, not a defect | contrast flagged on text over a decorative image with a solid backing |
   | needs human | the tool cannot decide | an `alt` that is present but does not describe the content (SC 1.1.1) |

   The tool's "needs review" or "incomplete" bucket always lands in **needs
   human**. Those items are not passes.

3. **Read each finding as a claim about a criterion, and test the claim.**

   - **SC 1.4.3 Contrast (Minimum)** — 4.5:1 body, 3:1 large. A checker can only
     compute a ratio when the background is a solid, known value. It misses text
     over images, gradients and opacity, text on pseudo-elements, and most state
     changes. Sample the real background behind the text.
   - **SC 1.1.1 Non-text Content** — a tool finds a *missing* `alt`. It cannot
     judge whether the alt describes the content. `alt="image"`, `alt="logo.png"`
     and `alt="chart"` all pass the scanner and fail the criterion.
   - **SC 4.1.2 Name, Role, Value** — tools catch some missing names and roles.
     They do not catch a wrong name, a name that contradicts the visible label,
     or a state that is never exposed.
   - **SC 1.4.11 Non-text Contrast** — poorly covered, and almost never checked
     across hover, focus and disabled states. Check each state against **3:1** by
     hand.

4. **Then run the human half.** Keyboard-only operation, a screen reader pass,
   zoom and reflow, and reading order. None of these are decided by a scanner;
   see the `screen-reader-test-plan` skill.

5. **Fix by impact, not by severity label.** A tool may rate an unlabelled input
   as "minor"; if it blocks a user from completing a task it outranks a
   cosmetic "serious" finding. Name the user impact in the ticket.

6. **Re-verify the specific failure by hand.** Re-run the one rule to confirm it
   cleared, then confirm the user-facing behaviour, rather than re-running the
   whole suite and reading the score.

7. **Handle findings aimed at a criterion that no longer exists.** Some tools
   still tag duplicate-`id` and empty-heading findings to the removed Parsing
   criterion (4.1.1), which was removed in WCAG 2.2. Record those as robustness
   notes; they are not WCAG 2.2 failures.

```html
<!-- An automated check is green. A human check is not.
     The image-alt rule passes because alt is present.
     SC 1.1.1 fails because the alt does not describe the content. -->
<img src="revenue-2026.png" alt="chart">

<!-- The corrected version: say what the chart shows. -->
<img src="revenue-2026.png"
     alt="Revenue rose from £2.1m in January to £3.4m in June 2026.">
```

```js
// Before writing tickets, split the tool's output into the three buckets.
const cannotResolveBackground = (node) =>
  node.any?.some((c) => /background/i.test(c.message ?? '')) ?? false;

const bucket = (violations) => violations.flatMap((rule) =>
  rule.nodes.map((node) => ({
    rule: rule.id,
    target: node.target.join(' '),
    // Contrast over an image, gradient or opacity cannot be trusted blind.
    verdict: rule.id === 'color-contrast' && cannotResolveBackground(node)
      ? 'needs-human'
      : 'confirmed',
  }))
);
```

## Verify

For each criterion, know exactly what the tool did *not* check:

| Tool finding | Criterion | Not checked by the tool | Manual check |
|---|---|---|---|
| `color-contrast` | 1.4.3 | the real background behind the text (image, gradient, state) | sample the pixel behind the text and compute the ratio |
| `image-alt` | 1.1.1 | whether the alt describes the content | read it and ask whether it conveys the meaning |
| `button-name` | 4.1.2 | whether the name matches the visible label and whether the state is exposed | listen to the control and operate it |
| (rare) non-text contrast | 1.4.11 | hover, focus, disabled and selected states | measure 3:1 in each state |

```js
// A rule passing is evidence about the rule, not about the user. Assert the
// behaviour the user needs, which is what the rule approximated.
const toggle = document.querySelector('#menu-button');
console.assert(toggle?.getAttribute('aria-expanded') != null,
  'expanded state is not exposed (SC 4.1.2)');
const label = toggle && document.querySelector(`#${toggle.id}`)?.textContent?.trim();
console.assert(label, 'visible label is empty (SC 2.5.3)');
```

## Failure modes

- **Closing a ticket because the scanner is green.** Automated coverage is about
  a third of real issues; the other two thirds are exactly the criteria that
  matter to users (SC 3.3.1, SC 2.4.3, SC 1.2.2, and so on).
- **Dismissing the "needs review" bucket.** It is the tool telling you a human
  must look, not that the item is fine.
- **Accepting `alt="image"` because the rule passed.** The name exists and says
  nothing, which is the failure SC 1.1.1 is about.
- **Adding `aria-label` to silence `button-name` on a decorative icon.** The
  correct fix is usually `aria-hidden="true"`, and the label creates a duplicate
  or confusing announcement.
- **Trusting an automated contrast pass on a hero image or gradient.** The
  checker could not resolve the background, so the ratio it reported is not the
  ratio the user sees (SC 1.4.3).
- **Skipping non-text contrast entirely (SC 1.4.11)** because no rule flags it.
  Fields, icons and focus indicators still need 3:1 against their surroundings.
- **Prioritising by the tool's severity label.** "Minor" findings that block a
  task are more urgent than "serious" findings that are cosmetic.
- **Overcorrection — deleting images or hiding content from assistive tech to
  reach a clean score.** A passing report achieved by removing content is worse
  than the findings it replaced.
