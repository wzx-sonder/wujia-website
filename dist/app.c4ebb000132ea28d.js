(() => {
  'use strict';
  const content = window.WUJIA_CONTENT || {links: {}, videos: {}};
  const header = document.querySelector('.site-header');
  const menuButtons = [...document.querySelectorAll('[data-menu]')];
  const shade = document.querySelector('.menu-shade');
  let activeMenu = null;
  function closeMenu(returnFocus = false) {
    const previous = activeMenu;
    menuButtons.forEach(button => {
      button.setAttribute('aria-expanded', 'false');
      const menu = document.getElementById(button.getAttribute('aria-controls'));
      if(menu) menu.hidden = true;
    });
    activeMenu = null;
    if(shade) shade.hidden = true;
    if (returnFocus && previous) previous.focus();
  }
  menuButtons.forEach(button => button.addEventListener('click', () => {
    const wasOpen = activeMenu === button;
    closeMenu();
    if (!wasOpen) {
      activeMenu = button;
      button.setAttribute('aria-expanded', 'true');
      const menu = document.getElementById(button.getAttribute('aria-controls'));
      if(menu) menu.hidden = false;
      if(shade) shade.hidden = false;
    }
  }));
  shade?.addEventListener('click', () => closeMenu());
  document.addEventListener('keydown', event => { if(event.key === 'Escape' && activeMenu) closeMenu(true); });
  header?.addEventListener('focusout', () => setTimeout(() => {
    if(activeMenu && !header.contains(document.activeElement)) closeMenu();
  }, 0));
  const updateHeader = () => document.documentElement.style.setProperty('--header-height', `${header.offsetHeight}px`);
  if(header) {
    new ResizeObserver(updateHeader).observe(header);
    updateHeader();
  }
  // A restored page keeps the browser's native scroll position, but never a stale menu.
  window.addEventListener('pageshow', () => closeMenu());
  const progress = document.querySelector('.reading-progress');
  let scrollQueued = false;
  function updateProgress() {
    const length = document.documentElement.scrollHeight - window.innerHeight;
    if(progress) progress.style.transform = `scaleX(${length > 0 ? Math.min(1, window.scrollY / length) : 0})`;
    scrollQueued = false;
  }
  window.addEventListener('scroll', () => {
    if(!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateProgress); }
  }, {passive:true});
  updateProgress();
  const backToTop = document.querySelector('.floating-back-top');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let idleTimer;
  let navigationFrame = 0;
  function showScrollingState() {
    if(!backToTop) return;
    backToTop.classList.remove('is-idle');
    clearTimeout(idleTimer);
    idleTimer = setTimeout(() => backToTop.classList.add('is-idle'), 600);
  }
  window.addEventListener('scroll', showScrollingState, {passive:true});
  function cancelAnchorScroll() {
    cancelAnimationFrame(navigationFrame);
    navigationFrame = 0;
  }
  // Keep the accessibility skip link's native immediate focus behavior.
  document.querySelectorAll('a[href^="#"]:not(.skip-link)').forEach(link => link.addEventListener('click', event => {
    if(event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const hash = link.getAttribute('href');
    let target;
    try { target = document.getElementById(decodeURIComponent(hash.slice(1))); }
    catch { return; }
    if(!target) return;
    event.preventDefault();
    cancelAnchorScroll();
    closeMenu();
    const startY = window.scrollY;
    const padding = parseFloat(getComputedStyle(document.documentElement).scrollPaddingTop) || 0;
    const margin = parseFloat(getComputedStyle(target).scrollMarginTop) || 0;
    const maxY = Math.max(0, document.documentElement.scrollHeight - window.innerHeight);
    const targetY = target === document.body ? 0 : Math.max(0, Math.min(maxY, startY + target.getBoundingClientRect().top - padding - margin));
    const complete = () => {
      navigationFrame = 0;
      if(link === backToTop) history.replaceState(history.state, '', hash);
      else if(location.hash !== hash) history.pushState(history.state, '', hash);
      // Keyboard navigation should continue at the destination, not a closed menu.
      if(event.detail === 0) {
        if(!target.hasAttribute('tabindex')) {
          target.setAttribute('tabindex', '-1');
          target.addEventListener('blur', () => target.removeAttribute('tabindex'), {once:true});
        }
        target.focus({preventScroll:true});
      }
    };
    if(reducedMotion.matches || Math.abs(startY - targetY) < 1) {
      window.scrollTo(0, targetY);
      complete();
      return;
    }
    showScrollingState();
    // Every section uses the same brisk timing and gentle stop as back-to-top.
    const duration = 550;
    const startTime = performance.now();
    function step(now) {
      const elapsed = Math.min(1, (now - startTime) / duration);
      window.scrollTo(0, targetY + (startY - targetY) * Math.pow(1 - elapsed, 3));
      if(elapsed < 1) navigationFrame = requestAnimationFrame(step);
      else complete();
    }
    navigationFrame = requestAnimationFrame(step);
  }));
  // A new gesture, destination, or history navigation can interrupt scrolling.
  window.addEventListener('wheel', cancelAnchorScroll, {passive:true});
  window.addEventListener('touchstart', cancelAnchorScroll, {passive:true});
  window.addEventListener('hashchange', cancelAnchorScroll);
  window.addEventListener('popstate', cancelAnchorScroll);
  document.addEventListener('keydown', event => {
    if(['ArrowUp', 'ArrowDown', 'PageUp', 'PageDown', 'Home', 'End', ' ', 'Escape'].includes(event.key)) cancelAnchorScroll();
  });
  const year = document.getElementById('year');
  if(year) year.textContent = new Date().getFullYear();
  document.querySelectorAll('[data-visit]').forEach(link => {
    const url = content.links[link.dataset.visit];
    if(url) link.href = url;
  });
  // Scope version tabs to their own product; Campus editions have separate URLs.
  document.querySelectorAll('[data-edition-group]').forEach(group => {
    const product = group.dataset.editionGroup;
    const buttons = [...group.querySelectorAll('[data-edition]')];
    function chooseEdition(button, updateUrl = false) {
      const key = button.dataset.edition;
      const video = content.videos[key];
      if(!video) return;
      buttons.forEach(item => {
        const selected = item === button;
        item.setAttribute('aria-selected', String(selected));
        item.tabIndex = selected ? 0 : -1;
      });
      document.getElementById(`${product}-panel`).setAttribute('aria-labelledby', button.id);
      const image = document.getElementById(`${product}-poster`);
      image.src = video.poster;
      image.alt = video.title + '产品演示';
      const play = document.getElementById(`${product}-play`);
      play.dataset.video = key;
      play.setAttribute('aria-label', '播放 ' + video.title + '宣传片');
      document.getElementById(`${product}-caption`).textContent = video.caption;
      document.getElementById(`${product}-duration`).textContent = video.duration;
      if(video.lead) document.getElementById(`${product}-lead`).textContent = video.lead;
      if(video.intro) document.getElementById(`${product}-description`).textContent = video.intro;
      if(product === 'campus') {
        const visit = document.getElementById('campus-visit');
        visit.href = content.links[key];
        visit.dataset.visit = key;
        document.getElementById('campus-visit-label').textContent = video.visitLabel;
      }
      if(updateUrl) {
        const url = new URL(location.href);
        url.searchParams.set('edition', key);
        if(url.href !== location.href) history.pushState(history.state, '', url);
      }
    }
    const fromUrl = () => {
      const edition = new URLSearchParams(location.search).get('edition');
      chooseEdition(buttons.find(button => button.dataset.edition === edition) || buttons[0]);
    };
    buttons.forEach((button, index) => {
      button.addEventListener('click', () => chooseEdition(button, true));
      button.addEventListener('keydown', event => {
        let next;
        if(event.key === 'ArrowRight') next = (index + 1) % buttons.length;
        if(event.key === 'ArrowLeft') next = (index + buttons.length - 1) % buttons.length;
        if(event.key === 'Home') next = 0;
        if(event.key === 'End') next = buttons.length - 1;
        if(next !== undefined) { event.preventDefault(); chooseEdition(buttons[next], true); buttons[next].focus(); }
      });
    });
    fromUrl();
    window.addEventListener('popstate', fromUrl);
    window.addEventListener('pageshow', fromUrl);
  });
  const dialog = document.getElementById('video-dialog');
  const player = document.getElementById('player');
  const videoError = document.getElementById('video-error');
  // Summary and category pages do not render a video dialog.
  if(!dialog || !player || !videoError) return;
  let opener = null;
  function showVideo(key, trigger) {
    const video = content.videos[key];
    if(!video) return;
    closeMenu();
    opener = trigger;
    document.getElementById('video-title').textContent = video.title;
    document.getElementById('video-context').textContent = video.context;
    document.getElementById('video-fallback').href = video.src;
    videoError.hidden = true;
    player.poster = video.poster;
    player.src = video.src;
    dialog.showModal();
    document.body.classList.add('modal-open');
    player.play().catch(() => {});
  }
  document.querySelectorAll('[data-video]').forEach(button => button.addEventListener('click', () => showVideo(button.dataset.video, button)));
  dialog.querySelector('.close-button').addEventListener('click', () => dialog.close());
  dialog.addEventListener('click', event => {
    if(event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if(event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
  });
  dialog.addEventListener('close', () => {
    player.pause();
    player.removeAttribute('src');
    player.load();
    document.body.classList.remove('modal-open');
    if(opener) opener.focus({preventScroll:true});
  });
  player.addEventListener('error', () => { if(player.getAttribute('src')) videoError.hidden = false; });
})();
