import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { chromium } from 'playwright';
import { pathToFileURL } from 'node:url';
import { findChromium } from './lib/chromium.js';
const axeSource = readFileSync('node_modules/axe-core/axe.min.js', 'utf8');
const browser = await chromium.launch({ executablePath: findChromium() });
const dir = 'verify/fixtures';
for (const skill of readdirSync(dir)) {
  const sd = `${dir}/${skill}`;
  if (!existsSync(sd) || !readdirSync(sd).length) continue;
  for (const c of readdirSync(sd)) {
    const f = `${sd}/${c}/before.html`;
    if (!existsSync(f)) continue;
    const page = await browser.newPage();
    await page.goto(pathToFileURL(f).href);
    await page.addScriptTag({ content: axeSource });
    const r = await page.evaluate(async () => {
      const res = await window.axe.run(document, { resultTypes: ['violations'] });
      return res.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => ({
        target: n.target.join(' '), html: n.html.slice(0,120),
        any: n.any.map(x => ({ id: x.id, data: x.data })),
        all: n.all.map(x => ({ id: x.id, data: x.data })),
      }))}));
    });
    await page.close();
    console.log(`\n### ${skill}/${c}`);
    for (const v of r) for (const n of v.nodes) console.log(v.id, '|', n.target, '|', n.html.replace(/\s+/g,' '), '|', JSON.stringify([...n.any, ...n.all].map(x=>x.data)));
  }
}
await browser.close();
