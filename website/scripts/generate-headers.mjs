import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const websiteDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outDirectory = path.resolve(websiteDirectory, 'out');
const headerTemplatePath = path.resolve(websiteDirectory, 'public/_headers');
const headerOutputPath = path.resolve(outDirectory, '_headers');

if (!fs.existsSync(outDirectory) || !fs.statSync(outDirectory).isDirectory()) {
  throw new Error(`Static export directory is missing: ${outDirectory}`);
}
if (!fs.existsSync(headerTemplatePath)) throw new Error(`Header template is missing: ${headerTemplatePath}`);

const findHtmlFiles = (directory) => fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
  const entryPath = path.resolve(directory, entry.name);
  if (entry.isDirectory()) return findHtmlFiles(entryPath);
  return entry.isFile() && entry.name.endsWith('.html') ? [entryPath] : [];
});
const htmlFiles = findHtmlFiles(outDirectory);
if (htmlFiles.length === 0) throw new Error('No exported HTML files found in out/. Cannot derive export security headers.');

const scriptHashes = new Set();
const styleElementHashes = new Set();
const styleAttributeHashes = new Set();
const hash = (value) => `'sha256-${crypto.createHash('sha256').update(value, 'utf8').digest('base64')}'`;
const visit = (node) => {
  if (node.tagName === 'script') {
    const hasSource = node.attrs?.some(({ name }) => name.toLowerCase() === 'src') ?? false;
    const scriptText = (node.childNodes ?? []).map((child) => child.value ?? '').join('');
    if (!hasSource && scriptText.trim()) scriptHashes.add(hash(scriptText));
  }
  if (node.tagName === 'style') {
    const styleText = (node.childNodes ?? []).map((child) => child.value ?? '').join('');
    if (styleText.trim()) styleElementHashes.add(hash(styleText));
  }
  for (const attribute of node.attrs ?? []) {
    if (attribute.name.toLowerCase() === 'style') styleAttributeHashes.add(hash(attribute.value));
  }
  for (const child of node.childNodes ?? []) visit(child);
  if (node.content) visit(node.content);
};

for (const htmlFile of htmlFiles) visit(parse(fs.readFileSync(htmlFile, 'utf8')));

const sourcePolicy = (directive, hashes) => `${directive} 'self'${hashes.size ? ` ${[...hashes].sort().join(' ')}` : ''}`;
const styleAttributePolicy = styleAttributeHashes.size
  ? `style-src-attr 'unsafe-hashes' ${[...styleAttributeHashes].sort().join(' ')}`
  : "style-src-attr 'none'";
const contentSecurityPolicy = [
  "default-src 'self'",
  sourcePolicy('script-src', scriptHashes),
  sourcePolicy('style-src', styleElementHashes),
  styleAttributePolicy,
  "font-src 'self'",
  "img-src 'self' data:",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "form-action 'self'",
].join('; ');

let headers = fs.readFileSync(headerTemplatePath, 'utf8');
let blocksReplaced = 0;
headers = headers.replace(/(^|\n)\/\*\n([\s\S]*?)(?=(\n\S|\n*$))/g, (block, boundary) => {
  blocksReplaced += 1;
  return `${boundary}${block.slice(boundary.length).trimEnd()}\n  Content-Security-Policy: ${contentSecurityPolicy}`;
});
if (blocksReplaced !== 1) throw new Error(`Expected exactly one /* header block, found ${blocksReplaced}.`);
fs.writeFileSync(headerOutputPath, headers, 'utf8');
console.log(`Generated CSP across ${htmlFiles.length} HTML files: ${scriptHashes.size} script hashes, ${styleElementHashes.size} style-element hashes, ${styleAttributeHashes.size} style-attribute hashes.`);
console.log(`Generated _headers size: ${Buffer.byteLength(headers, 'utf8')} bytes; host-specific header limits still require deployment validation.`);
