/*
 * Generate icon.png, adaptive-icon.png, and splash.png from the brand SVG.
 *
 * Usage:
 *   npm i -D sharp
 *   node scripts/generate-assets.js
 *
 * Writes into ./assets/.
 */
const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('Missing dependency "sharp". Install with:\n  npm i -D sharp');
  process.exit(1);
}

const ROOT = path.resolve(__dirname, '..');
const ASSETS = path.join(ROOT, 'assets');

const NAVY = '#031634';
const RED = '#C8102E';
const WHITE = '#fbf8fc';

// Full app icon: rounded red frame + navy vehicle body. Mirrors assets/logo.svg.
const ICON_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <rect width="1024" height="1024" rx="236" fill="${RED}"/>
  <rect x="221" y="284" width="583" height="536" rx="79" fill="${NAVY}"/>
  <rect x="284" y="347" width="457" height="173" rx="24" fill="${WHITE}"/>
  <rect x="221" y="567" width="583" height="47" fill="${WHITE}"/>
  <circle cx="315" cy="725" r="39" fill="${WHITE}"/>
  <circle cx="709" cy="725" r="39" fill="${WHITE}"/>
</svg>`;

// Android adaptive-icon foreground: vehicle body (navy + white details) only,
// scaled to fit the inner 66% safe zone. Android applies its own mask, and
// app.json supplies the red backgroundColor, so this layer must have no outer frame.
// Vehicle-body bbox: x∈[221, 804], y∈[284, 820], center = (512.5, 552).
// scale 0.85, then translate so the bbox center lands on (512, 512).
const ADAPTIVE_FG_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1024 1024" width="1024" height="1024">
  <g transform="translate(76 43) scale(0.85)">
    <rect x="221" y="284" width="583" height="536" rx="79" fill="${NAVY}"/>
    <rect x="284" y="347" width="457" height="173" rx="24" fill="${WHITE}"/>
    <rect x="221" y="567" width="583" height="47" fill="${WHITE}"/>
    <circle cx="315" cy="725" r="39" fill="${WHITE}"/>
    <circle cx="709" cy="725" r="39" fill="${WHITE}"/>
  </g>
</svg>`;

const hexToRgb = (hex) => {
  const v = parseInt(hex.slice(1), 16);
  return { r: (v >> 16) & 255, g: (v >> 8) & 255, b: v & 255, alpha: 1 };
};

async function renderSquare(svg, outPath, size) {
  const buf = await sharp(Buffer.from(svg))
    .resize({
      width: size,
      height: size,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();
  fs.writeFileSync(outPath, buf);
  console.log(`  ${path.relative(ROOT, outPath)} (${size}×${size})`);
}

async function renderSplash(outPath, width, height) {
  // Brand mark centered on a solid navy canvas, sized to ~40% of the shorter
  // dimension. Expo's `resizeMode: contain` then handles per-device scaling.
  const logoSize = Math.round(Math.min(width, height) * 0.4);
  const logoBuf = await sharp(Buffer.from(ICON_SVG))
    .resize({
      width: logoSize,
      height: logoSize,
      fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  const canvas = await sharp({
    create: { width, height, channels: 4, background: hexToRgb(NAVY) },
  })
    .composite([{ input: logoBuf, gravity: 'center' }])
    .png()
    .toBuffer();

  fs.writeFileSync(outPath, canvas);
  console.log(`  ${path.relative(ROOT, outPath)} (${width}×${height})`);
}

(async () => {
  if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true });

  console.log('Generating PNG assets from brand SVG...');
  await renderSquare(ICON_SVG, path.join(ASSETS, 'icon.png'), 1024);
  await renderSquare(ADAPTIVE_FG_SVG, path.join(ASSETS, 'adaptive-icon.png'), 1024);
  await renderSplash(path.join(ASSETS, 'splash.png'), 1242, 2436);
  console.log('Done.');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
