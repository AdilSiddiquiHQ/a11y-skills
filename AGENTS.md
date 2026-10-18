# Notes for AI agents working in this repository

You are contributing to a library of skills for other agents. Two things follow
from that, and they override the usual instincts.

**The content is the product, and it is read by machines.** A skill is
instructions that another agent will follow without asking. So a wrong claim here
does not just mislead a person, it gets executed. Accuracy beats helpfulness.

**This repository verifies its own claims, loudly.** Almost every rule below is
enforced by `npm test`, and the enforcement is the point of the project. Do not
weaken a check to make a change pass.

## Commands

```bash
npm test          # content gate + README/claims pinning. No browser, fast.
npm run fixtures  # axe-core in Chromium over every before/after pair
npm run build-docs # regenerate skills/README.md, docs/COVERAGE.md, the badge
npm run demo      # regenerate docs/demo.gif (needs ffmpeg)
npm run demo:cli  # regenerate docs/cli.gif (needs ffmpeg)
npm run check     # build-docs + test + fixtures
```

`npm test` is the gate. Run it before you claim to be done, and read the output
rather than assuming it passed.

## Invariants — breaking any of these fails CI

1. **Frontmatter holds exactly `name` and `description`.** Nothing else, ever.
   Criteria belong on the `**Criteria:**` line in the body. A `wcag` key in the
   frontmatter looks harmless and is not portable; it is reported as
   `SG-META-009` by SkillSleuth and the report is correct.
2. **`name` matches the directory name.**
3. **`description` starts with `Use when`** and names the user-visible trigger in
   the words a user would use. This is the string another agent matches a request
   against. A vague description means the skill silently never loads.
4. **Criterion names are copied character-for-character from
   `verify/wcag-2.2.json`.** `SC 1.4.3 Contrast (Minimum)`, not "Minimum
   Contrast". Do not cite `SC 4.1.1` — it was removed in WCAG 2.2.
5. **Required sections, exactly:** `## When to use`, `## Procedure`, `## Verify`,
   `## Failure modes`. At least one fenced code block. At least four failure
   modes.
6. **Never invent a number.** 4.5:1 body text, 3:1 large text (≥24px, or
   ≥18.66px bold), 3:1 non-text, 24×24 CSS px target size, 2 CSS px focus
   perimeter. If you are unsure of a value, look it up — do not round it.
7. **Never claim an unmeasured number anywhere.** If a count appears in the
   README, the index, or the coverage report, it must come from the generator or
   from a test. `verify/verify-readme.js` will catch you.
8. **`skills/README.md`, `docs/COVERAGE.md` and `docs/badge-coverage.svg` are
   generated.** Edit the skill or the generator, then `npm run build-docs`. Never
   hand-edit the output.
9. **`after.html` in a fixture must be completely axe-clean**, best-practice rules
   included. If it is not, fix the fixture, not the assertion.

## When a fixture fails

The failure message tells you what axe actually reported, including the rules it
found *instead* of the one you expected. That is usually the most interesting
output in the repository — it means your mental model of the rule is wrong.
Investigate before editing anything. For example, axe-core's `label` rule accepts
a non-empty `placeholder` as a label, which is why
`verify/fixtures/accessible-forms/styled-signup` uses visual `<p>` elements rather
than placeholders to demonstrate a missing label.

## Voice

Second person, imperative, no hedging, no "simply" or "just". Prefer the platform
— a native `<dialog>` or `<button>` beats an ARIA reimplementation, and say so.
Where a check needs a human, say that rather than implying a pass.

## Do not

- Add a dependency to `bin/` or to the skills themselves. The shipped product is
  zero-dependency Markdown and Node; `devDependencies` are for the fixture harness
  and the demo only.
- Claim that anything here establishes WCAG conformance. It does not, and saying
  so is the most damaging thing you could write in this repository.
- Reformat skills you were not asked to touch. They are deliberately uniform and
  large diffs make review harder.
