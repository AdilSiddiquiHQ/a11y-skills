#!/usr/bin/env bash
# The body of the GitHub Action's audit step (see action.yml).
#
# This is a file rather than an inline `run:` block for one reason: shell that
# only ever executes via `uses:` is untested shell. As a script it can be run and
# asserted on directly, in the fixtures CI job and by hand:
#
#   TARGET=./verify/fixtures/accessible-forms/styled-signup FAIL_ON=serious \
#   SUMMARY=true GITHUB_OUTPUT=/tmp/out GITHUB_STEP_SUMMARY=/tmp/summary \
#     bash scripts/ci-audit.sh
#
# Exit: 0 clean · 1 findings at or above FAIL_ON · 3 nothing could be audited.

set -uo pipefail

: "${GITHUB_ACTION_PATH:=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)}"
TARGET=${TARGET:-}
FAIL_ON=${FAIL_ON:-serious}
WCAG_ONLY=${WCAG_ONLY:-false}
SUMMARY=${SUMMARY:-true}
GITHUB_OUTPUT=${GITHUB_OUTPUT:-/dev/null}
GITHUB_STEP_SUMMARY=${GITHUB_STEP_SUMMARY:-/dev/null}

CLI="$GITHUB_ACTION_PATH/bin/a11y-skills.js"

if [ -z "$TARGET" ]; then
  echo "::error::target is required"
  exit 3
fi

# Resolve the target into a list of pages. A directory is walked for HTML because
# the usual case is auditing a build output folder.
targets=()
if [ -f "$TARGET" ]; then
  targets+=("$TARGET")
elif [ -d "$TARGET" ]; then
  while IFS= read -r file; do targets+=("$file"); done < <(find "$TARGET" -type f -name '*.html' | sort)
else
  targets+=("$TARGET")   # an http(s) URL, or the CLI will report that it is not
fi

if [ "${#targets[@]}" -eq 0 ]; then
  echo "::error::no HTML files found under $TARGET"
  exit 3
fi

extra=()
[ "$WCAG_ONLY" = "true" ] && extra+=(--wcag-only)
# Note the `${extra[@]+"${extra[@]}"}` form everywhere this is expanded: `set -u`
# plus an empty array is a portability trap, because bash 3.2 (the bash macOS
# ships) reports "${extra[@]}" as an unbound variable, while bash 5 does not.
findings=0
without_skill=0
failed=0
report=""
json="$(mktemp)"

for t in "${targets[@]}"; do
  echo "::group::a11y-skills audit $t"

  # One run for the machine-readable counts. --fail-on decides the step outcome,
  # so a non-zero exit here is expected: there is no `set -e`, so it does not stop
  # the loop, and the code is remembered instead.
  node "$CLI" audit "$t" --no-color --fail-on "$FAIL_ON" ${extra[@]+"${extra[@]}"} --json > "$json"
  code=$?

  # JSON.parse, not require: the temp file has no extension, and require() would
  # load an extensionless file as JavaScript, silently returning nothing for a
  # JSON payload. That bug reports every audit as zero findings.
  read -r f w < <(node -e '
    const fs = require("fs");
    const r = JSON.parse(fs.readFileSync(process.argv[1], "utf8"));
    console.log(r.summary.violations, r.summary.withoutSkill);
  ' "$json" 2>/dev/null) || { f=0; w=0; }
  f=${f:-0}
  w=${w:-0}
  findings=$((findings + f))
  without_skill=$((without_skill + w))
  [ "$code" -ne 0 ] && failed=1

  # One more run for the human report: Markdown for the job summary when it is
  # wanted, plain text for the log otherwise. Two runs per page, not three — a
  # build output directory holds hundreds of files, and each run launches a
  # browser.
  if [ "$SUMMARY" = "true" ]; then
    rep="$(node "$CLI" audit "$t" --no-color --fail-on none ${extra[@]+"${extra[@]}"} --md || true)"
    report+="$rep"$'\n'
  else
    rep="$(node "$CLI" audit "$t" --no-color --fail-on none ${extra[@]+"${extra[@]}"} || true)"
  fi
  printf '%s\n' "$rep"

  echo "::endgroup::"
done

rm -f "$json"

echo "findings=$findings" >> "$GITHUB_OUTPUT"
echo "without_skill=$without_skill" >> "$GITHUB_OUTPUT"

echo "audited ${#targets[@]} page(s): $findings findings, $without_skill with no skill yet"

if [ "$SUMMARY" = "true" ] && [ -n "$report" ]; then
  {
    echo "# Accessibility audit"
    echo
    echo "axe-core findings joined to the WCAG 2.2 procedure that fixes each one."
    echo "Automated checks find a minority of real problems: read each skill's"
    echo "\`## Verify\` section before treating this as done."
    echo
    printf '%s' "$report"
  } >> "$GITHUB_STEP_SUMMARY"
fi

exit "$failed"
