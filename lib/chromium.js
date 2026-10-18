/**
 * Find a Chromium to drive, without depending on anything.
 *
 * Shared by the fixture harness (verify/axe.js) and by `a11y-skills audit`, and
 * deliberately dependency-free: the CLI's whole promise is that it installs
 * nothing, so `a11y-skills audit` must be able to say "I found the browser you
 * already have at this path, or I found none" without pulling in a framework to
 * work it out.
 *
 * Order matters: an explicit override, then a search of the Playwright browser
 * cache. The search exists because the cached browser is shared with whatever else
 * installed Playwright, and because `playwright-core` downloads nothing — on a
 * machine where the browsers came from somewhere else, the default path does not
 * exist. "No browser found" is a much worse error than twenty lines of searching.
 */

import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

/** Sub-paths inside a `ms-playwright` entry, by platform. */
const LAYOUTS = {
  'chromium_headless_shell-': (entry) => [
    join(entry, 'chrome-headless-shell-mac-arm64', 'chrome-headless-shell'),
    join(entry, 'chrome-headless-shell-mac-x64', 'chrome-headless-shell'),
    join(entry, 'chrome-headless-shell-linux64', 'chrome-headless-shell'),
    join(entry, 'chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
  ],
  'chromium-': (entry) => [
    join(entry, 'chrome-linux', 'chrome'),
    join(entry, 'chrome-mac-arm64', 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'),
    join(entry, 'chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
    join(entry, 'chrome-win', 'chrome.exe'),
  ],
};

/** Candidate binary paths, in the order they should be tried. */
export function chromiumCandidates() {
  const caches = [
    join(homedir(), 'Library', 'Caches', 'ms-playwright'),
    join(homedir(), '.cache', 'ms-playwright'),
    join(homedir(), 'AppData', 'Local', 'ms-playwright'),
  ];

  const candidates = [];
  for (const cache of caches) {
    if (!existsSync(cache)) continue;
    for (const name of readdirSync(cache)) {
      for (const [prefix, layout] of Object.entries(LAYOUTS)) {
        if (name.startsWith(prefix)) candidates.push(...layout(join(cache, name)));
      }
    }
  }
  return candidates;
}

/**
 * The first Chromium that exists, or null.
 *
 * Returns null rather than throwing so callers can choose their own message: the
 * fixture harness wants a hard error, the CLI wants to explain the two ways to get
 * a browser and exit 3.
 */
export function findChromium() {
  const override = process.env.CHROMIUM_PATH;
  if (override) return existsSync(override) ? override : null;
  return chromiumCandidates().find((p) => existsSync(p)) ?? null;
}
