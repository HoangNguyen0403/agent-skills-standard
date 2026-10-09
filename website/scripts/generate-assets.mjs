import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';

const websiteDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourceDirectory = path.resolve(websiteDirectory, 'assets');
const fontDirectory = path.resolve(websiteDirectory, 'src/fonts');
const publicDirectory = path.resolve(websiteDirectory, 'public');
const socialCardPath = path.resolve(sourceDirectory, 'social-card.svg');
const socialCardOutput = path.resolve(publicDirectory, 'og/agent-skills-standard.png');
const faviconOutput = path.resolve(publicDirectory, 'favicon.png');
const registeredFonts = [
  path.resolve(fontDirectory, 'space-grotesk-600.ttf'),
  path.resolve(fontDirectory, 'source-sans-3-400.ttf'),
  path.resolve(fontDirectory, 'ibm-plex-mono-400.ttf'),
];

for (const requiredPath of [socialCardPath, ...registeredFonts]) {
  if (!fs.existsSync(requiredPath)) throw new Error(`Required website-local asset input is missing: ${requiredPath}`);
}

const sourceSvg = fs.readFileSync(socialCardPath, 'utf8');
if (/font-family\s*:\s*(?:Space|Source|Plex)(?:[;}]|\s)/.test(sourceSvg)) {
  throw new Error('Social card source uses renderer aliases instead of registered font family names.');
}
const resvg = new Resvg(sourceSvg, {
  fitTo: { mode: 'width', value: 1200 },
  font: { loadSystemFonts: false, fontFiles: registeredFonts, defaultFontFamily: 'Source Sans 3' },
});
const socialCard = resvg.render();
if (socialCard.width !== 1200 || socialCard.height !== 630) {
  throw new Error(`Social card dimensions must be 1200x630; received ${socialCard.width}x${socialCard.height}.`);
}
fs.mkdirSync(path.dirname(socialCardOutput), { recursive: true });
fs.writeFileSync(socialCardOutput, socialCard.asPng());
console.log(`Rendered OG image ${socialCardOutput} (${socialCard.width}x${socialCard.height}).`);

const iconSource = fs.readFileSync(path.resolve(publicDirectory, 'icon.svg'), 'utf8');
const icon = new Resvg(iconSource, {
  fitTo: { mode: 'width', value: 32 },
  font: { loadSystemFonts: false },
}).render();
fs.writeFileSync(faviconOutput, icon.asPng());
console.log(`Rendered PNG favicon ${faviconOutput} (${icon.width}x${icon.height}); no ICO container is claimed.`);
