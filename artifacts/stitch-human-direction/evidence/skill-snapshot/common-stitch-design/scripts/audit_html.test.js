'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { contrastRatio, auditHtml, auditDirectory } = require('./audit_html');

const page = (body, primary = '#c5a581') =>
  `<html><head><link href="https://fonts.googleapis.com/css2?family=Lexend:wght@400;600&family=Material+Symbols+Outlined" rel="stylesheet">` +
  `<script>tailwind.config={theme:{extend:{colors:{"primary":"${primary}"}}}}</script></head><body>${body}</body></html>`;
const rules = (r) => r.findings.map((f) => f.rule);
const find = (r, rule) => r.findings.find((f) => f.rule === rule);

test('contrastRatio matches WCAG values from the review', () => {
  assert.equal(contrastRatio('#c5a581', '#ffffff'), 2.31);
  assert.equal(contrastRatio('#c5a581', '#2b2118'), 6.8);
  assert.equal(contrastRatio('#C5A581', '#FFF'), 2.31);
});

test('extracts primary and non-icon fonts', () => {
  const r = auditHtml(page('<p>Xin chào</p>'));
  assert.equal(r.primary, '#c5a581');
  assert.deepEqual(r.fonts, ['Lexend']);
  assert.equal(r.primaryOnWhite, 2.31);
});

test('missing primary and fonts do not crash', () => {
  const r = auditHtml('<html><body><button class="w-8 h-8"><svg></svg></button></body></html>');
  assert.equal(r.primary, null);
  assert.deepEqual(r.fonts, []);
  assert.equal(r.primaryOnWhite, null);
  assert.ok(rules(r).includes('small-target'));
  assert.ok(rules(r).includes('unlabeled-icon-button'));
});

test('white text on a low-contrast primary is flagged; on a dark primary it is not', () => {
  const body = '<button class="bg-primary text-white h-14">Lưu</button>';
  const low = auditHtml(page(body));
  assert.equal(find(low, 'white-on-primary').count, 1);
  const high = auditHtml(page(body, '#7a5a36'));
  assert.equal(find(high, 'white-on-primary'), undefined);
});

test('dark text on a dark primary action fails contrast even when white would pass', () => {
  const result = auditHtml(page(
    '<button class="bg-primary text-[#333333]">Lưu</button>', '#222222'
  ));
  assert.equal(find(result, 'low-contrast-primary-text').count, 1);
});

test('prefixed and opacity primary classes are ignored', () => {
  const r = auditHtml(page('<a class="hover:bg-primary text-white">x</a><div class="bg-primary/10 text-white">y</div>'));
  assert.equal(find(r, 'white-on-primary'), undefined);
});

test('small text counts unprefixed text-xs and arbitrary sizes under 14px only', () => {
  const r = auditHtml(page('<p class="text-xs">a</p><p class="text-[11px]">b</p><p class="text-sm">c</p><p class="text-[16px]">d</p><p class="md:text-xs">e</p>'));
  assert.equal(find(r, 'small-text').count, 2);
});

test('small targets: 40px and arbitrary px under 44 flagged, 48px and full width not', () => {
  const r = auditHtml(page('<button class="w-10 h-10" aria-label="Đóng">x</button><a class="h-[40px]">Xem</a><button class="h-12 w-full">Lưu</button>'));
  assert.equal(find(r, 'small-target').count, 2);
});

test('icon-only buttons need an accessible name', () => {
  const r = auditHtml(page(
    '<button><span class="material-symbols-outlined">close</span></button>' +
    '<button aria-label="Đóng"><span class="material-symbols-outlined">close</span></button>' +
    '<button><span class="material-symbols-outlined">add</span> Thêm</button>' +
    '<button><svg viewBox="0 0 1 1"></svg></button>'));
  assert.equal(find(r, 'unlabeled-icon-button').count, 2);
});

test('mixed language needs Vietnamese plus two distinct English UI words', () => {
  const mixed = auditHtml(page('<p>Thêm kỷ niệm</p><button>Quick Add</button><a>View all</a>'));
  assert.ok(rules(mixed).includes('mixed-language'));
  const vi = auditHtml(page('<p>Thêm kỷ niệm</p><button>Lưu thay đổi</button>'));
  assert.ok(!rules(vi).includes('mixed-language'));
});

test('multiple font families are flagged', () => {
  const html = page('<p>x</p>').replace('family=Lexend', 'family=Lexend&family=Manrope');
  assert.ok(rules(auditHtml(html)).includes('multiple-fonts'));
});

test('directory audit reports inconsistent primaries and exit code 3', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'));
  fs.writeFileSync(path.join(dir, 'a.html'), page('<p>Xin chào</p>', '#c5a581'));
  fs.writeFileSync(path.join(dir, 'b.html'), page('<p>Xin chào</p>', '#ec5b13'));
  const { exitCode, report } = auditDirectory(dir);
  assert.equal(exitCode, 3);
  assert.deepEqual(report.project.primaries, ['#c5a581', '#ec5b13']);
  assert.equal(report.project.findings[0].rule, 'inconsistent-primary');
  assert.deepEqual(report.screens.map((s) => s.file), ['a.html', 'b.html']);
});

