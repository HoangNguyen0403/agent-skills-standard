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
const TEXT_HEX_COLOR = /^text-\[(?:color:)?(#[0-9a-f]{3}|#[0-9a-f]{6})\]$/i;
const SKIP_TEXT_TAGS = new Set(['script', 'style', 'svg', 'template']);


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
    .replace(/<script\b[^>]*>[\s\S]*?<\/script[^>]*>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style[^>]*>/gi, ' ')
    .replace(/<(span|i)\b[^>]*material-(symbols|icons)[^>]*>[^<]*<\/\1[^>]*>/gi, ' ')
    .replace(/<svg\b[^>]*>[\s\S]*?<\/svg[^>]*>/gi, ' ')
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

function elementTextById(html) {
  const tagRe = /<\/?([a-z0-9-]+)\b([^>]*)>/gi;
  const stack = [];
  const texts = new Map();
  let match;
  while ((match = tagRe.exec(html)) !== null) {
    const tag = match[1].toLowerCase();
    if (match[0].startsWith('</')) {
      let index = stack.length - 1;
      while (index >= 0 && stack[index].tag !== tag) index--;
      if (index >= 0) {
        const { id, start } = stack[index];
        if (id) texts.set(id, textOf(html.slice(start, match.index)));
        stack.length = index;
      }
      continue;
    }
    if (VOID_TAGS.has(tag) || /\/\s*>$/.test(match[0])) continue;
    const idMatch = match[2].match(/(?:^|\s)id\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i);
    stack.push({ tag, id: idMatch?.[1] ?? idMatch?.[2] ?? idMatch?.[3], start: tagRe.lastIndex });
  }
  return texts;
}

function hasAccessibleName(attrs, textsById) {
  const matches = attrs.matchAll(/(?:^|\s)(aria-label|aria-labelledby|title)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi);
  for (const m of matches) {
    const val = (m[2] ?? m[3] ?? m[4]).trim();
    if (m[1].toLowerCase() === 'aria-labelledby') {
      if (val.split(/\s+/).some((id) => textsById.get(id))) return true;
    } else if (val.length > 0) {
      return true;
    }
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

function primaryTextContrastCounts(html, primary) {
  const tagRe = /<\/?([a-z0-9-]+)\b([^>]*)>/gi;
  const stack = [];
  const white = new Set();
  const other = new Set();
  const recordText = (start, end) => {
    const active = stack[stack.length - 1];
    if (!active || active.skip || active.background !== 'bg-primary' ||
        !active.primaryElement || start === end) return;
    const foreground = active.foreground;
    const hex = foreground === 'text-white' ? '#ffffff'
      : foreground === 'text-black' ? '#000000'
        : foreground?.match(TEXT_HEX_COLOR)?.[1];
    if (!hex || !textOf(html.slice(start, end))) return;
    const ratio = primary ? contrastRatio(primary, hex) : null;
    if (foreground === 'text-white') {
      if (ratio === null || ratio < AA_TEXT) white.add(active.primaryElement);
    } else if (ratio !== null && ratio < AA_TEXT) {
      other.add(active.primaryElement);
    }
  };
  let match;
  let cursor = 0;
  while ((match = tagRe.exec(html)) !== null) {
    recordText(cursor, match.index);
    cursor = tagRe.lastIndex;
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
    if (!VOID_TAGS.has(tag) && !/\/\s*>$/.test(token)) {
      stack.push({
        tag, background, foreground, primaryElement,
        skip: parent?.skip || SKIP_TEXT_TAGS.has(tag) ||
          classes.includes('material-symbols-outlined') || classes.includes('material-icons')
      });
    }
  }
  recordText(cursor, html.length);
  return { white: white.size, other: other.size };
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

  const buttons = elements(html, 'button');
  const iconButtons = buttons.filter((el) => textOf(el.inner) === '');
  const textsById = iconButtons.some((el) => /(?:^|\s)aria-labelledby\s*=/i.test(el.attrs))
    ? elementTextById(html) : new Map();
  const unlabeled = iconButtons.filter((el) => !hasAccessibleName(el.attrs, textsById));
  add('unlabeled-icon-button', unlabeled.length, 'icon-only button without a resolved accessible name');

  const primaryText = primaryTextContrastCounts(html, primary);
  add('white-on-primary', primaryText.white, `white text on primary ${primary ?? 'unknown'} (contrast ${primaryOnWhite ?? 'unknown'}:1, needs ${AA_TEXT}:1)`);
  add('low-contrast-primary-text', primaryText.other, `dark text on primary ${primary ?? 'unknown'} below ${AA_TEXT}:1`);

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
