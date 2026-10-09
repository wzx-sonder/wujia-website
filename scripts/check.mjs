import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { createHash } from 'node:crypto';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { legacyRoutes } from '../src/products.mjs';
import { competitions } from '../src/competitions.mjs';
import { entries, mainNavigation, compatibilityPages } from '../src/navigation.mjs';

const root = fileURLToPath(new URL('../dist/', import.meta.url));
const files = await fs.readdir(root, { recursive: true });
const pages = files.filter(file => file.endsWith('.html'));
assert.equal(pages.length, 9 + competitions.length + compatibilityPages.length, 'Content pages, competition notices and compatibility pages');
const compatibilityFiles = new Set(compatibilityPages.map(page => page.route.slice(1) + 'index.html'));
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
  const compatibility = compatibilityFiles.has(file.replaceAll('\\', '/'));
  assert.equal((html.match(/data-menu=/g) || []).length, compatibility ? 0 : 2, `${file}: product and competition dropdowns`);
  assert(!html.includes('menu-studio'), `${file}: no studio dropdown`);
  if (compatibility) assert(html.includes('id="continue-link"') && /src="\/redirects\.[a-f0-9]{16}\.js"/.test(html) && !html.includes('site-header'), `${file}: lightweight compatibility page`);
  // Rendering depends on a matched document + asset version, even with an old cache.
  const resources = [...html.matchAll(/(?:href|src)="\/((?:styles|app|content|legacy|redirects)[^"/]*\.(?:css|js))"/g)];
  assert.equal(resources.length, compatibility ? 2 : file === 'index.html' ? 4 : 3, `${file}: shared assets`);
  for (const [, name] of resources) {
    const match = /^(styles|app|content|legacy|redirects)\.([a-f0-9]{16})\.(css|js)$/.exec(name);
    assert(match, `${file}: asset URL must have a content hash: ${name}`);
    const contents = await fs.readFile(path.join(root, name));
    assert.equal(createHash('sha256').update(contents).digest('hex').slice(0, 16), match[2], `${file}: stale asset fingerprint`);
    assert.deepEqual(contents, await fs.readFile(path.join(root, `${match[1]}.${match[3]}`)), `${file}: asset and alias differ`);
  }
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
  ['products', '产品与项目', '聚焦真实需求'],
  ['studio', 'AI+X 共创', 'AI 应用研发与'],
  ['competitions', '竞赛活动', '竞赛活动'],
  ['vision', '发展愿景', '从校园出发'], ['films', '项目短片', '让产品']
];
const detailEntries = [
  ['wuxuexi', '悟学习详情', '悟学习'], ['campus-ai', 'Campus AI 详情', 'Campus AI'], ['toujing', '投镜详情', '投镜']
];
const labelsByUrl = new Map([
  ...navigation.map(([key, label]) => [`/${key}/`, [label, ...(key === 'products' ? ['返回产品列表'] : key === 'competitions' ? ['返回竞赛列表'] : [])]]),
  ...competitions.map(c => [c.href, [c.title, '查看大赛通知']]),
  ...detailEntries.map(([slug, label]) => [`/products/${slug}/`, [label]]),
  ['/products/campus-ai/?edition=campus', ['Campus AI · HUBU 校园版']],
  ['/products/campus-ai/?edition=kcode', ['KCode 商业版']]
]);
for (const [file, { html }] of documents) {
  if (compatibilityFiles.has(file)) continue;
  assert(!/href="\/(?:about|ai|studio\/ai)\//.test(html), `${file}: content must use canonical destinations`);
  for (const link of html.matchAll(/<a\b[^>]*href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
    const allowed = labelsByUrl.get(link[1]);
    if (allowed) {
      // The menu's second span explains the version; its first text is the action.
      const label = text(link[2].replace(/<(span|small)>[\s\S]*?<\/\1>/g, ''));
      assert(allowed.includes(label), `${file}: misleading entry ${label} → ${link[1]}`);
    }
  }
  assert(!html.includes('查看全部产品'), `${file}: redundant menu link`);
  assert(!html.includes('{{'), `${file}: unresolved template label`);
  const mainNav = html.match(/<nav class="main-nav"[^>]*>([\s\S]*?)<\/nav>/)[1];
  const footerNav = html.match(/<nav class="footer-links"[^>]*>([\s\S]*?)<\/nav>/)[1];
  for (const [nav, className] of [[mainNav, 'nav-link'], [footerNav, 'footer-link']]) {
    const labels = [...nav.matchAll(new RegExp(`<(?:a|span) class="${className}[^\"]*"[^>]*>(.*?)</(?:a|span)>`, 'gs'))].map(match => text(match[1]));
    assert.deepEqual(labels, mainNavigation.map(key => entries[key].label), `${file}: five canonical columns`);
  }
  const route = '/' + file.replace(/index\.html$/, '');
  const current = route === '/' ? ['home', '首页'] : navigation.find(([key]) => mainNavigation.includes(key) && route === `/${key}/`);
  if (current && current[0] !== 'films') {
    for (const nav of [mainNav, footerNav]) {
      assert(nav.includes(`aria-current="page">${current[1]}</span>`), `${file}: static current item`);
      assert(!nav.includes(`href="${route}"`), `${file}: current nav reloads itself`);
    }
  } else {
    assert(!/<span class="nav-link" aria-current="page"/.test(mainNav) && !footerNav.includes('aria-current="page"'), `${file}: ancestor is not exact current page`);
  }
  if (file.startsWith('products/') && file !== 'products/index.html') {
    assert(mainNav.includes('href="/products/"') && footerNav.includes('href="/products/"'), `${file}: list remains reachable`);
    assert(html.includes('返回产品列表') && html.includes('aria-label="面包屑"'), `${file}: return paths`);
    assert(html.includes('播放宣传片'), `${file}: explicit video action`);
  }
  if (file.startsWith('competitions/') && file !== 'competitions/index.html') {
    for (const nav of [mainNav, footerNav]) assert(nav.includes('is-ancestor" href="/competitions/"'), `${file}: competition parent remains reachable`);
    assert(html.includes('返回竞赛列表') && html.includes('aria-label="面包屑"'), `${file}: notice return paths`);
  }
  const competitionMenu = html.match(/<div class="mega-menu" id="menu-competitions" hidden><div class="mega-inner"><div>[\s\S]*?<\/div><div class="menu-links">(.*?)<\/div>/s)?.[1];
  assert(competitionMenu, `${file}: competition shortcuts use the shared full-width panel`);
  assert(!mainNav.includes('id="menu-competitions"'), `${file}: competition panel is outside the nav item`);
  for (const competition of competitions) {
    assert(competitionMenu.includes(competition.title), `${file}: competition shortcut title`);
    assert(competitionMenu.includes(route === competition.href ? 'aria-current="page"' : `href="${competition.href}"`), `${file}: competition shortcut destination`);
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
for (const file of ['index.html']) {
  const html = documents.get(file).html;
  const directions = [...html.matchAll(/<article class="contact-direction">(.*?)<\/article>/gs)];
  assert.equal(directions.length, 3);
  for (const [, direction] of directions) assert(!/<a\b|<button\b|tabindex=|role="(?:link|button)"/.test(direction), `${file}: collaboration directions must be noninteractive`);
  assert(html.includes('QQ：1304458637') && html.includes('邮箱：<a href="mailto:2519552236@qq.com"'), `${file}: contacts preserved`);
}
const homeMain = documents.get('index.html').html.match(/<main[^>]*>(.*?)<\/main>/s)[1];
assert.equal((homeMain.match(/href="#approach"/g) || []).length, 1, 'Hero company action scrolls to introduction');
assert(!homeMain.includes('向下探索') && !homeMain.includes('让校园创造力'), 'Removed obsolete hero copy and exploration link');
assert(!homeMain.includes('home-capabilities') && !homeMain.includes('home-about'), 'No duplicate homepage summaries');
assert.deepEqual([...homeMain.matchAll(/<section\b[^>]*class="([^"]*)"[^>]*>/g)].map(match => match[1]), ['hero', 'section wrap', 'products-section section home-products', 'assets-section section', 'contact-section section wrap']);
assert.equal((homeMain.match(/id="contact"/g) || []).length, 1);
assert(homeMain.includes('Campus AI 详情') && homeMain.includes('P') && homeMain.includes('id="assets"'));
const studio = documents.get('studio/index.html').html;
assert(!studio.includes('studio-ai-summary'), 'No duplicate AI summary');
assert.deepEqual([...studio.matchAll(/<section[^>]*id="([^"]+)"/g)].map(match => match[1]), ['studio', 'capabilities', 'method'], 'AI content follows studio introduction and precedes project method');
assert.equal((studio.match(/id="workflow"/g) || []).length, 1, 'Complete AI workflow appears once');
for (const page of compatibilityPages) for (const target of [page.destination, ...Object.values(page.fragments)]) {
  const url = new URL(target, 'https://local.test');
  const document = documents.get(url.pathname.slice(1) + 'index.html');
  assert(document && (!url.hash || document.ids.includes(url.hash.slice(1))), `Compatibility target ${target}`);
}
assert(['approach', 'assets', 'contact'].every(id => !(id in legacyRoutes)), 'Real homepage anchors never redirect');
assert(documents.get('films/index.html').html.includes('<span class="header-link" aria-current="page">项目短片</span>'));
assert.equal((documents.get('films/index.html').html.match(/class="film-action">播放宣传片/g) || []).length, 5);
for (const file of await fs.readdir(path.join(root, '../src/sections'))) {
  const html = await fs.readFile(path.join(root, '../src/sections', file), 'utf8');
  for (const [, id] of html.matchAll(/href="#([^"]+)"/g)) assert(!(id in legacyRoutes), `${file}: obsolete fragment in current content`);
}
const competitionList = documents.get('competitions/index.html').html;
const competitionCards = [...competitionList.matchAll(/<article class="product competition-card">(.*?)<\/article>/gs)];
assert.equal(competitionCards.length, competitions.length, 'One card per configured competition');
for (const [index, [, html]] of competitionCards.entries()) {
  const competition = competitions[index];
  assert.equal((html.match(/<a\b/g) || []).length, 1, 'Competition cards have one detail action');
  assert(html.includes(`href="${competition.href}"`) && html.includes('查看大赛通知'));
  assert(!/<img\b|poster=|overview-image/.test(html), 'No competition posters or image placeholders');
  for (const date of competition.dates) assert(html.includes(date.datetime) && html.includes(date.text), 'Competition deadlines retained');
  for (const track of competition.tracks) assert(html.includes(track), 'Competition tracks retained');
  const notice = documents.get(competition.href.slice(1) + 'index.html').html;
  assert.equal(text(notice.match(/<h1[^>]*>(.*?)<\/h1>/s)[1]), competition.noticeTitle);
  assert(notice.includes(`download="${competition.attachment.label}"`) && notice.includes(`href="${competition.attachment.href}"`), 'Downloadable original registration form');
  const docx = await fs.readFile(path.join(root, competition.attachment.href.slice(1)));
  assert(docx[0] === 0x50 && docx[1] === 0x4b, 'Registration attachment is a DOCX archive');
  assert(!/<img\b/.test(notice.match(/<main[^>]*>(.*?)<\/main>/s)[1]), 'Text-only competition notice');
  assert(!/浏览次数|下载次数|已下载\d|工作表\.xlsx/.test(notice), 'No invented counters or internal workbook');
}
const kcoding = documents.get('competitions/kcoding-2026/index.html').html;
for (const section of ['eligibility', 'schedule', 'tracks', 'requirements', 'submission', 'judging', 'awards', 'registration']) assert(kcoding.includes(`id="${section}"`), 'All eight original notice sections');
assert(kcoding.includes('888元等值KCode额度＋一年ProMax会员') && kcoding.includes('报名成功以邮件回复确认为准'), 'Award and registration conditions retained');
for (const [award, reward] of [
  ['一等奖', 'ProMax会员1个月（129元）'],
  ['二等奖', 'Pro会员1个月（99元）'],
  ['三等奖', 'Plus会员1个月（29元）']
]) assert(kcoding.includes(`<tr><th scope="row">${award}</th><td>每赛道1名，共4名</td><td>${reward}</td></tr>`), `${award}: current membership tier and price`);
assert(!/超值会员|49元会员|一年Pro会员/.test(kcoding), 'No superseded membership names');
assert(kcoding.includes('mailto:2519552236@qq.com'), 'Email registration contact');
const competitionAssets = files.filter(file => file.replaceAll('\\', '/').startsWith('assets/competitions/'));
assert(competitionAssets.filter(file => /\.(xlsx|png|jpe?g|pdf)$/i.test(file)).length === 0, 'Only approved registration attachment is shipped');
console.log(`Verified ${pages.length - compatibilityPages.length} content pages and ${compatibilityPages.length} compatibility pages, ${linkCount} internal links/assets, five-column navigation, competition notices and attachments, all legacy routes and five local films.`);
