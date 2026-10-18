# Changelog

All notable changes to this project are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.2.0] — 2026-10-18

The expansion from a starter set to something you can actually rely on: 6 skills
to 30, and — more importantly — the fixtures that prove the advice works.

### Added

- **24 new skills**, taking the library from 6 to 30 and criterion coverage from
  18 to 52 of the 86 criteria in WCAG 2.2. New ground: dialogs, tabs,
  accordions, comboboxes, menus, tooltips, carousels, data tables, charts,
  live regions, progress and loading, pagination, headings and landmarks, page
  title and language, zoom and reflow, motion, forced colours, skip links,
  authentication, media, SVG and icons, email, screen-reader test plans, and
  triage of automated results.
- **Executable fixtures** (`verify/fixtures/`, 11 cases) — each a
  `before.html` that must trip the named axe-core rules and an `after.html` that
  must be completely clean. Run with `npm run fixtures`, in a real Chromium
  because contrast cannot be computed without layout.
- **`docs/COVERAGE.md`** and a generated coverage badge — criterion-by-criterion,
  with the criteria that are deliberately absent and why.
- **Generated `skills/README.md`** with a derived criterion-to-skill map, so the
  index cannot disagree with the skills.
- **CLI**: `search`, `info`, `criteria`, and `--json` on all of them.
- **`docs/demo.gif`** and `scripts/make-demo.mjs` — the demo is built from a real
  fixture by running axe-core and outlining what it found; the script refuses to
  build if the "after" fixture has violations.
- Project hygiene: `docs/AUTHORING.md`, `docs/ARCHITECTURE.md`, `AGENTS.md`,
  `SECURITY.md`, `CODE_OF_CONDUCT.md`, `CITATION.cff`, issue and pull request
  templates.
- CI: a fixtures job that installs Chromium and asserts every pair, a
  generated-docs freshness check, and a check that `--json` output parses.

### Changed

- `verify/verify-skills.js` now regenerates the index and the coverage report and
  fails if either differs, instead of only checking that the index mentions each
  skill. The weaker check passed when a skill was renamed in the index but not in
  the directory, which is how a curated list actually rots.
- `verify/verify-readme.js` also pins the coverage claims in the README, so the
  headline number cannot drift from the skills.
- The fixture harness asserts a **completely clean** `after.html`, including
  best-practice rules, rather than only the rule under test.
- Dependencies: the skills and the CLI are still zero-dependency; fixtures and
  the demo use axe-core and Playwright as devDependencies only.

## [0.1.0] — 2026-10-17

Initial release.

### Added

- Six skills: `audit-component`, `fix-color-contrast`, `keyboard-focus`,
  `accessible-name`, `accessible-forms`, `wcag22-new-criteria`.
- `verify/wcag-2.2.json` — all 86 WCAG 2.2 success criteria, their levels, and
  the criteria added in 2.1 and 2.2, plus the one removed in 2.2.
- `verify/verify-skills.js` — checks frontmatter, required sections, every
  criterion citation against the spec, and index freshness.
- `verify/verify-readme.js` — pins the README's sample output to the real output.
- `bin/a11y-skills.js` — a zero-dependency `list` and `install` CLI.
- CI running the verifier, the installer, and a SkillSleuth scan of this
  repository's own skills.

[0.2.0]: https://github.com/AdilSiddiquiHQ/a11y-skills/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/AdilSiddiquiHQ/a11y-skills/releases/tag/v0.1.0
