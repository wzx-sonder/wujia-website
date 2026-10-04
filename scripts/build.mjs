import fs from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { products, legacyRoutes } from '../src/products.mjs';

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
const navItems = [['about', '认识悟佳'], ['products', '产品与项目'], ['ai', 'AI 能力'], ['studio', 'AI+X 共创'], ['vision', '发展愿景']];
const brand = `<a class="brand" href="/" aria-label="武汉悟佳教育咨询有限公司 首页"><img class="brand-logo" src="/assets/wuxuexi-mark-transparent.png" width="52" height="40" alt=""><span>武汉悟佳教育咨询有限公司</span></a>`;
function header(active) {
  const navigation = navItems.map(([key, label]) => {
    const link = `<a href="/${key}/"${key === active ? ' aria-current="page"' : ''}>${label}</a>`;
    return key === 'products' ? `<div class="nav-product-group">${link}<button class="nav-dropdown" type="button" data-menu="products" aria-label="展开产品快捷入口" aria-expanded="false" aria-controls="menu-products">${icon('chevron')}</button></div>` : link;
  }).join('');
  return `<header class="site-header"><div class="header-inner">${brand}<nav class="main-nav" aria-label="主导航">${navigation}</nav><a class="header-link" href="/films/"${active === 'films' ? ' aria-current="page"' : ''}>观看短片 <span>${icon('arrow')}</span></a></div>
  <div class="mega-menu" id="menu-products" hidden><div class="mega-inner"><div><span class="eyebrow">PRODUCTS & PROJECTS</span><h2>真实的问题，<br>正在发生的实践。</h2><a class="text-link menu-all" href="/products/">查看全部产品</a></div><div class="menu-links"><a href="/products/wuxuexi/">悟学习 <span>教学协同与学习支持</span></a><a href="/products/campus-ai/">Campus AI · 校园版 <span>HUBU · 模型资源与工程工具</span></a><a href="/products/campus-ai/?edition=kcode">KCode · 商业版 <span>同一产品，面向商业应用</span></a><a href="/products/toujing/">投镜 <span>历史投资复盘 · 测试验证中</span></a></div></div></div><div class="reading-progress" aria-hidden="true"></div></header><div class="menu-shade" hidden></div>`;
}
function links(html, route) {
  return html.replace(/(src|poster)="assets\//g, '$1="/assets/').replace(/href="#([^"]+)"/g, (match, id) => {
    const target = legacyRoutes[id];
    if (!target) return match;
    const [pathname, hash] = target.split('#');
    return `href="${pathname === route && hash ? '#' + hash : target}"`;
  });
}
function breadcrumbs(items) {
  return `<nav class="breadcrumbs" aria-label="面包屑"><ol><li><a href="/">首页</a></li>${items.map(([label, href]) => `<li>${href ? `<a href="${href}">${label}</a>` : `<span aria-current="page">${label}</span>`}</li>`).join('')}</ol></nav>`;
}
async function section(id, route, openingLabel) {
  let html = links(await read(`sections/${id}.html`), route);
  if (openingLabel) {
    html = html.replace('class="', 'class="page-opening ').replace(/<h2(\s[^>]*)?>/, '<h1$1>').replace('</h2>', '</h1>');
    html = html.replace(/(<p class="eyebrow">)[^<]+/, `$1${openingLabel}`);
    const crumb = breadcrumbs([[navItems.find(([key]) => route === `/${key}/`)?.[1] || '项目短片']]);
    html = html.includes('<div class="wrap">') ? html.replace('<div class="wrap">', `<div class="wrap">${crumb}`) : html.replace(/(<section[^>]+>)/, `$1${crumb}`);
  }
  // Section labels remain meaningful when they no longer appear on one numbered page.
  return html.replace(/0[1-8] \/ (OUR APPROACH|AI, PUT TO WORK|CO-CREATE|FROM IDEA TO OUTCOME|VALUE THAT COMPOUNDS|A LONGER VIEW|WATCH & EXPLORE)/g, '$1');
}
function productCards() {
  return `<div class="product-overviews">${products.map(p => {
    const video = content.videos[p.defaultVideo];
    const href = `/products/${p.slug}/`;
    return `<article class="product overview-card"><a class="overview-image" href="${href}" aria-label="了解${p.title}"><img src="${video.poster}" width="1440" height="810" loading="lazy" alt="${video.title}产品界面"></a><div class="overview-copy"><p class="product-kicker">${p.kicker}</p><h2><a href="${href}">${p.title}</a></h2><p class="overview-tagline">${p.tagline}</p><p class="overview-summary">${p.summary}</p><div class="edition-tags">${p.editions ? p.editions.map(([, label]) => `<span>${label}</span>`).join('') : '<span>测试验证中</span>'}</div><a class="text-link" href="${href}">了解详情 <span>${icon('arrow')}</span></a></div></article>`;
  }).join('')}</div>`;
}
function productBackground(inner, extra = '') {
  return `<section class="products-section section ${extra}"><div class="products-backdrop" aria-hidden="true"><div class="products-backdrop-image"></div></div><div class="wrap">${inner}</div></section>`;
}
async function productDetail(p) {
  const video = content.videos[p.defaultVideo];
  const group = p.group || p.id;
  const tabs = p.editions ? `<div class="edition-tabs" data-edition-group="${group}" role="tablist" aria-label="${p.title}产品版本">${p.editions.map(([key, label], i) => `<button type="button" role="tab" id="edition-${key}" aria-selected="${i === 0}"${i ? ' tabindex="-1"' : ''} aria-controls="${group}-panel" data-edition="${key}">${label}</button>`).join('')}</div>` : '';
  const media = `<button class="media-button" id="${group}-play" data-video="${p.defaultVideo}" aria-label="播放 ${video.title}宣传片"><img id="${group}-poster" src="${video.poster}" alt="${video.title}产品演示" width="1440" height="810" fetchpriority="high"><span class="media-play">${icon('play')} 观看产品短片</span></button>`;
  return productBackground(`${breadcrumbs([['产品与项目', '/products/'], [p.title]])}
    <article class="product product-full" id="${p.id}"><div class="product-top"><div><p class="product-kicker">${p.kicker}${p.status ? ` <span class="status-tag">${p.status}</span>` : ''}</p><h1>${p.title}</h1><p class="product-line">${p.tagline}</p></div><a class="button ink" id="${group}-visit" data-visit="${p.visit}" href="${content.links[p.visit]}" target="_blank" rel="noopener noreferrer"><span id="${group}-visit-label">${p.visitLabel || video.visitLabel}</span><span>${icon('arrow')}</span></a></div>
    ${tabs}<div class="product-body"${p.editions ? ` id="${group}-panel" role="tabpanel" aria-labelledby="edition-${p.defaultVideo}" tabindex="0"` : ''}><div class="product-media">${media}<div class="media-label"><span id="${group}-caption">${video.caption}</span><span id="${group}-duration">${video.duration}</span></div></div><div class="product-detail"><p class="product-lead" id="${group}-lead">${p.lead || video.lead}</p><p id="${group}-description">${p.intro || video.intro}</p>${await read(`products/${p.id}-features.html`)}</div></div>${await read(`products/${p.id}-footer.html`)}</article><div class="detail-exit"><a class="text-link" href="/products/">返回产品列表</a><a class="text-link" href="/films/">观看全部项目短片</a></div>`, 'product-detail-page');
}
async function home() {
  let hero = links(await read('sections/hero.html'), '/');
  hero = hero.replace('href="/about/">向下探索', 'href="#overview">向下探索');
  return `${hero}
  <section class="section wrap home-about" id="overview"><div class="section-head"><div><p class="eyebrow">ABOUT WUJIA</p><h2>从教育出发，<br>让创造发生。</h2></div><div class="section-intro"><p>武汉悟佳教育咨询有限公司，围绕教育产品、AI 应用与跨学科项目开展实践。</p><p>连接真实需求、工程能力和人的专业知识，让想法成为可使用、可验证的成果。</p><a class="text-link" href="/about/">认识悟佳 <span>${icon('arrow')}</span></a></div></div></section>
  ${productBackground(`<div class="section-head"><div><p class="eyebrow">PRODUCTS & PROJECTS</p><h2>聚焦真实需求，<br>构建应用价值。</h2></div><div class="section-intro"><p>教育、开发与历史复盘。<br>在具体场景里，探索 AI 的实际价值。</p><a class="text-link" href="/products/">全部产品与项目 <span>${icon('arrow')}</span></a></div></div>${productCards()}`, 'home-products')}
  <section class="section home-capabilities"><div class="wrap home-paths"><article><p class="eyebrow">AI, PUT TO WORK</p><h2>让模型能力，<br>进入实际工作。</h2><p>从模型接入到工具调用，再到工程实现。让 AI 与专业知识一起工作，把原型推进到可使用的产品。</p><a class="text-link" href="/ai/">了解 AI 能力 <span>${icon('arrow')}</span></a></article><article><p class="eyebrow">AI + YOUR EXPERTISE</p><h2>每一种专业，<br>都有创造的可能。</h2><p>以湖北大学的校园实践为起点，连接技术、设计、商业、科研和传媒等不同方向的伙伴，共同完成真实项目。</p><a class="text-link" href="/studio/">走进 AI+X 智创工场 <span>${icon('arrow')}</span></a></article></div></section>
  ${await section('contact', '/')}`;
}
const pages = [
  { route: '/', title: '武汉悟佳教育咨询有限公司 · 让校园创造力，走向真实世界', description: '以教育为起点，连接 AI 工程能力与跨学科人才。探索悟学习、Campus AI、投镜与 AI+X 智创工场。', body: await home(), className: 'home-page' },
  { route: '/about/', active: 'about', title: '认识悟佳 · 公司与业务体系', description: '了解武汉悟佳教育咨询有限公司的教育产品、AI 应用与跨学科实践，以及产品、工作流和团队经验的长期积累。', body: await section('approach', '/about/', '认识悟佳 / ABOUT WUJIA') + await section('assets', '/about/') + await section('contact', '/about/') },
  { route: '/products/', active: 'products', title: '产品与项目 · 悟学习、Campus AI 与投镜', description: '探索悟学习、Campus AI 与投镜，了解教育、开发和历史复盘场景中的产品实践与不同版本。', body: productBackground(`${breadcrumbs([['产品与项目']])}<div class="section-head"><div><p class="eyebrow">产品与项目 / PRODUCTS & PROJECTS</p><h1>聚焦真实需求，<br>构建应用价值。</h1></div><p class="section-intro">教育、开发与历史复盘。<br>选择一个产品，了解它的功能、版本与实际应用。</p></div>${productCards()}`, 'page-opening product-list-page') },
  { route: '/ai/', active: 'ai', title: 'AI 能力 · 从模型到工程交付', description: '围绕模型与资源、Agent 与工作流、工程与交付，了解悟佳如何组织 AI 与专业工具完成实际任务。', body: await section('capabilities', '/ai/', 'AI 能力 / AI, PUT TO WORK') },
  { route: '/studio/', active: 'studio', title: 'AI+X 共创 · 智创工场与项目实践', description: '从湖北大学的校园实践出发，连接不同专业伙伴，了解 AI+X 智创工场的实践方向与项目实施方法。', body: await section('studio', '/studio/', 'AI+X 共创 / CO-CREATE') + await section('method', '/studio/') },
  { route: '/vision/', active: 'vision', title: '发展愿景 · 从校园走向更广阔的协作', description: '以产品和场景为起点，在持续交付中积累方法，逐步探索连接高校人才与真实产业需求的 AI 协作网络。', body: await section('vision', '/vision/', '发展愿景 / A LONGER VIEW') },
  { route: '/films/', active: 'films', title: '项目短片 · 看见产品的实际应用', description: '观看悟学习学校版、教培机构版、Campus AI HUBU 校园版、KCode 商业版与投镜的五支产品宣传片。', body: await section('films', '/films/', '项目短片 / WATCH & EXPLORE'), hasVideo: true }
];
for (const p of products) pages.push({route: `/products/${p.slug}/`, active: 'products', title: `${p.title} · ${p.tagline}`, description: p.summary, body: await productDetail(p), hasVideo: true});

for (const page of pages) {
  const footer = links(await read('partials/footer.html'), page.route).replace('class="brand" href="#top"', 'class="brand" href="/"');
  const html = `<!doctype html>
<html lang="zh-CN"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#111c25"><meta name="description" content="${escape(page.description)}"><title>${escape(page.title)}${page.route === '/' ? '' : ' — 悟佳'}</title><link rel="icon" type="image/png" href="/assets/wuxuexi-mark-transparent.png"><link rel="stylesheet" href="/styles.css">${page.route === '/' ? '<script src="/legacy.js"></script>' : ''}<script src="/content.js" defer></script><script src="/app.js" defer></script></head>
<body id="top" class="${page.className || 'interior-page'}" data-page="${page.active || 'home'}"><a class="skip-link" href="#main">跳至主要内容</a>${header(page.active)}<main id="main">${page.body}</main>${footer}${page.hasVideo ? await read('partials/video-dialog.html') : ''}${await read('partials/back-top.html')}</body></html>\n`;
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
    location.replace(url.pathname + url.search + url.hash);
  }
  redirect();
  window.addEventListener('hashchange', redirect);
})();\n`);
console.log(`Built ${pages.length} pages from shared templates and approved content.`);
