(() => {
  const routes = {"company":"/#approach","overview":"/#approach","products":"/products/","wuxuexi":"/products/wuxuexi/","campus":"/products/campus-ai/","kcode":"/products/campus-ai/?edition=kcode","toujing":"/products/toujing/","capabilities":"/studio/#capabilities","workflow":"/studio/#workflow","studio":"/studio/","scenarios":"/studio/#scenarios","method":"/studio/#method","collaboration":"/studio/#collaboration","vision":"/vision/","possibility":"/vision/#possibility","films":"/films/"};
  function redirect() {
    if (location.pathname !== '/' && location.pathname !== '/index.html') return;
    const target = routes[location.hash.slice(1)];
    if (!target) return;
    const url = new URL(target, location.origin);
    const edition = new URLSearchParams(location.search).get('edition');
    if (edition && !url.search && /^\/products\/(campus-ai|wuxuexi)\/$/.test(url.pathname)) url.searchParams.set('edition', edition);
    const destination = url.pathname + url.search + url.hash;
    if (destination !== location.pathname + location.search + location.hash) location.replace(destination);
  }
  redirect();
  window.addEventListener('hashchange', redirect);
})();
