# Architecture

Four layers, each with one job, and the boundaries between them are what make the
repository trustworthy.

```
skills/<name>/SKILL.md          the product: prose an agent follows
        │
        ├── verify/wcag-2.2.json        ground truth: the 86 criteria
        ├── verify/axe-rules.json       generated: axe-core's rules and their criteria
        ├── verify/rule-map.json        curated: axe rule → the skill that fixes it
        ├── verify/verify-skills.js     is the prose well-formed and correctly cited?
        ├── verify/verify-readme.js     do the README's numbers match reality?
        ├── verify/fixtures/            is the advice true, where truth is decidable?
        └── verify/run-fixtures.js      axe-core in a real browser
        │
        ├── scripts/generate-index.js    → skills/README.md
        ├── scripts/generate-coverage.js → docs/COVERAGE.md + the badge
        ├── scripts/generate-axe-rules.js → verify/axe-rules.json
        ├── scripts/generate-rule-docs.js → docs/RULE-MAP.md, and validates the map
        └── scripts/make-demo.mjs        → docs/demo.gif
        │
        ├── lib/chromium.js              finding a browser (shared, dependency-free)
        └── bin/a11y-skills.js           the only thing users run
```

## Layer 1 — the skills

One Markdown file per skill. No build step, no runtime, no generated asset inside
a skill. A skill is readable, diffable and rejectable in a pull request, which is
the entire reason to prefer it over a model's recollection.

The constraints a skill must satisfy are in
[`docs/AUTHORING.md`](AUTHORING.md). The two that matter structurally:

- **Frontmatter is `name` and `description` only.** Everything richer is either
  unportable (a strict parser rejects unknown keys) or a claim that cannot be
  checked. Criteria live on a `**Criteria:**` line in the body, where the verifier
  can parse them and a human can read them.
- **Four fixed sections.** An agent follows structure, so structure is a
  behavioural contract. `## Verify` must be falsifiable — a step that cannot fail
  is not a verification step.

## Layer 2 — verification, in four strengths

These check different things and are deliberately not merged, because a single
"verified" badge over all four would be a lie about the weakest of them.

**Citations.** `verify-skills.js` holds every skill against
`verify/wcag-2.2.json`, a machine-readable copy of all 86 WCAG 2.2 criteria with
their levels and the obsolete entry. It catches a criterion that does not exist, a
name that does not match the spec, a citation of the removed 4.1.1, a malformed
description, a missing section, and stale generated files. This is cheap,
mechanical, and catches the class of error that embarrasses a project.

**Advice.** `verify/fixtures/` is where this repository differs from every other
skills library. Each case is a `before.html` that must trip the axe-core rules it
names and an `after.html` that must be **completely clean** — including
best-practice rules — run in real Chromium through Playwright.

Two decisions in that harness are load-bearing:

- **A real browser, not jsdom.** The most common accessibility failure is colour
  contrast, and contrast requires layout. Under jsdom axe reports `color-contrast`
  as *incomplete* rather than passing or failing, so a fixture asserting on it
  would pass without measuring anything — a test that cannot fail.
- **Clean means clean.** Asserting only that the rule under test stopped firing
  lets a fixture fix contrast and introduce a `region` or `heading-order`
  violation. Requiring zero violations of any impact makes `after.html` a worked
  example of a clean page and stops a "fix" from being a trade.

**Numbers.** `verify-readme.js` pins the README to real tool output: it runs the
verifier and asserts that every per-skill line and the summary appear, and that
the coverage figures and rule-map counts in the README match the generated data. A
number in a README that is not generated is wrong within a month, and it is the
first thing a visitor reads.

**The mapping.** `verify/rule-map.json` is the one file in the repository that
records a judgement rather than a fact: which skill a given axe rule should send
you to. Deriving it mechanically does not work — every criterion maps to several
skills, so `label` would offer thirteen suggestions — and an unchecked judgement is
just an opinion with a schema. So each entry is checked against three things it
cannot edit: the rule id must exist in the axe snapshot, the skill must exist, and
the skill must declare at least one of the criteria axe tags the rule with.
Writing this map caught four mappings that pointed at a skill whose own criteria
line did not cover the rule.

## Layer 3 — generation

Four generated artefacts, and the verifier regenerates and diffs three of them, so
they cannot drift.

- `skills/README.md` — the index, including a criterion-to-skill map derived from
  the skills themselves. Deriving it means the map cannot disagree with the
  skills.
- `docs/COVERAGE.md` and `docs/badge-coverage.svg` — the coverage report. It
  counts three things separately (addressed, executed, correctly absent) because
  collapsing them yields a bigger number and a false one.
- `docs/RULE-MAP.md` — the axe-rule reference, including the rules with no skill
  behind them and why each one is absent.
- `docs/demo.gif` — built by running axe-core over a fixture and outlining what it
  found, then crossfading to the fixed page. The script refuses to build if the
  "after" fixture has any violations, so the animation cannot become a lie.

`verify/axe-rules.json` is also generated, but from an external dependency
(axe-core) rather than from this repository, so it is refreshed deliberately with
`npm run axe-rules` and committed. Pinning the snapshot is what lets the content
gate stay offline: the rule ids and their criteria are needed to validate the map,
and a rule list that changed under a `npm install` would make the validator's
verdict depend on the day it ran.

## Layer 4 — the CLI

`bin/a11y-skills.js` is zero-dependency, offline, and the only thing users
execute. It reads files and copies them. It never runs anything it finds in a
skill and makes no network calls, which matters because the alternative — a
package that fetches or executes a skill's contents — turns a content library into
a supply-chain surface.

`--json` exists on every subcommand so that another agent can drive the library
without parsing human-formatted output.

`audit` is the exception that proves the rule about dependencies. Running axe-core
needs axe-core and a browser, so `audit` finds them at run time, and when they are
absent it prints the exact install command and exits 3 — it does not install
anything, and it does not fail with a module resolution error. The mapping it
prints (`rules colour-contrast` → `fix-color-contrast`) needs neither package,
because it reads the committed snapshot and the committed map, which is why the
mapping is tested in the CI job with no `npm ci` at all.

The browser search lives in `lib/chromium.js` so that the fixture harness and the
CLI cannot disagree about what counts as a usable Chromium. It is deliberately
dependency-free: `audit` has to be able to report "I found no browser" without
loading a framework to work it out.

## Decisions worth knowing

**Zero runtime dependencies.** The skills are Markdown; the CLI is Node standard
library. axe-core and Playwright are `devDependencies` used only to verify, and CI
runs the content gate in a job with no `npm ci` at all, so a compromised
devDependency cannot silently change what the verifier says.

**The shipped version and the verified version are the same files.** There is no
build artefact that could differ from what is reviewed.

**Nothing claims conformance.** Automated checks establish a minority of real
accessibility problems; axe-core is strong on what is decidable in a DOM and blind
to whether a widget is usable from a keyboard. Every skill whose subject is not
decidable says so in its own `## Verify` section and points at
[`screen-reader-test-plan`](../skills/screen-reader-test-plan/). The coverage
report counts "addressed" and "executed" separately for the same reason.