test('clean directory exits 0', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'));
  fs.writeFileSync(path.join(dir, 'a.html'), page('<button class="bg-primary h-14">Lưu</button>', '#7a5a36'));
  assert.equal(auditDirectory(dir).exitCode, 0);
});

test('missing or empty directory exits 1', () => {
  assert.equal(auditDirectory(path.join(os.tmpdir(), 'does-not-exist-audit')).exitCode, 1);
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'audit-'));
  const res = auditDirectory(empty);
  assert.equal(res.exitCode, 1);
  assert.match(res.error, /no \.html/);
});

test('white text on child element of primary button is flagged', () => {
  const r = auditHtml(page('<button class="bg-primary"><span class="text-white">Lưu</span></button>'));
  assert.equal(find(r, 'white-on-primary').count, 1);
});

test('single-quoted class attributes are scanned for small text and contrast', () => {
  const rSmall = auditHtml(page("<p class='text-xs'>Nhỏ</p>"));
  assert.equal(find(rSmall, 'small-text').count, 1);
  const rContrast = auditHtml(page("<button class='bg-primary text-white'>Lưu</button>"));
  assert.equal(find(rContrast, 'white-on-primary').count, 1);
});

test('empty accessible name on icon-only button is flagged as unlabeled', () => {
  const r = auditHtml(page(
    '<button aria-label=""><span class="material-symbols-outlined">close</span></button>' +
    '<button aria-label="   "><span class="material-symbols-outlined">close</span></button>' +
    '<button title=""><svg viewBox="0 0 1 1"></svg></button>'
  ));
  assert.equal(find(r, 'unlabeled-icon-button').count, 3);
});

test('aria-labelledby names icon buttons only when the referenced text exists', () => {
  const result = auditHtml(page(
    '<button aria-labelledby="missing"><svg></svg></button>' +
    '<span id="empty">   </span><button aria-labelledby="empty"><svg></svg></button>' +
    '<span id="close-label">Đóng</span><button aria-labelledby="close-label"><svg></svg></button>'
  ));
  assert.equal(find(result, 'unlabeled-icon-button').count, 2);
});
test('white text follows nested ancestry and nearest explicit background', () => {
  const nestedSameTag = auditHtml(page(
    '<div class="bg-primary"><div><div>nested</div><span class="text-white">Lưu</span></div></div>'
  ));
  assert.equal(find(nestedSameTag, 'white-on-primary').count, 1);

  const overridden = auditHtml(page(
    '<div class="bg-primary"><div class="bg-slate-900"><span class="text-white">Lưu</span></div></div>'
  ));
  assert.equal(find(overridden, 'white-on-primary'), undefined);

  const siblingOverride = auditHtml(page(
    '<div class="bg-primary"><div class="bg-slate-900"><span class="text-white">Tối</span></div>' +
    '<span class="text-white">Lưu</span></div>'
  ));
  assert.equal(find(siblingOverride, 'white-on-primary').count, 1);
});
test('inherited white text on a primary button is flagged unless locally overridden', () => {
  const inherited = auditHtml(page(
    '<div class="text-white"><button class="bg-primary">Lưu</button></div>'
  ));
  assert.equal(find(inherited, 'white-on-primary').count, 1);

  const overridden = auditHtml(page(
    '<div class="text-white"><button class="bg-primary text-slate-900">Lưu</button></div>'
  ));
  assert.equal(find(overridden, 'white-on-primary'), undefined);
});

test('text override inside an otherwise empty primary button does not fabricate white contrast', () => {
  const result = auditHtml(page(
    '<div class="text-white"><button class="bg-primary"><span class="text-slate-900">Lưu</span></button></div>'
  ));
  assert.equal(find(result, 'white-on-primary'), undefined);
});

test('background sizing utilities do not override primary background color', () => {
  const result = auditHtml(page(
    '<button class="bg-cover bg-primary text-white">Lưu</button>'
  ));
  assert.equal(find(result, 'white-on-primary').count, 1);
});
test('transparent backgrounds inherit while theme background colors override', () => {
  const transparent = auditHtml(page(
    '<div class="bg-primary"><span class="bg-transparent text-white">Lưu</span></div>'
  ));
  assert.equal(find(transparent, 'white-on-primary').count, 1);

  const themeBackground = auditHtml(page(
    '<div class="bg-primary"><span class="bg-background-light text-white">Sáng</span></div>'
  ));
  assert.equal(find(themeBackground, 'white-on-primary'), undefined);
});

test('script and style end tags with whitespace or attributes are stripped from text', () => {
  const result = auditHtml(page(
    '<script type="text/javascript">var secret = "ignore";</script >' +
    '<style media="screen">body { color: red; }</style >' +
    '<button aria-label="Đóng"><svg></svg></button>'
  ));
  assert.equal(find(result, 'unlabeled-icon-button'), undefined);
});
