# Contributing

The skills are the product. A pull request that adds one, fixes something wrong
in one, or adds a fixture that proves one, is the most valuable thing you can
send. Everything here is plain Markdown and zero-dependency Node — there is
nothing to build.

The full specification for a skill is [`docs/AUTHORING.md`](docs/AUTHORING.md).
It is enforced by `verify/verify-skills.js`, so read it before writing one.

```bash
npm test         # structure, citations, generated docs, README accuracy (no browser)
npm run fixtures # run every before/after pair through axe-core in Chromium
npm run rule-docs # regenerate the axe rule → skill reference, and validate the map
npm run check    # all of the above, plus regenerating docs
```

## Improving a skill

1. Read an existing skill to copy the shape. They are deliberately uniform — an
   agent follows the structure, so changing it changes behaviour.
2. Keep the voice: second person, imperative, no hedging. "Check the ratio", not
   "you may want to consider checking the ratio".
3. Cite real criteria on the `**Criteria:**` line, in `SC <number>` form, with
   the spec's exact name.
4. Prefer the platform. A native `<dialog>` beats an ARIA dialog, a `<button>`
   beats a `div` with a `role`, and the skill must say so.
5. Add the case to **Failure modes**. If you found a real bug in the wild, say
   what it was — that is the most useful sentence in the file.
6. If the advice is decidable in a DOM, add a fixture for it.

## Adding a skill

Create `skills/<kebab-case-name>/SKILL.md`:

```markdown
---
name: kebab-case-name
description: Use when <the trigger, in the words a user would actually use>
---

# Title

**Criteria:** SC 1.4.3 Contrast (Minimum), SC 2.4.7 Focus Visible

One paragraph on what this achieves and, if it matters, what it deliberately
does not do.

## When to use

- Concrete situations. Include the phrasing a user would type.

## Procedure

Numbered steps. Show code. Cite the criterion next to the claim it justifies.

## Verify

How to confirm the fix worked — a check, a command, or a keyboard walkthrough.
"Verify" means the reader can tell success from failure, not "looks right". If the
step needs a human, say so rather than implying a pass.

## Failure modes

The ways this goes wrong in practice. At least four. This section is the reason
the skill exists; the procedure alone is a blog post.
```

Two rules about the metadata that are not obvious:

- **Nothing but `name` and `description` goes in the frontmatter.** Criteria go on
  the `**Criteria:**` line in the body. An extra frontmatter key is not portable —
  strict parsers reject unknown keys, and SkillSleuth reports it as
  `SG-META-009`. That finding is correct; do not suppress it.
- **Criterion names must match the spec exactly.** `SC 1.4.3 Contrast (Minimum)`
  is right; `SC 1.4.3 Minimum Contrast` fails the build. Renaming a criterion in
  your own words makes the citation uncheckable against the source.

You do **not** edit [`skills/README.md`](skills/README.md),
[`docs/COVERAGE.md`](docs/COVERAGE.md) or
[`docs/RULE-MAP.md`](docs/RULE-MAP.md) — all three are generated. Run:

```bash
npm run build-docs
```

CI fails if they are stale, so a forgotten regeneration is caught immediately
rather than left to rot.

## Adding a fixture

A fixture is what separates "we say this works" from "this works". It lives at
`verify/fixtures/<skill>/<case>/` and is three files:

```
meta.json    which rules must fire, and the criterion this is evidence for
before.html  the mistake — must trigger every rule named in meta.json
after.html   the fix — must be completely clean
```

`meta.json`:

```json
{
  "skill": "fix-color-contrast",
  "case": "low-contrast-text",
  "criterion": "SC 1.4.3 Contrast (Minimum)",
  "why": "One sentence on what this pair demonstrates.",
  "expectRules": ["color-contrast"]
}
```

The rule IDs are axe-core's, not ours — `label`, `image-alt`, `button-name`,
`color-contrast`, `heading-order`, `meta-viewport`. `after.html` must have **zero**
violations of any impact, not just the rule under test: best-practice rules such
as `region`, `landmark-one-main` and `page-has-heading-one` count too. That is
deliberate — it stops a fixture from fixing one thing and quietly breaking
another, and it means `after.html` doubles as a worked example of a clean page.

Watch for rules that pass for the wrong reason. axe-core's `label` rule accepts a
non-empty `placeholder` as a label, so a placeholder-only field cannot be used to
demonstrate a missing label. When a fixture behaves unexpectedly, find out why
before changing the assertion — that is usually where the interesting finding is.

**Rules axe ships disabled need enabling explicitly.** Some rules are off by
default, so a fixture naming one of them would pass while testing nothing. Add
`axeOptions` to `meta.json`, which is passed straight to `axe.run`:

```json
{
  "expectRules": ["target-size"],
  "axeOptions": { "rules": { "target-size": { "enabled": true } } }
}
```

`verify/fixtures/wcag22-new-criteria/undersized-targets/` does this for
SC 2.5.8, whose only automated check is one of the 15 disabled rules. Check
`enabledByDefault` in [`verify/axe-rules.json`](verify/axe-rules.json) before
concluding a rule "does not exist".

## Adding a rule-map entry

[`verify/rule-map.json`](verify/rule-map.json) says which skill to read when an
audit reports a given axe rule. It is curated, because deriving it mechanically
gives thirteen suggestions for one finding:

```json
{
  "color-contrast": {
    "skill": "fix-color-contrast",
    "why": "text contrast is below 4.5:1, or 3:1 for large text"
  }
}
```

Three checks run in `npm test`, and the third is the one that bites:

1. the rule id must exist in `verify/axe-rules.json`;
2. the skill must exist;
3. **the skill must declare at least one of the criteria axe tags the rule with**
   on its `**Criteria:**` line.

If a rule genuinely has no home here, leave it unmapped: it appears under "Rules
with no skill yet" in [`docs/RULE-MAP.md`](docs/RULE-MAP.md), which costs nothing,
whereas a mapping that fails check 3 both fails CI and misleads the person who
follows it. If a rule belongs to a skill that *should* have covered its criterion
already, add the criterion to that skill with a real procedure — that is how
`accessible-forms` came to own both SC 4.1.2 and SC 3.3.4.

## Adding a criterion

`verify/wcag-2.2.json` is the source of truth and is checked against the spec, not
against memory. If you add or change a criterion, link the spec section in the
pull request. Getting that file wrong makes every skill wrong at once, which is
exactly why it is a separate, reviewable file.

## Reporting a wrong skill

Open an issue with the skill name, what it says, and what it should say. A wrong
accessibility claim is worse than no skill, so corrections are prioritised over
additions.

## What will not be merged

- A skill that restates a criterion without saying how to check it.
- Anything that claims an automated tool can establish conformance.
- Skills that duplicate an existing one. Extend the existing skill instead.
- An accessibility fix that removes a focus indicator, or replaces a working
  native control with a hand-rolled ARIA one.
- Content that is not accessibility. This repository is deliberately narrow.
