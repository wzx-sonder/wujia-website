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
console.log(`Verified ${pages.length} pages, ${linkCount} internal links/assets, all legacy routes and five local films.`);
