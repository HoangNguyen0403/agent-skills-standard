#!/usr/bin/env node
'use strict';
// Read-only audit of Google Stitch screen HTML exports.
// Usage: node audit_html.js <dir>   exit 0 clean, 3 findings, 1 bad input.
const fs = require('fs');
const path = require('path');

const MIN_TEXT_PX = 14;
const MIN_TARGET_PX = 44;
const AA_TEXT = 4.5;
const EN_WORDS = ['the', 'and', 'your', 'add', 'save', 'view', 'edit', 'delete', 'settings', 'home', 'profile', 'next', 'back', 'done', 'cancel', 'upload', 'all'];
const VI_CHARS = /[ăâđêôơưàáạảãằắặẳẵầấậẩẫèéẹẻẽềếệểễìíịỉĩòóọỏõồốộổỗờớợởỡùúụủũừứựửữỳýỵỷỹ]/i;
const TAILWIND_COLOR_NAMES = '(?:slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)';
const BG_PALETTE_COLOR = new RegExp(`^bg-${TAILWIND_COLOR_NAMES}-\\d{2,3}(?:\\/\\d+)?$`);
const TEXT_PALETTE_COLOR = new RegExp(`^text-${TAILWIND_COLOR_NAMES}-\\d{2,3}(?:\\/\\d+)?$`);
const BG_ARBITRARY_COLOR = /^bg-\[(?:#[\da-f]{3,8}|color:[^\]]+)\]$/i;
const TEXT_ARBITRARY_COLOR = /^text-\[(?:#[\da-f]{3,8}|color:[^\]]+)\]$/i;
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);


function normalizeHex(hex) {
  const h = hex.replace('#', '').toLowerCase();
  return `#${h.length === 3 ? h.split('').map((c) => c + c).join('') : h}`;
}

function luminance(hex) {
  const h = normalizeHex(hex).slice(1);
  return [0, 2, 4]
    .map((i) => parseInt(h.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4))
    .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i], 0);
}

function contrastRatio(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return Math.round(((hi + 0.05) / (lo + 0.05)) * 100) / 100;
}

function textOf(html) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<(span|i)[^>]*material-(symbols|icons)[^>]*>[^<]*<\/\1>/gi, ' ')
    .replace(/<svg[\s\S]*?<\/svg>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function classTokens(attrs) {
  const m = attrs.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
  return m ? (m[1] ?? m[2]).split(/\s+/).filter(Boolean) : [];
}

function extractClassTokens(str) {
  return [...str.matchAll(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/gi)]
    .flatMap((m) => (m[1] ?? m[2]).split(/\s+/))
    .filter(Boolean);
}

function hasAccessibleName(attrs) {
  const matches = attrs.matchAll(/\b(?:aria-label(?:ledby)?|title)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi);
  for (const m of matches) {
    const val = (m[1] ?? m[2] ?? m[3]).trim();
    if (val.length > 0) return true;
  }
  return false;
}

function elements(html, tags) {
  const re = new RegExp(`<(${tags})\\b([^>]*)>([\\s\\S]*?)<\\/\\1>`, 'gi');
  return [...html.matchAll(re)].map((m) => ({ tag: m[1].toLowerCase(), attrs: m[2], inner: m[3] }));
}

function backgroundColor(classes) {
  return classes.find((name) =>
    name === 'bg-primary' ||
    /^(?:bg-(?:black|white|current)|bg-background(?:-(?:light|dark))?)$/.test(name) ||
    BG_PALETTE_COLOR.test(name) ||
    BG_ARBITRARY_COLOR.test(name)
  ) ?? null;
}

function textColor(classes) {
  return classes.find((name) =>
    name === 'text-white' ||
    /^(?:text-(?:black|transparent|current))$/.test(name) ||
    TEXT_PALETTE_COLOR.test(name) ||
    TEXT_ARBITRARY_COLOR.test(name)
  ) ?? null;
}

function whiteTextOnPrimaryCount(html) {
  const tagRe = /<\/?([a-z0-9-]+)\b([^>]*)>/gi;
  const stack = [];
  const primaryElements = new Set();
  let match;
  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    const token = match[0];
    if (token.startsWith('</')) {
      let index = stack.length - 1;
      while (index >= 0 && stack[index].tag !== tag) index--;
      if (index >= 0) stack.length = index;
      continue;
    }

    const classes = classTokens(match[2]);
    const ownBackground = backgroundColor(classes);
    const ownTextColor = textColor(classes);
    const parent = stack[stack.length - 1];
    const background = ownBackground ?? parent?.background ?? null;
    const foreground = ownTextColor ?? parent?.foreground ?? null;
    const primaryElement = ownBackground === 'bg-primary'
      ? {}
      : ownBackground
        ? null
        : parent?.primaryElement ?? null;
    if (background === 'bg-primary' && foreground === 'text-white' && primaryElement) {
      primaryElements.add(primaryElement);
    }
    if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(token)) {
      stack.push({ tag, background, foreground, primaryElement });
    }
  }
  return primaryElements.size;
}


