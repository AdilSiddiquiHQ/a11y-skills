#!/usr/bin/env node
/**
 * Executable fixtures — the reason to prefer this library over asking a model.
 *
 * Every other skills library asserts its advice in prose. This one runs it. A
 * fixture is a pair of real HTML documents:
 *
 *   before.html  — the mistake. Must trip the rules the fixture names.
 *   after.html   — the fix.   Must be completely clean: zero axe violations,
 *                  including best-practice rules, not merely clean of the rule
 *                  under test.
 *
 * That second requirement is deliberate and is what makes the claim strong. It
 * is easy to write an "after" that fixes one thing and introduces `region` or
 * `heading-order`. Requiring a completely clean document means the skills are
 * held to the standard they teach.
 *
 *   npm run fixtures              assert every fixture
 *   npm run fixtures -- --json    machine-readable, used by generate-coverage
 */

import { openBrowser, scanHtml, fixtureCases, readIfExists, ROOT } from './axe.js';

const CASES = fixtureCases();
const asJson = process.argv.includes('--json');

async function main() {
  if (CASES.length === 0) {
    console.error('no fixtures found in verify/fixtures/');
    process.exit(3);
  }

  const browser = await openBrowser();
  const results = [];

  try {
    for (const c of CASES) {
      const before = readIfExists(c.beforePath);
      const after = readIfExists(c.afterPath);
      const problems = [];

      if (before === null) problems.push('missing before.html');
      if (after === null) problems.push('missing after.html');

      const expected = c.meta.expectRules || [];
      if (expected.length === 0) problems.push('meta.json names no expectRules');

      // Some rules axe ships disabled. A fixture that names one has to enable it
      // in meta.json, or the "before" would never trip it and the case would pass
      // by testing nothing.
      const axeOptions = c.meta.axeOptions || {};

      let beforeIds = [];
      let afterViolations = [];

      if (before !== null) {
        beforeIds = (await scanHtml(browser, before, axeOptions)).map((v) => v.id);
        for (const rule of expected) {
          if (!beforeIds.includes(rule)) {
            problems.push(
              `before.html does not trigger '${rule}'` +
                (beforeIds.length ? ` (it triggered: ${beforeIds.join(', ')})` : ' (it triggered nothing)')
            );
          }
        }
      }

      if (after !== null) {
        afterViolations = await scanHtml(browser, after, axeOptions);
        for (const v of afterViolations) {
          problems.push(`after.html is not clean: ${v.id} (${v.impact}) — ${v.help}`);
        }
      }

      results.push({
        skill: c.skill,
        case: c.name,
        criterion: c.meta.criterion || '',
        expected,
        enabledByFixture: Object.keys(axeOptions.rules ?? {}).filter(
          (r) => axeOptions.rules[r]?.enabled === true
        ),
        beforeIds,
        afterClean: afterViolations.length === 0,
        ok: problems.length === 0,
        problems,
      });

      if (!asJson) {
        const label = `${c.skill}/${c.name}`;
        if (problems.length === 0) {
          console.log(`  ok    ${label.padEnd(44)} before: ${expected.join(', ')} → after: clean`);
        } else {
          console.log(`  FAIL  ${label}`);
          for (const p of problems) console.log(`        ${p}`);
        }
      }
    }
  } finally {
    await browser.close();
  }

  const failed = results.filter((r) => !r.ok);

  if (asJson) {
    console.log(JSON.stringify({ cases: results.length, failed: failed.length, results }, null, 2));
  } else {
    console.log('');
    if (failed.length === 0) {
      console.log(
        `  ${results.length} fixtures: every "before" trips its named rules, every "after" is clean`
      );
      console.log('');
    } else {
      console.log(`  ${failed.length} of ${results.length} fixtures failed`);
      console.log('');
    }
  }

  process.exit(failed.length === 0 ? 0 : 1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(3);
});
