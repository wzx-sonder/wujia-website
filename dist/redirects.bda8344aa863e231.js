(() => {
  const pages = [{"route":"/about/","title":"认识悟佳已并入首页","destination":"/#approach","fragments":{"approach":"/#approach","company":"/#approach","assets":"/#assets","contact":"/#contact"}},{"route":"/ai/","title":"AI 能力已融入共创页面","destination":"/studio/#capabilities","fragments":{"capabilities":"/studio/#capabilities","workflow":"/studio/#workflow"}},{"route":"/studio/ai/","title":"在共创页面继续了解 AI 能力","destination":"/studio/#capabilities","fragments":{"capabilities":"/studio/#capabilities","workflow":"/studio/#workflow"}}];
  const route = location.pathname.replace(/index\.html$/, '').replace(/\/?$/, '/');
  const page = pages.find(page => page.route === route);
  if (!page) return;
  const target = page.fragments[location.hash.slice(1)] || page.destination;
  const url = new URL(target, location.origin);
  url.search = location.search;
  const destination = url.pathname + url.search + url.hash;
  document.getElementById('continue-link').href = destination;
  location.replace(destination);
})();
