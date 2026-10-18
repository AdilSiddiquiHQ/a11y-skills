# The GitHub Action

```yaml
- uses: AdilSiddiquiHQ/a11y-skills@v0.3.1
  with:
    target: ./dist          # a file, a directory of HTML, or an https:// URL
    fail-on: serious        # critical | serious | moderate | minor | none
```

It runs axe-core over your pages and writes the findings to the job summary, with
the skill that fixes each one. Pin the version, as above — `@main` is fine for a
personal project and a bad idea for anything else.

## Inputs

| Input | Default | What it does |
|---|---|---|
| `target` | *required* | An HTML file, a directory (searched recursively for `*.html`), or an `http(s)` URL. |
| `fail-on` | `serious` | Lowest impact that fails the step: `critical`, `serious`, `moderate`, `minor`, `none`. |
| `wcag-only` | `false` | Ignore best-practice rules and report WCAG failures only. |
| `summary` | `true` | Write the Markdown report to the job summary. |

## Outputs

| Output | What it is |
|---|---|
| `findings` | Total findings across everything audited. |
| `without-skill` | Findings whose axe rule has no skill behind it yet. |

`without-skill` is the honest measure of what this library does not cover, and it
is worth surfacing rather than hiding:

```yaml
      - uses: AdilSiddiquiHQ/a11y-skills@v0.3.1
        id: a11y
        with: { target: ./dist }

      - if: steps.a11y.outputs.without-skill != '0'
        run: echo "::notice::${{ steps.a11y.outputs.without-skill }} findings have no skill in this library yet"
```

## What it does, exactly

1. Installs `axe-core` and `playwright` with `--no-save`, so nothing is added to
   your project's dependency tree or lockfile.
2. Installs Chromium for Playwright.
3. Walks the target, auditing each page. Two `axe` runs per page: one for the
   machine-readable counts, one for the report.
4. Writes a Markdown report to `$GITHUB_STEP_SUMMARY` and exits non-zero if any
   finding is at or above `fail-on`.

Nothing is uploaded anywhere. There are no secrets to configure and no token to
create — the action reads your HTML and renders a report in your own runner.

The whole step is `scripts/ci-audit.sh`, which is a script rather than an inline
`run:` block for a reason: shell that only executes through `uses:` is untested
shell, and it can be run and asserted on directly (the fixtures CI job does, and
so can you):

```bash
TARGET=./dist FAIL_ON=serious SUMMARY=true \
GITHUB_OUTPUT=/tmp/out GITHUB_STEP_SUMMARY=/tmp/summary \
  bash scripts/ci-audit.sh
```

Exit codes: **0** clean, **1** findings at or above `fail-on`, **3** nothing could
be audited (no HTML under the target).

## Verifying a built site

The usual shape, with the audit after the build so it checks the real output rather
than the source templates:

```yaml
name: accessibility

on: [push, pull_request]

jobs:
  audit:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '20' }
      - run: npm ci && npm run build
      - uses: AdilSiddiquiHQ/a11y-skills@v0.3.1
        with:
          target: ./dist
          fail-on: serious
```

A static page pair, or a live deployment:

```yaml
      - uses: AdilSiddiquiHQ/a11y-skills@v0.3.1
        with:
          target: https://staging.example.com
```

## Choosing `fail-on`

| Value | Fails the step on | Use when |
|---|---|---|
| `critical` | only `critical` | you are adopting this gradually and want almost no noise |
| `serious` | `critical`, `serious` | the default: real user impact, no best-practice nagging |
| `moderate` | adds `moderate` | you want the best-practice rules (`region`, `heading-order`) enforced |
| `minor` | everything | you want a clean axe run, which is a high bar to hold a branch to |
| `none` | nothing | report-only, during a migration |

`fail-on: none` still writes the summary and still reports the findings — it just
does not fail. That is the right setting for the first week.

## Why this exists rather than just axe

The action does not reimplement axe-core; it runs it. What it adds is the join: a
finding arrives as `color-contrast`, and the summary tells you to read
`skills/fix-color-contrast/` for the thresholds and the three ways to fix it that
keep a brand colour. The mapping is the curated part of this repository, and it is
checked against the skills' own criteria in CI.

## What it will not tell you

Same as the CLI, and worth repeating because a green check is seductive:

- axe finds a minority of real accessibility problems. It cannot tell you whether a
  custom widget works from the keyboard, whether the reading order makes sense, or
  whether an error message is understandable.
- **`target-size` is off in axe by default.** A passing run says nothing about
  SC 2.5.8. If you care about it — and it is one of the two criteria WCAG 2.2
  itself added — the fixture in
  [`verify/fixtures/wcag22-new-criteria/undersized-targets/`](../verify/fixtures/wcag22-new-criteria/undersized-targets/)
  shows how to enable it, and
  [`skills/pointer-and-gestures/`](../skills/pointer-and-gestures/) covers what to
  do about the result.
- It establishes nothing about conformance. Neither does this action.
