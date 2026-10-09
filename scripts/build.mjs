import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { products, legacyRoutes } from '../src/products.mjs';
import { competitions } from '../src/competitions.mjs';
import { entries, mainNavigation, pageHierarchy, compatibilityPages, playLabel } from '../src/navigation.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const dist = path.join(root, 'dist');
const read = name => fs.readFile(path.join(root, 'src', name), 'utf8');
const write = async (name, text) => {
  const destination = path.join(dist, name);
  await fs.mkdir(path.dirname(destination), { recursive: true });
  await fs.writeFile(destination, text, 'utf8');
};
const escape = text => String(text).replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const context = { window: {} };
vm.runInNewContext(await read('shared/content.js'), context);
const content = context.window.WUJIA_CONTENT;
for (const video of Object.values(content.videos)) {
  for (const field of ['src', 'poster']) video[field] = '/' + video[field].replace(/^\//, '');
}
content.videos.toujing.duration = '01:42';
content.videos.toujing.caption = '历史投资与交易行为复盘';

const icons = {
  arrow: '<path d="M6 18 18 6M6 6h12v12"/>',
  chevron: '<path d="m7 10 5 5 5-5"/>',
  play: '<path d="M7 4 20 12 7 20Z"/>'
};
function icon(name) {
  return `<svg class="icon icon-${name}" viewBox="0 0 24 24" width="24" height="24" ${name === 'play' ? 'fill="currentColor"' : 'fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"'} aria-hidden="true" focusable="false">${icons[name]}</svg>`;
}
function entryLink(key, className = 'text-link', withArrow = true) {
  const { label, href } = entries[key];
  return `<a class="${className}" href="${href}">${label}${withArrow ? ` <span>${icon('arrow')}</span>` : ''}</a>`;
}
function navEntry(key, page, className) {
  const { label, href } = entries[key];
  if (page.route === href) return `<span class="${className}" aria-current="page">${label}</span>`;
  return `<a class="${className}${page.active === key ? ' is-ancestor' : ''}" href="${href}">${label}</a>`;
}
const brand = `<a class="brand" href="/" aria-label="武汉悟佳教育咨询有限公司 首页"><img class="brand-logo" src="/assets/wuxuexi-mark-transparent.png" width="52" height="40" alt=""><span>武汉悟佳教育咨询有限公司</span></a>`;
function header(page) {
  const navigation = mainNavigation.map(key => {
    const link = navEntry(key, page, 'nav-link');
    if (key === 'products' || key === 'competitions') {
      const label = key === 'products' ? '展开产品快捷入口' : '展开竞赛快捷入口';
      return `<div class="nav-product-group">${link}<button class="nav-dropdown" type="button" data-menu="${key}" aria-label="${label}" aria-expanded="false" aria-controls="menu-${key}">${icon('chevron')}</button></div>`;
    }
    return link;
  }).join('');
  const films = page.route === entries.films.href ? navEntry('films', page, 'header-link') : entryLink('films', 'header-link');
  const shortcuts = [['wuxuexi', '学校版与教培机构版'], ['hubu', '模型资源与工程工具'], ['kcode', '同一产品，面向商业应用'], ['toujing', '历史投资复盘 · 测试验证中']].map(([key, description]) => `<a href="${entries[key].href}">${entries[key].label} <span>${description}</span></a>`).join('');
  const competitionShortcuts = competitions.map(c => {
    const inner = `${escape(c.title)}<span>AI 辅助编程 · ${escape(c.period)}</span>`;
    return page.route === c.href ? `<span class="competition-shortcut menu-current" aria-current="page">${inner}</span>` : `<a class="competition-shortcut" href="${c.href}">${inner}</a>`;
  }).join('');
  const menu = (key, eyebrow, heading, items) => `<div class="mega-menu" id="menu-${key}" hidden><div class="mega-inner"><div><span class="eyebrow">${eyebrow}</span><h2>${heading}</h2></div><div class="menu-links">${items}</div></div></div>`;
  return `<header class="site-header"><div class="header-inner">${brand}<nav class="main-nav" aria-label="主导航">${navigation}</nav>${films}</div>
  ${menu('products', 'PRODUCTS & PROJECTS', '真实的问题，<br>正在发生的实践。', shortcuts)}${menu('competitions', 'COMPETITIONS', '竞赛信息与<br>参赛指引', competitionShortcuts)}<div class="reading-progress" aria-hidden="true"></div></header><div class="menu-shade" hidden></div>`;
}
function links(html) {
  // Content writes explicit page URLs; tokens only share the visible entry label.
  return html.replace(/(src|poster)="assets\//g, '$1="/assets/').replace(/\{\{label:([\w-]+)\}\}/g, (_, key) => escape(entries[key].label));
}
function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="面包屑"><ol><li><a href="/">首页</a></li>${items.map(([label, href]) => `<li>${href ? `<a href="${href}">${label}</a>` : `<span aria-current="page">${label}</span>`}</li>`).join('')}</ol></nav>`;
}
async function section(id, route, openingLabel) {
  let html = links(await read(`sections/${id}.html`), route);
  if (openingLabel) {
    html = html.replace('class="', 'class="page-opening ').replace(/<h2(\s[^>]*)?>/, '<h1$1>').replace('</h2>', '</h1>');
    html = html.replace(/(<p class="eyebrow">)[^<]+/, `$1${openingLabel}`);
    const key = Object.keys(pageHierarchy).find(key => entries[key].href === route);
    const hierarchy = pageHierarchy[key];
    if (!hierarchy) throw new Error(`Missing page hierarchy: ${route}`);
    const crumb = breadcrumbs(hierarchy.map((key, index) => [entries[key].label, index < hierarchy.length - 1 ? entries[key].href : undefined]));
    html = html.includes('<div class="wrap">') ? html.replace('<div class="wrap">', `<div class="wrap">${crumb}`) : html.replace(/(<section[^>]+>)/, `$1${crumb}`);
  }
  // Section labels remain meaningful when they no longer appear on one numbered page.
  return html.replace(/0[1-8] \/ (OUR APPROACH|AI, PUT TO WORK|CO-CREATE|FROM IDEA TO OUTCOME|VALUE THAT COMPOUNDS|A LONGER VIEW|WATCH & EXPLORE)/g, '$1');
}
function productCards() {
  return `<div class="product-overviews">${products.map(p => {
    const video = content.videos[p.defaultVideo];
    return `<article class="product overview-card"><div class="overview-image"><img src="${video.poster}" width="1440" height="810" loading="lazy" alt="${video.title}产品界面"></div><div class="overview-copy"><p class="product-kicker">${p.kicker}</p><h2>${p.title}</h2><p class="overview-tagline">${p.tagline}</p><p class="overview-summary">${p.summary}</p><div class="edition-tags">${p.editions ? p.editions.map(([, label]) => `<span>${label}</span>`).join('') : '<span>测试验证中</span>'}</div>${entryLink(p.id)}</div></article>`;
  }).join('')}</div>`;
}
function productBackground(inner, extra = '') {
  return `<section class="products-section section ${extra}"><div class="products-backdrop" aria-hidden="true"><div class="products-backdrop-image"></div></div><div class="wrap">${inner}</div></section>`;
}
async function productDetail(p) {
  const video = content.videos[p.defaultVideo];
  const group = p.group || p.id;
  const tabs = p.editions ? `<div class="edition-tabs" data-edition-group="${group}" role="tablist" aria-label="${p.title}产品版本">${p.editions.map(([key, label], i) => `<button type="button" role="tab" id="edition-${key}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''} aria-controls="${group}-panel" data-edition="${key}">${label}</button>`).join('')}</div>` : '';
  const media = `<button class="media-button" id="${group}-play" data-video="${p.defaultVideo}" aria-label="播放 ${video.title}宣传片"><img id="${group}-poster" src="${video.poster}" alt="${video.title}产品演示" width="1440" height="810" fetchpriority="high"><span class="media-play">${icon('play')} ${playLabel}</span></button>`;
  return productBackground(`${breadcrumbs([['产品与项目', '/products/'], [p.title]])}
    <article class="product product-full" id="${p.id}"><div class="product-top"><div><p class="product-kicker">${p.kicker}${p.status ? ` <span class="status-tag">${p.status}</span>` : ''}</p><h1>${p.title}</h1><p class="product-line">${p.tagline}</p></div><a class="button ink" id="${group}-visit" data-visit="${p.visit}" href="${content.links[p.visit]}" target="_blank" rel="noopener noreferrer"><span id="${group}-visit-label">${p.visitLabel || video.visitLabel}</span><span>${icon('arrow')}</span></a></div>
    ${tabs}<div class="product-body"${p.editions ? ` id="${group}-panel" role="tabpanel" aria-labelledby="edition-${p.defaultVideo}" tabindex="0"` : ''}><div class="product-media">${media}<div class="media-label"><span id="${group}-caption">${video.caption}</span><span id="${group}-duration">${video.duration}</span></div></div><div class="product-detail"><p class="product-lead" id="${group}-lead">${p.lead || video.lead}</p><p id="${group}-description">${p.intro || video.intro}</p>${await read(`products/${p.id}-features.html`)}</div></div>${await read(`products/${p.id}-footer.html`)}</article><div class="detail-exit"><a class="text-link" href="/products/">返回产品列表</a>${entryLink('films', 'text-link', false)}</div>`, 'product-detail-page');
}
async function home() {
  const hero = links(await read('sections/hero.html'));
  return `${hero}
  ${await section('approach', '/')}
  ${productBackground(`<div class="section-head"><div><p class="eyebrow">PRODUCTS & PROJECTS</p><h2>聚焦真实需求，<br>构建应用价值。</h2></div><div class="section-intro"><p>教育、开发与历史复盘。<br>在具体场景里，探索 AI 的实际价值。</p>${entryLink('products')}</div></div>${productCards()}`, 'home-products')}
  ${await section('assets', '/')}
  ${await section('contact', '/')}`;
}
function competitionCards() {
  return `<div class="competition-list">${competitions.map(c => `<article class="product competition-card"><div class="competition-summary"><p class="eyebrow">${escape(c.year)} / VIBE CODING</p><h2>${escape(c.title)}</h2><p class="competition-lead">${escape(c.summary)}</p><dl class="competition-facts"><div><dt>参赛对象</dt><dd>${escape(c.audience)}</dd></div><div><dt>参赛形式</dt><dd>${escape(c.team)}</dd></div></dl><ul class="competition-tracks" aria-label="竞赛赛道">${c.tracks.map(track => `<li>${escape(track)}</li>`).join('')}</ul></div><div class="competition-schedule"><p class="competition-period-label">大赛时间</p><p class="competition-period">${escape(c.period)}</p><dl>${c.dates.map(date => `<div><dt>${escape(date.label)}</dt><dd><time datetime="${date.datetime}">${escape(date.text)}</time></dd></div>`).join('')}</dl><a class="button ink" href="${c.href}" aria-label="查看 ${escape(c.title)}通知">查看大赛通知</a></div></article>`).join('')}</div>`;
}
async function competitionDetail(c) {
  return `<section class="section wrap competition-notice-page">${breadcrumbs([['竞赛活动', entries.competitions.href], [c.title]])}<div class="notice-layout"><aside class="notice-category" aria-label="内容分类">竞赛通知</aside><article class="competition-notice" aria-labelledby="notice-title"><header class="notice-heading"><h1 id="notice-title">${escape(c.noticeTitle)}</h1><p>主办方：${escape(c.organizer)}</p></header><div class="notice-body">${await read(c.noticeFile)}</div><div class="notice-attachments"><span>附件：</span><a href="${c.attachment.href}" download="${escape(c.attachment.label)}">${escape(c.attachment.label)}</a><small>Word 报名表</small></div><div class="notice-return"><a class="text-link" href="${entries.competitions.href}">返回竞赛列表</a></div></article></div></section>`;
}
const pages = [
  { route: '/', title: '武汉悟佳教育咨询有限公司 · 让创意和想法成为现实', description: '以教育为首个应用场景，开展 AI 产品开发、技术服务与持续运营。依托模型与工程能力，组织跨专业团队，将真实需求推进为产品和项目。', body: await home(), className: 'home-page' },
  { route: '/products/', active: 'products', title: '产品与项目 · 悟学习、Campus AI 与投镜', description: '探索悟学习、Campus AI 与投镜，了解教育、开发和历史复盘场景中的产品实践与不同版本。', body: productBackground(`${breadcrumbs([['产品与项目']])}<div class="section-head"><div><p class="eyebrow">产品与项目 / PRODUCTS & PROJECTS</p><h1>聚焦真实需求，<br>构建应用价值。</h1></div><p class="section-intro">教育、开发与历史复盘。<br>选择一个产品，了解它的功能、版本与实际应用。</p></div>${productCards()}`, 'page-opening product-list-page') },
  { route: '/studio/', active: 'studio', title: 'AI+X 共创 · 跨专业协作与 AI 工程能力', description: '以悟学习、Campus AI 与投镜的产品实践为基础，介绍模型接入、本地部署、AI 编程、业务系统开发与跨专业共创的具体分工和交付方式。', body: await section('studio', '/studio/', 'AI+X 共创 / CO-CREATE') + await section('capabilities', '/studio/') + await section('method', '/studio/') },
  { route: '/vision/', active: 'vision', title: '发展愿景 · 从校园走向更广阔的协作', description: '从悟学习、Campus AI 与投镜的现有实践出发，完善产品与用户服务，积累可复用方法和项目团队，逐步探索独立业务及跨校园、跨行业协作。', body: await section('vision', '/vision/', '发展愿景 / A LONGER VIEW') },
  { route: '/films/', active: 'films', title: '项目短片 · 看见产品的实际应用', description: '观看悟学习学校版、教培机构版、Campus AI HUBU 校园版、KCode 商业版与投镜的五支产品宣传片。', body: await section('films', '/films/', '项目短片 / WATCH & EXPLORE'), hasVideo: true }
];
pages.push({ route: entries.competitions.href, active: 'competitions', title: '竞赛活动 · KCoding 大赛与赛事通知', description: '了解悟佳竞赛活动、参赛对象、比赛安排与报名方式。查看 KCoding 大赛正式通知，下载报名表，按通知要求完成邮件报名及作品提交。', body: productBackground(`${breadcrumbs([['竞赛活动']])}<div class="section-head"><div><p class="eyebrow">竞赛活动 / COMPETITIONS</p><h1>竞赛活动</h1></div><p class="section-intro">集中发布竞赛通知、赛程安排与参赛资料，明确作品要求、评审规则和报名方式。</p></div>${competitionCards()}`, 'page-opening competition-list-page') });
for (const c of competitions) pages.push({ route: c.href, active: 'competitions', title: c.noticeTitle, description: `${c.summary}大赛时间：${c.period}。${c.dates.map(date => date.label + '：' + date.text).join('；')}。`, body: await competitionDetail(c) });
for (const p of products) pages.push({route: `/products/${p.slug}/`, active: 'products', title: `${p.title} · ${p.tagline}`, description: p.summary, body: await productDetail(p), hasVideo: true});

for (const page of pages) {
  const footer = links(await read('partials/footer.html')).replace('{{footerNavigation}}', mainNavigation.map(key => navEntry(key, page, 'footer-link')).join(''));
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#111c25"><meta name="description" content="${escape(page.description)}"><title>${escape(page.title)}${page.route === '/' ? '' : ' — 悟佳'}</title><link rel="icon" type="image/png" href="/assets/wuxuexi-mark-transparent.png"><link rel="stylesheet" href="/styles.css">${page.route === '/' ? '<script src="/legacy.js"></script>' : ''}<script src="/content.js" defer></script><script src="/app.js" defer></script></head>
<body id="top" class="${page.className || 'interior-page'}" data-page="${page.active || 'home'}"><a class="skip-link" href="#main">跳至主要内容</a>${header(page)}<main id="main">${page.body}</main>${footer}${page.hasVideo ? await read('partials/video-dialog.html') : ''}${await read('partials/back-top.html')}</body></html>\n`;
  await write(page.route.slice(1) + 'index.html', html);
}
await write('content.js', `window.WUJIA_CONTENT = ${JSON.stringify(content, null, 2)};\n`);
await write('app.js', await read('shared/app.js'));
await write('styles.css', (await read('shared/styles.css')) + '\n' + (await read('shared/multipage.css')));
await write('legacy.js', `(() => {
  const routes = ${JSON.stringify(legacyRoutes)};
  function redirect() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    const target = routes[location.hash.slice(1)];
    if (!target) return;
    const url = new URL(target, location.origin);
    const edition = new URLSearchParams(location.search).get('edition');
    if (edition && !url.search && /^\\/products\\/(campus-ai|wuxuexi)\\/$/.test(url.pathname)) url.searchParams.set('edition', edition);
    const destination = url.pathname + url.search + url.hash;
    if (destination !== location.pathname + location.search + location.hash) location.replace(destination);
  }
  redirect();
  window.addEventListener('hashchange', redirect);
})();\n`);
for (const page of compatibilityPages) {
  await write(page.route.slice(1) + 'index.html', `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><meta name="description" content="${page.title}，页面地址已更新。正在带您前往对应内容，也可以通过页面中的继续链接手动打开。"><title>${page.title} — 悟佳</title><link rel="canonical" href="${page.destination}"><link rel="stylesheet" href="/styles.css"><script src="/redirects.js" defer></script></head><body class="compatibility-page"><main class="redirect-notice"><p class="eyebrow">WUJIA</p><h1>${page.title}</h1><p>正在为您打开对应内容。</p><a id="continue-link" class="text-link" href="${page.destination}">继续浏览</a></main></body></html>\n`);
}
await write('redirects.js', `(() => {
  const pages = ${JSON.stringify(compatibilityPages)};
  const route = location.pathname.replace(/index\\.html$/, '').replace(/\\/?$/, '/');
  const page = pages.find(page => page.route === route);
  if (!page) return;
  const target = page.fragments[location.hash.slice(1)] || page.destination;
  const url = new URL(target, location.origin);
  url.search = location.search;
  const destination = url.pathname + url.search + url.hash;
  document.getElementById('continue-link').href = destination;
  location.replace(destination);
})();\n`);
console.log(`Built ${pages.length} content pages and ${compatibilityPages.length} compatibility pages from shared templates.`);
