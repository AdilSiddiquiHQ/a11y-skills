# a11y-skills

**WCAG 2.2 procedures for coding agents.** Six skills that tell an agent exactly
how to audit, fix and verify accessibility — the thresholds, the decision trees,
and the mistakes that pass a linter and still lock someone out.

```bash
npx github:AdilSiddiquiHQ/a11y-skills install
```

[![CI](https://github.com/AdilSiddiquiHQ/a11y-skills/actions/workflows/ci.yml/badge.svg)](https://github.com/AdilSiddiquiHQ/a11y-skills/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Dependencies](https://img.shields.io/badge/dependencies-0-success.svg)](#scope)
[![Skills](https://img.shields.io/badge/skills-6-purple.svg)](#the-skills)
[![WCAG](https://img.shields.io/badge/WCAG-2.2%20AA-blue.svg)](verify/wcag-2.2.json)

---

## The problem

Ask an agent to "make this accessible" and you get plausible, confident, wrong
output. It removes an `outline` and calls the focus ring fixed. It writes
`aria-label="button"`. It reports a contrast failure on 24px heading text that
is allowed 3:1. It cites SC 4.1.1 Parsing, which was **removed** in WCAG 2.2.

None of that is a knowledge gap you can prompt your way out of reliably. It is
the absence of a checklist with the actual numbers in it.

These are that checklist. They are written as procedures — inputs, ordered
steps, a verification step, and the failure modes — rather than as reference
material, because that is the shape an agent can follow.

## The skills

| Skill | What it does |
|---|---|
| [`audit-component`](skills/audit-component/) | Review markup and emit findings with the criterion, quoted evidence, and a fix |
| [`fix-color-contrast`](skills/fix-color-contrast/) | Reach the contrast minimums by changing lightness only — brand colour intact |
| [`keyboard-focus`](skills/keyboard-focus/) | Keyboard operability, focus order, focus rings, dialogs, sticky headers |
| [`accessible-name`](skills/accessible-name/) | Alt text decision tree, icon buttons, links, and the Label in Name rule |
| [`accessible-forms`](skills/accessible-forms/) | Labels, errors, autofill tokens, multi-step flows, login |
| [`wcag22-new-criteria`](skills/wcag22-new-criteria/) | The nine criteria added in 2.2, and the one that was deleted |

Each skill cites the success criteria it addresses. Every citation is checked
against the spec — see below.

## Verified, not asserted

A skills library is prose, and prose rots in ways nothing catches: a criterion
number gets mistyped, a skill is renamed and the index is not updated, a section
disappears in a refactor. So `npm test` runs
[`verify/verify-skills.js`](verify/verify-skills.js), which checks every skill
against [`verify/wcag-2.2.json`](verify/wcag-2.2.json) — a machine-readable copy
of all 86 WCAG 2.2 success criteria and their conformance levels.

It fails the build when a skill:

- cites a success criterion that **does not exist** in WCAG 2.2;
- **names** a criterion differently from the spec — SC 1.4.3 is "Contrast
  (Minimum)", and a skill that calls it "Minimum Contrast" is unverifiable
  against the source, and nobody would ever notice by reading;
- cites **4.1.1 Parsing**, removed in 2.2 — you get a useful error, not "unknown
  criterion";
- has a `name` that disagrees with its directory, or a `description` that does
  not state when to use it (that text is what an agent matches a request
  against, so a vague one silently never triggers);
- is missing any of its required sections, or contains no example;
- **is not listed in the index**, or the index lists a skill that does not exist.

The skills carry **only `name` and `description` in their frontmatter**. That is
deliberate: an extra key is not portable, and a strict parser is entitled to
reject it. The criteria live on a `**Criteria:**` line in the body instead — and
the reason they moved there is that SkillSleuth's first run over these skills
reported `unknown key: wcag` (`SG-META-009`), which was correct. The skill was
changed rather than the rule silenced.

```
$ npm test
  ok  accessible-forms       9 criteria, 4 sections
  ok  accessible-name        6 criteria, 7 sections
  ok  audit-component       11 criteria, 4 sections
  ok  fix-color-contrast     3 criteria, 5 sections
  ok  keyboard-focus         6 criteria, 4 sections
  ok  wcag22-new-criteria    9 criteria, 5 sections

  6 skills verified against WCAG 2.2 (86 criteria)
```

**Next, and not built yet:** executable fixtures. Every skill will ship a
`verify/fixtures/` case that fails the relevant check before the fix and passes
after, run with axe-core in CI. Until that exists this repository verifies its
*citations*, not its *advice* — and it will keep saying so until the fixtures
land.

## Install

```bash
# Claude Code → ~/.claude/skills
npx github:AdilSiddiquiHQ/a11y-skills install

# OpenCode → ~/.config/opencode/skills
npx github:AdilSiddiquiHQ/a11y-skills install --agent opencode

# Anywhere else
npx github:AdilSiddiquiHQ/a11y-skills install --dest ./my-project/.agent/skills

npx github:AdilSiddiquiHQ/a11y-skills list      # see what you are getting
npx github:AdilSiddiquiHQ/a11y-skills install --dry-run
```

The installer copies files. It makes no network calls, executes nothing it
finds, and will not overwrite an existing skill without `--force`.

Or skip the installer entirely — clone the repo and copy `skills/*` into
wherever your agent reads skills from.

## Why not just ask the model

Fair question, and mostly the answer is "you should". A model with a good sense
of accessibility will get most of this right.

The case for a skill is the part it will *reliably* get right:

- **The numbers.** 4.5:1, 3:1, 24 × 24 CSS px, 2px perimeter at 3:1, `#767676`
  as the lightest grey that passes on white. Skills carry the values, so they
  are not recalled under pressure.
- **The exceptions.** Inline links are exempt from target size. Large text is
  3:1. Empty `alt` is correct. Decorative images, logos and incidental
  photography are exempt from contrast. Missing these produces false findings,
  and false findings are why accessibility tooling gets ignored.
- **The removals.** 4.1.1 Parsing is gone. A checklist that still includes it
  marks working code as broken.
- **Reviewability.** A skill is a file in your repository that a human can read,
  diff, and reject. A model's recollection is none of those things.

It is not a replacement for testing with a screen reader, and the skills say so
in their failure-mode sections.

## Scope

What this is: six Markdown procedures, a zero-dependency installer, a content
verifier, and a machine-readable WCAG 2.2 reference.

What this is not: an automated audit, a conformance report, or a substitute for
manual testing with assistive technology. Automated checks catch on the order of
a third of real accessibility problems; the skills that involve keyboard
behaviour and screen reader output say plainly that they need a human.

Automated conformance claims are also a legal claim, and this repository makes
none. It tells an agent how to check things, not that your site passes.

## Contributing

Skills are the product, so a pull request that adds or improves one is the most
useful thing you can send. See [CONTRIBUTING.md](CONTRIBUTING.md) — the short
version is in [`skills/README.md`](skills/README.md#adding-a-skill).

This repository's own skills are scanned with
[SkillSleuth](https://github.com/AdilSiddiquiHQ/skillsleuth) in CI, so a skill
that arrives with a prompt-injection payload or a hidden instruction does not
merge.

## License

MIT.
