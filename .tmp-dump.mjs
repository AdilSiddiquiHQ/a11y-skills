import { readFileSync } from 'node:fs';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { findChromium } from './lib/chromium.js';
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ executablePath: findChromium() || undefined });
const page = await browser.newPage();
await page.goto(pathToFileURL(process.argv[2]).href);
await page.addScriptTag({ content: axeSource });
const r = await page.evaluate(async () => {
  const res = await window.axe.run(document, { resultTypes: ['violations'] });
  return res.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({
    target: n.target.join(' '), html: n.html,
    any: n.any.map(c => ({ id: c.id, data: c.data, impact: c.impact }))
  }))}));
});
await browser.close();
console.log(JSON.stringify(r, null, 2));
