#!/usr/bin/env node
/*
 * Exporte les icônes PNG à partir de icons/icon.svg.
 *
 *   node tools/export-icons.cjs
 *
 * Nécessite Playwright et un Chromium (outil de préparation uniquement :
 * l'application elle-même n'a aucune dépendance).
 *   - icon-192.png, icon-512.png : coins arrondis transparents (usage « any ») ;
 *   - apple-touch-icon.png : carré plein, sans transparence (iPhone/iPad) ;
 *   - icon-maskable-*.png : fond plein, lettres réduites à 80 % (Android).
 */
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const dir = path.join(__dirname, '..', 'icons');
const base = fs.readFileSync(path.join(dir, 'icon.svg'), 'utf8');
const square = base.replace('<rect width="512" height="512" rx="112"', '<rect width="512" height="512"');
const maskable = square.replace(/<g fill="none"([^>]*)transform="([^"]*)"/, (m, a, t) => `<g fill="none"${a}transform="translate(256 256) scale(0.8) translate(-256 -256) ${t}"`);
if (square === base || maskable === square) throw new Error('icon.svg : structure inattendue');

const jobs = [
  ['icon-192.png', 192, base, true],
  ['icon-512.png', 512, base, true],
  ['apple-touch-icon.png', 180, square, false],
  ['icon-maskable-192.png', 192, maskable, false],
  ['icon-maskable-512.png', 512, maskable, false]
];

(async () => {
  const browser = await chromium.launch();
  for (const [file, size, svg, transparent] of jobs) {
    const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
    await page.setContent(`<html><body style="margin:0;background:transparent">${svg.replace('<svg ', `<svg width="${size}" height="${size}" style="display:block" `)}</body></html>`);
    await page.screenshot({ path: path.join(dir, file), omitBackground: transparent });
    await page.close();
  }
  await browser.close();
  console.log(`${jobs.length} icônes exportées dans ${dir}`);
})();
