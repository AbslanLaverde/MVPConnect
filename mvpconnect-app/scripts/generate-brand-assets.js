const fs = require('fs');
const path = require('path');
const sharp = require('sharp');

const root = path.resolve(__dirname, '..');
const assets = path.join(root, 'assets');
const branding = path.join(assets, 'branding');
const masterPath = path.join(branding, 'mvpconnect-logo.svg');
const master = fs.readFileSync(masterPath, 'utf8');

function extractElementById(svg, id) {
  const startPattern = new RegExp(`<g\\b[^>]*\\bid=["']${id}["'][^>]*>`);
  const match = startPattern.exec(svg);
  if (!match) throw new Error(`Could not find SVG group #${id}`);

  const tokenPattern = /<g\b[^>]*>|<\/g>/g;
  tokenPattern.lastIndex = match.index;
  let depth = 0;
  let token;
  while ((token = tokenPattern.exec(svg))) {
    depth += token[0].startsWith('</') ? -1 : 1;
    if (depth === 0) return svg.slice(match.index, tokenPattern.lastIndex);
  }
  throw new Error(`SVG group #${id} is not closed`);
}

const defs = master.match(/<defs\b[^>]*>[\s\S]*?<\/defs>/)?.[0];
if (!defs) throw new Error('Master SVG does not contain definitions');

const exactMarkGroup = extractElementById(master, 'g168')
  .replace(/mix-blend-mode:overlay;/g, '');

function markSvg(monochrome = false) {
  const body = monochrome
    ? exactMarkGroup.replace(/fill:url\(#linearGradient156\)/g, 'fill:#ffffff')
    : exactMarkGroup;
  const title = monochrome ? 'MVPConnect monochrome mark' : 'MVPConnect mark';
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" xmlns:inkscape="http://www.inkscape.org/namespaces/inkscape" viewBox="0 0 21.991 21.991" role="img" aria-label="${title}">
  ${defs}
  <g transform="translate(0 2.529)">${body}</g>
</svg>\n`;
}

function monochromeLogoSvg() {
  return master
    .replace(/fill:url\(#[^)]+\)/g, 'fill:#ffffff')
    .replace(/stroke:#0ea5e9/g, 'stroke:#ffffff')
    .replace(/mix-blend-mode:overlay;/g, '');
}

const mark = markSvg(false);
const monoMark = markSvg(true);
fs.writeFileSync(path.join(branding, 'mvpconnect-mark.svg'), mark);
fs.writeFileSync(path.join(branding, 'mvpconnect-mark-monochrome.svg'), monoMark);
fs.writeFileSync(path.join(branding, 'mvpconnect-logo-monochrome.svg'), monochromeLogoSvg());

async function renderMark(size, monochrome = false) {
  return sharp(Buffer.from(monochrome ? monoMark : mark)).resize(size, size).png().toBuffer();
}

async function squareAsset(outputPath, canvasSize, markSize, options = {}) {
  const { background = null, monochrome = false } = options;
  const base = background
    ? { r: background.r, g: background.g, b: background.b, alpha: background.alpha ?? 1 }
    : { r: 0, g: 0, b: 0, alpha: 0 };
  const icon = await renderMark(markSize, monochrome);
  await sharp({ create: { width: canvasSize, height: canvasSize, channels: 4, background: base } })
    .composite([{ input: icon, gravity: 'center' }])
    .png()
    .toFile(outputPath);
}

async function main() {
  const dark = { r: 12, g: 14, b: 19, alpha: 1 };
  await sharp(Buffer.from(master))
    .resize(608, 128)
    .png()
    .toFile(path.join(branding, 'mvpconnect-logo-native.png'));
  await squareAsset(path.join(assets, 'icon.png'), 1024, 650, { background: dark });
  await squareAsset(path.join(assets, 'adaptive-icon.png'), 1024, 600);
  await squareAsset(path.join(assets, 'adaptive-icon-monochrome.png'), 1024, 600, { monochrome: true });
  await squareAsset(path.join(assets, 'splash.png'), 1024, 700);
  await squareAsset(path.join(assets, 'favicon.png'), 64, 46, { background: dark });

  const pwa = path.join(assets, 'pwa');
  fs.mkdirSync(pwa, { recursive: true });
  await squareAsset(path.join(pwa, 'icon-192.png'), 192, 122, { background: dark });
  await squareAsset(path.join(pwa, 'icon-512.png'), 512, 325, { background: dark });
  console.log('Generated MVPConnect brand assets from assets/branding/mvpconnect-logo.svg');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
