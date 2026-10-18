# Contributing

The skills are the product. A pull request that adds one, or fixes something
wrong in one, is the most valuable thing you can send. Everything here is plain
Markdown and zero-dependency Node, so there is nothing to build.

## Improving a skill

1. Read an existing skill to copy the shape. They are deliberately uniform —
   an agent follows the structure, so changing it changes behaviour.
2. Keep the voice: second person, imperative, no hedging. "Check the ratio" not
   "you may want to consider checking the ratio."
3. Cite real criteria, in `SC <number>` form, and put them in the frontmatter
   `wcag:` list too.
4. Add the case to **Failure modes**. If you found a real bug in the wild, say
   what it was; that is the most useful sentence in the file.

```bash
npm test        # structure, citations, index freshness, README accuracy
```

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
"Verify" means the reader can tell success from failure, not "looks right".

## Failure modes

The ways this goes wrong in practice. At least three. This section is the
reason the skill exists; the procedure alone is a blog post.
```

Two rules about the metadata that are not obvious:

- **Nothing but `name` and `description` goes in the frontmatter.** Criteria go
  on the `**Criteria:**` line in the body. An extra frontmatter key is not
  portable — strict parsers reject unknown keys, and SkillSleuth reports it as
  `SG-META-009`. That finding is correct; do not suppress it.
- **Criterion names must match the spec exactly.** `SC 1.4.3 Contrast (Minimum)`
  is right; `SC 1.4.3 Minimum Contrast` fails the build. Renaming a criterion in
  your own words makes the citation uncheckable against the source.

Then add it to the **By task** table in [`skills/README.md`](../skills/README.md).

`npm test` enforces all of that. It will reject: a criterion that is not in
WCAG 2.2, a criterion whose name does not match the spec, a citation of the
removed 4.1.1, a `name` that does not match the directory, a `description` that
does not start with "Use when", a missing section, a skill with no example, and
a skill missing from the index.

## Adding a criterion

`verify/wcag-2.2.json` is the source of truth and is checked against the spec,
not against memory. If you add or change a criterion, link the spec section in
the pull request. Getting that file wrong makes every skill wrong at once,
which is exactly why it is a separate, reviewable file.

## Reporting a wrong skill

Open an issue with the skill name, what it says, and what it should say. A wrong
accessibility claim is worse than no skill, so corrections are prioritised over
additions.

## What will not be merged

- A skill that restates a criterion without saying how to check it.
- Anything that claims an automated tool can establish conformance.
- Skills that duplicate an existing one. Extend the existing skill instead.
- Content that is not accessibility. This repository is deliberately narrow.
