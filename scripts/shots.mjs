import { chromium } from 'playwright';
const base = 'http://127.0.0.1:8080';
const shots = [
  ['accueil',        '/',                 1440, 'full'],
  ['app-login',      '/app/',             1440, 'view'],
  ['app-dashboard',  '/app/#/tableau',    1440, 'view'],
  ['app-annonces',   '/app/#/annonces',   1440, 'view'],
  ['app-classement', '/app/#/classement', 1440, 'view'],
  ['app-rapports',   '/app/#/rapports',   1440, 'view'],
];
const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const errs = [];
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, locale: 'fr-FR' });
const p = await ctx.newPage();
p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
p.on('pageerror', e => errs.push('PAGEERROR ' + e.message));
for (const [name, path, w, mode] of shots) {
  await p.goto(base + path, { waitUntil: 'networkidle' });
  if (path.includes('#')) { await p.evaluate(() => {}); await p.waitForTimeout(500); }
  await p.waitForTimeout(700);
  await p.screenshot({ path: `/root/riseva/shots/${name}.png`, fullPage: mode === 'full' });
}
// mobile
const m = await ctx.newPage();
await m.setViewportSize({ width: 390, height: 844 });
await m.goto(base + '/', { waitUntil: 'networkidle' });
await m.screenshot({ path: '/root/riseva/shots/accueil-mobile.png', fullPage: true });
await b.close();
console.log('ERREURS:', errs.length ? errs.join('\n') : 'aucune');
