(() => {
  const routes = {"approach":"/about/","company":"/about/","assets":"/about/#assets","contact":"/about/#contact","products":"/products/","wuxuexi":"/products/wuxuexi/","campus":"/products/campus-ai/","kcode":"/products/campus-ai/?edition=kcode","toujing":"/products/toujing/","capabilities":"/ai/","workflow":"/ai/#workflow","studio":"/studio/","scenarios":"/studio/#scenarios","method":"/studio/#method","collaboration":"/studio/#collaboration","vision":"/vision/","possibility":"/vision/#possibility","films":"/films/"};
  function redirect() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    const target = routes[location.hash.slice(1)];
    if (!target) return;
    const url = new URL(target, location.origin);
    const edition = new URLSearchParams(location.search).get('edition');
    if (edition && !url.search && /^\/products\/(campus-ai|wuxuexi)\/$/.test(url.pathname)) url.searchParams.set('edition', edition);
    location.replace(url.pathname + url.search + url.hash);
  }
  redirect();
  window.addEventListener('hashchange', redirect);
})();
