const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const publicDir = path.join(__dirname, '..', 'public');
const imagesDir = path.join(publicDir, 'images', 'social');

if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

// 1. Favicon SVG (reused from frontend inline SVG)
const faviconSvg = `\n<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">\n  <rect width="100" height="100" rx="20" fill="#000"/>\n  <text x="50" y="65" font-family="monospace" font-size="50" font-weight="bold" fill="#fff" text-anchor="middle">></text>\n  <circle cx="75" cy="30" r="12" fill="#ff0040"/>\n</svg>\n`;

fs.writeFileSync(path.join(publicDir, 'favicon.svg'), faviconSvg);

// 2. Apple touch icon (180x180 PNG from SVG)
async function generateAssets() {
  await sharp(Buffer.from(faviconSvg))
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));

  // 3. OG images (1200x630)
  // Use only ASCII to avoid font rendering issues in headless environments
  function createOgSvg() {
    return `\n<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="630" viewBox="0 0 1200 630">\n  <rect width="1200" height="630" fill="#0a0a0a"/>\n  <rect x="24" y="24" width="1152" height="582" fill="none" stroke="#00d4ff" stroke-width="8"/>\n  <text x="600" y="300" font-family="monospace" font-size="140" font-weight="bold" fill="#ffffff" text-anchor="middle">SPARKBIN</text>\n  <text x="600" y="400" font-family="monospace" font-size="36" fill="#a0a0a0" text-anchor="middle">AI-native project coach for indie hackers</text>\n  <text x="600" y="500" font-family="monospace" font-size="24" fill="#666666" text-anchor="middle">sparkbin.dev</text>\n</svg>\n`;
  }

  const ogSvg = createOgSvg();

  await sharp(Buffer.from(ogSvg))
    .png()
    .toFile(path.join(imagesDir, 'og-zh.png'));

  await sharp(Buffer.from(ogSvg))
    .png()
    .toFile(path.join(imagesDir, 'og-en.png'));

  console.log('Assets generated successfully:');
  console.log('  - public/favicon.svg');
  console.log('  - public/apple-touch-icon.png');
  console.log('  - public/images/social/og-zh.png');
  console.log('  - public/images/social/og-en.png');
}

generateAssets().catch((err) => {
  console.error('Asset generation failed:', err);
  process.exit(1);
});
