import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { legacyRoutes } from '../src/products.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const files = await fs.readdir(root, { recursive: true });
const pages = files.filter(file => file.endsWith('.html'));
assert.equal(pages.length, 10, 'Ten independently accessible pages');
const documents = new Map();
const titles = new Set();
for (const file of pages) {
  const html = await fs.readFile(path.join(root, file), 'utf8');
  const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1]);
  assert.equal(new Set(ids).size, ids.length, `${file}: duplicate id`);
  assert.equal((html.match(/<h1(?:\s|>)/g) || []).length, 1, `${file}: one main heading`);
  const title = html.match(/<title>(.*?)<\/title>/)?.[1];
  assert(title && !titles.has(title), `${file}: unique title`);
  titles.add(title);
  assert(html.match(/<meta name="description" content="[^"]{25,}"/), `${file}: page description`);
  for (const match of html.matchAll(/\baria-(?:controls|labelledby)="([^"]+)"/g)) {
    for (const id of match[1].split(' ')) assert(ids.includes(id), `${file}: missing ARIA target ${id}`);
  }
  assert.equal((html.match(/data-menu=/g) || []).length, 1, `${file}: only product dropdown`);
  documents.set(file.replaceAll('\\', '/'), { html, ids });
}
let linkCount = 0;
for (const [file, { html }] of documents) {
  for (const match of html.matchAll(/\b(href|src|poster)="([^"]+)"/g)) {
    const value = match[2].replaceAll('&amp;', '&');
    if (/^(https?:|mailto:|data:)/.test(value)) continue;
    assert(value.startsWith('/') || value.startsWith('#'), `${file}: nested-unsafe URL ${value}`);
    const url = new URL(value, 'https://local.test/' + file);
    const destination = decodeURIComponent(url.pathname.slice(1)) + (url.pathname.endsWith('/') ? 'index.html' : '');
    const stat = await fs.stat(path.join(root, destination)).catch(() => null);
    assert(stat?.isFile(), `${file}: missing destination ${value}`);
    if (url.hash) assert(documents.get(destination)?.ids.includes(decodeURIComponent(url.hash.slice(1))), `${file}: broken anchor ${value}`);
    linkCount++;
  }
  // External products open separately; internal pages retain normal browser navigation.
  for (const match of html.matchAll(/<a\b[^>]*>/g)) {
    if (/href="\//.test(match[0])) assert(!/target="_blank"/.test(match[0]), `${file}: internal new-tab link`);
    if (/data-visit=/.test(match[0])) assert(/target="_blank"/.test(match[0]) && /noopener/.test(match[0]), `${file}: external product target`);
  }
}
for (const target of Object.values(legacyRoutes)) {
  const url = new URL(target, 'https://local.test');
  const destination = url.pathname.slice(1) + 'index.html';
  assert(documents.has(destination), `Legacy destination ${target}`);
  if(url.hash) assert(documents.get(destination).ids.includes(url.hash.slice(1)), `Legacy fragment ${target}`);
}
const context = {window: {}};
vm.runInNewContext(await fs.readFile(path.join(root, 'content.js'), 'utf8'), context);
const content = context.window.WUJIA_CONTENT;
assert.equal(Object.keys(content.videos).length, 5);
assert.equal(content.links.kcode, 'https://api.wuxuexi.top/');
for (const video of Object.values(content.videos)) {
  for (const field of ['poster', 'src']) assert((await fs.stat(path.join(root, video[field].slice(1)))).isFile(), `Video asset ${video[field]}`);
}
assert(!documents.get('index.html').html.includes('data-video='), 'Homepage avoids repeated videos');
assert.equal((documents.get('films/index.html').html.match(/class="film-card"/g) || []).length, 5);
const campus = documents.get('products/campus-ai/index.html').html;
const education = documents.get('products/wuxuexi/index.html').html;
assert(!campus.includes('data-edition="school"') && !education.includes('data-edition="kcode"'), 'Product edition groups remain isolated');

