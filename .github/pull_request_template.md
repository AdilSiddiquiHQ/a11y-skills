<!--
Thanks for sending something. A few things that make this fast to review.
-->

## What this changes

<!-- One or two sentences. -->

## Type

- [ ] New skill
- [ ] Fix to an existing skill (specifically: what it said, and what it should say)
- [ ] New or improved fixture
- [ ] Verification, CLI or tooling
- [ ] Documentation

## Checks

- [ ] `npm test` passes
- [ ] `npm run fixtures` passes (if this touches a skill whose advice is decidable in a DOM)
- [ ] `npm run build-docs` has been run and its output committed (if skills changed)
- [ ] I did not edit `skills/README.md`, `docs/COVERAGE.md` or `docs/badge-coverage.svg` by hand

## Accuracy

- [ ] Every criterion cited is named exactly as in `verify/wcag-2.2.json`
- [ ] No numbers were approximated (4.5:1, 3:1, 24×24 CSS px, 200%, 320 CSS px)
- [ ] Nothing here claims that automated tooling establishes conformance
- [ ] Where the check needs a human, the skill says so instead of implying a pass

## Source

<!--
For a new or changed criterion reference, link the WCAG 2.2 spec section or a
WAI-ARIA Authoring Practices pattern. For a new failure mode, a link to the bug
or a short description of where you saw it ship is ideal — that is the most
useful sentence in a skill.
-->