function sizePx(token) {
  const scale = token.match(/^(?:w|h|size)-(\d+)$/);
  if (scale) return Number(scale[1]) * 4;
  const arbitrary = token.match(/^(?:w|h|size)-\[(\d+)px\]$/);
  return arbitrary ? Number(arbitrary[1]) : null;
}

function auditHtml(html) {
  const findings = [];
  const add = (rule, count, detail) => { if (count > 0) findings.push({ rule, count, detail }); };

  const primaryMatch = html.match(/["']?primary["']?\s*:\s*["'](#[0-9a-fA-F]{6}|#[0-9a-fA-F]{3})["']/);
  const primary = primaryMatch ? normalizeHex(primaryMatch[1]) : null;
  const primaryOnWhite = primary ? contrastRatio(primary, '#ffffff') : null;
  const fonts = [...new Set([...html.matchAll(/family=([^:&"']+)/g)]
    .map((m) => decodeURIComponent(m[1]).replace(/\+/g, ' ').trim())
    .filter((f) => !/material/i.test(f)))];

  const allClasses = extractClassTokens(html);
  const small = allClasses.filter((t) => t === 'text-xs' || (/^text-\[(\d+)px\]$/.test(t) && Number(t.match(/\d+/)[0]) < MIN_TEXT_PX));
  add('small-text', small.length, `text under ${MIN_TEXT_PX}px: ${[...new Set(small)].join(', ')}`);

  const interactive = elements(html, 'button|a');
  const tiny = interactive.filter((el) => classTokens(el.attrs).some((t) => { const px = sizePx(t); return px !== null && px < MIN_TARGET_PX; }));
  add('small-target', tiny.length, `button/link with explicit width or height under ${MIN_TARGET_PX}px`);

  const unlabeled = elements(html, 'button').filter((el) => !hasAccessibleName(el.attrs) && textOf(el.inner) === '');
  add('unlabeled-icon-button', unlabeled.length, 'icon-only button without aria-label, aria-labelledby, or title');

  if (primaryOnWhite === null || primaryOnWhite < AA_TEXT) {
    add('white-on-primary', whiteTextOnPrimaryCount(html), `white text on primary ${primary ?? 'unknown'} (contrast ${primaryOnWhite ?? 'unknown'}:1, needs ${AA_TEXT}:1)`);
  }

  const text = textOf(html);
  if (VI_CHARS.test(text)) {
    const words = new Set((text.toLowerCase().match(/\b[a-z]+\b/g) || []).filter((w) => EN_WORDS.includes(w)));
    if (words.size >= 2) add('mixed-language', words.size, `English UI words on a Vietnamese screen: ${[...words].join(', ')}`);
  }

  add('multiple-fonts', fonts.length > 1 ? fonts.length : 0, `font families: ${fonts.join(', ')}`);
  return { primary, fonts, primaryOnWhite, findings };
}


function auditDirectory(dir) {
  if (!dir || !fs.existsSync(dir) || !fs.statSync(dir).isDirectory()) {
    return { exitCode: 1, report: null, error: `not a directory: ${dir}` };
  }
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.html')).sort();
  if (files.length === 0) return { exitCode: 1, report: null, error: `no .html files in ${dir}` };
  const screens = files.map((file) => ({ file, ...auditHtml(fs.readFileSync(path.join(dir, file), 'utf8')) }));
  const primaries = [...new Set(screens.map((s) => s.primary).filter(Boolean))].sort();
  const projectFindings = primaries.length > 1
    ? [{ rule: 'inconsistent-primary', count: primaries.length, detail: `primary colours differ across screens: ${primaries.join(', ')}` }]
    : [];
  const any = projectFindings.length > 0 || screens.some((s) => s.findings.length > 0);
  return { exitCode: any ? 3 : 0, report: { screens, project: { primaries, findings: projectFindings } } };
}

if (require.main === module) {
  const { exitCode, report, error } = auditDirectory(process.argv[2]);
  if (error) {
    process.stderr.write(`${error}\nUsage: node audit_html.js <dir-of-stitch-html>\n`);
  } else {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  }
  process.exit(exitCode);
}

module.exports = { contrastRatio, auditHtml, auditDirectory };