// Check the visitor-facing contract, not just whether destinations exist.
const text = html => html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
const navigation = [
  ['about', '认识悟佳', '从一个教育场景'], ['products', '产品与项目', '聚焦真实需求'],
  ['ai', 'AI 能力', '模型是起点'], ['studio', 'AI+X 共创', '每一种专业'],
  ['vision', '发展愿景', '从校园出发'], ['films', '项目短片', '让产品']
];
const detailEntries = [
  ['wuxuexi', '悟学习详情', '悟学习'], ['campus-ai', 'Campus AI 详情', 'Campus AI'], ['toujing', '投镜详情', '投镜']
];
const labelsByUrl = new Map([
  ...navigation.map(([key, label]) => [`/${key}/`, [label, ...(key === 'products' ? ['返回产品列表'] : [])]]),
  ...detailEntries.map(([slug, label]) => [`/products/${slug}/`, [label]]),
  ['/products/campus-ai/?edition=campus', ['Campus AI · HUBU 校园版']],
  ['/products/campus-ai/?edition=kcode', ['KCode 商业版']]
]);
for (const [file, { html }] of documents) {
  for (const link of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const allowed = labelsByUrl.get(link[1]);
    if (allowed) {
      // The menu's second span explains the version; its first text is the action.
      const label = text(link[2].replace(/<span>[\s\S]*?<\/span>/g, ''));
      assert(allowed.includes(label), `${file}: misleading entry ${label} → ${link[1]}`);
    }
  }
  assert(!html.includes('查看全部产品'), `${file}: redundant menu link`);
  assert(!html.includes('{{'), `${file}: unresolved template label`);
  const mainNav = html.match(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  const footerNav = html.match(/<nav class="footer-links"[^>]*>([\s\S]*?)<\/nav>/)[1];
  const route = '/' + file.replace(/index\.html$/, '');
  const current = route === '/' ? ['home', '首页'] : navigation.find(([key]) => route === `/${key}/`);
  if (current && current[0] !== 'films') {
    for (const nav of [mainNav, footerNav]) {
      assert(nav.includes(`aria-current="page">${current[1]}</span>`), `${file}: static current item`);
      assert(!nav.includes(`href="${route}"`), `${file}: current nav reloads itself`);
    }
  } else {
    assert(!mainNav.includes('aria-current="page"') && !footerNav.includes('aria-current="page"'), `${file}: ancestor is not exact current page`);
  }
  if (file.startsWith('products/') && file !== 'products/index.html') {
    assert(mainNav.includes('href="/products/"') && footerNav.includes('href="/products/"'), `${file}: list remains reachable`);
    assert(html.includes('返回产品列表') && html.includes('aria-label="面包屑"'), `${file}: return paths`);
    assert(html.includes('播放宣传片'), `${file}: explicit video action`);
  }
  assert(html.includes('href="/products/campus-ai/?edition=campus"') && html.includes('href="/products/campus-ai/?edition=kcode"'), `${file}: explicit edition shortcuts`);
}
for (const [key, , heading] of navigation) {
  const html = documents.get(`${key}/index.html`).html;
  assert(text(html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1]).includes(heading), `${key}: target content does not match column purpose`);
}
for (const [slug, , heading] of detailEntries) {
  const html = documents.get(`products/${slug}/index.html`).html;
  assert.equal(text(html.match(/<h1[^>]*>(.*?)<\/h1>/s)[1]), heading, `${slug}: product content`);
}
for (const file of ['index.html', 'products/index.html']) {
  const cards = [...documents.get(file).html.matchAll(/<article class="product overview-card">(.*?)<\/article>/gs)];
  assert.equal(cards.length, 3);
  cards.forEach(([ , html], index) => {
    assert.equal((html.match(/<a\b/g) || []).length, 1, `${file}: one detail entry per card`);
    assert(html.includes(detailEntries[index][1]), `${file}: named detail button`);
    assert(!/<a[^>]*class="overview-image"|<h2>\s*<a/.test(html), `${file}: title/poster is static`);
  });
}
for (const file of ['index.html', 'about/index.html']) {
  const html = documents.get(file).html;
  const directions = [...html.matchAll(/<article class="contact-direction">(.*?)<\/article>/gs)];
  assert.equal(directions.length, 3);
  for (const [, direction] of directions) assert(!/<a\b|<button\b|tabindex=|role="(?:link|button)"/.test(direction), `${file}: collaboration directions must be noninteractive`);
  assert(html.includes('QQ：1304458637') && html.includes('邮箱：<a href="mailto:2519552236@qq.com"'), `${file}: contacts preserved`);
}
const homeMain = documents.get('index.html').html.match(/<main[^>]*>(.*?)<\/main>/s)[1];
assert.equal((homeMain.match(/href="\/about\/"/g) || []).length, 1, 'Homepage keeps only hero company CTA');
assert(documents.get('films/index.html').html.includes('<span class="header-link" aria-current="page">项目短片</span>'));
assert.equal((documents.get('films/index.html').html.match(/class="film-action">播放宣传片/g) || []).length, 5);
for (const file of await fs.readdir(path.join(root, '../src/sections'))) {
  const html = await fs.readFile(path.join(root, '../src/sections', file), 'utf8');
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(!(id in legacyRoutes), `${file}: obsolete fragment in current content`);
}
console.log(`Verified ${pages.length} pages, ${linkCount} internal links/assets, semantic navigation, single-entry cards, current-page states, all legacy routes and five local films.`);
