/**
 * The Business Lab badge as SVG markup, for build scripts (share images, favicon, app icons).
 * INTERIM drawing, identical to src/components/Logo.astro: a blue disc, a white ring and a white
 * B cut from Bricolage Grotesque 800. Replace both with the licensed logo when the file arrives
 * (docs/BRAND_GUIDE.md §4), then run `node scripts/brand-icons.mjs`.
 */
export const BLUE = '#0C61C4';
const B_PATH =
  'M57 0L57 660L334 660Q396 660 444.5 649.5Q493 639 527.5 617.5Q562 596 580 563Q598 530 598 485Q598 446 581.5 415.5Q565 385 529 366.5Q493 348 435 342L435 329Q533 323 579 282Q625 241 625 173Q625 115 594.5 77Q564 39 505 19.5Q446 0 359 0ZM214 129L353 129Q409 129 437.5 147Q466 165 466 201Q466 241 432.5 261Q399 281 331 281L214 281ZM214 384L312 384Q377 384 408.5 403.5Q440 423 440 461Q440 498 411 515.5Q382 533 324 533L214 533Z';

/** The badge drawn in a 64×64 box, as a <g> ready to be translated and scaled. */
export const badge = () =>
  `<circle cx="32" cy="32" r="32" fill="${BLUE}"/>` +
  `<circle cx="32" cy="32" r="27.5" fill="none" stroke="#FFFFFF" stroke-width="1.5"/>` +
  `<path fill="#FFFFFF" transform="translate(16.5 47) scale(0.04545 -0.04545)" d="${B_PATH}"/>`;

/** A standalone SVG of the badge. */
export const badgeSvg = (size = 64) =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 64 64" role="img" aria-label="Business Lab">${badge()}</svg>\n`;
