/**
 * Writes the favicon, the standalone mark and the app icons from scripts/brand-mark.mjs, so every
 * copy of the logo comes from one drawing. Run by hand after the mark changes:
 *   node scripts/brand-icons.mjs
 */
import { writeFileSync } from 'node:fs';
import { Resvg } from '@resvg/resvg-js';
import { badge, badgeSvg } from './brand-mark.mjs';

writeFileSync('public/favicon.svg', badgeSvg(64));
writeFileSync('public/brand/logo-mark.svg', badgeSvg(64));

const png = (svg, size) => new Resvg(svg, { fitTo: { mode: 'width', value: size } }).render().asPng();
for (const size of [192, 512]) {
  writeFileSync(`public/icons/icon-${size}.png`, png(badgeSvg(64), size));
}
// Maskable: the platform crops to a circle or squircle, so the badge sits inside the safe zone
// (the middle 80%) on a navy field.
const maskable = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" fill="#0B1240"/><g transform="translate(8 8)">${badge()}</g></svg>`;
writeFileSync('public/icons/icon-maskable-512.png', png(maskable, 512));
console.log('Brand icons written: favicon.svg, brand/logo-mark.svg, icons/*.png');
