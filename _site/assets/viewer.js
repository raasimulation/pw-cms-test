/*
  Project viewer: opens a project over the homepage and closes back to it.

  Transition: the current view blurs and fades out, the page swaps, the new view
  fades in from a blur. All timing and blur values live in assets/css/motion.css.

  Scroll: the homepage scroll position is saved when a project opens, and restored on
  close (Close button, Escape, or the browser back button). The restore is anchored to
  the tile you clicked, so it lands in the same place even if the header changed height.
*/
(() => {
  const body = document.body;
  const indexView = document.getElementById('index-view');
  const viewer = document.getElementById('project-viewer');
  const triggers = [...document.querySelectorAll('.project-trigger')];
  const details = [...document.querySelectorAll('[data-project-detail]')];
  const backButton = viewer && viewer.querySelector('.viewer-back');

  if (!indexView || !viewer || !backButton) return;

  // We restore scroll ourselves; the browser's automatic restore fires while the
  // homepage is still hidden and lands in the wrong place.
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';

  const INDEX = null;   // "no project": the homepage
  let shown = INDEX;    // what is on screen right now
  let token = 0;        // increments on every navigation so stale steps can bail out
  let saved = { scrollY: 0, anchor: null, anchorTop: 0 };
  let keyboardOpen = false; // move focus around only for keyboard users

  /* ---------- helpers ---------- */

  const toMs = (value, fallback) => {
    const v = (value || '').trim();
    const n = parseFloat(v);
    if (Number.isNaN(n)) return fallback;
    if (v.endsWith('ms')) return n;
    if (v.endsWith('s')) return n * 1000;
    return n;
  };
  const cssTime = (name, fallback) =>
    toMs(getComputedStyle(document.documentElement).getPropertyValue(name), fallback);

  const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  // Resolve when the layer's fade/blur transition really ends (it starts a frame or two after the
  // class change, so a plain timer would swap too early). The timer is only a safety net.
  const transitionDone = (layer, ms) => new Promise(resolve => {
    let timer = 0;
    const end = (event) => {
      if (event && (event.target !== layer || !/^(opacity|filter)$/.test(event.propertyName))) return;
      clearTimeout(timer);
      layer.removeEventListener('transitionend', end);
      layer.removeEventListener('transitioncancel', end);
      resolve();
    };
    layer.addEventListener('transitionend', end);
    layer.addEventListener('transitioncancel', end);
    timer = setTimeout(end, ms + 150);
  });
  const nextFrame = () => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  const emit = (name, detail) => document.dispatchEvent(new CustomEvent(name, { detail }));

  const findDetail = (slug) => details.find(detail => detail.dataset.projectDetail === slug);
  const findTrigger = (slug) => triggers.find(trigger => trigger.dataset.project === slug);
  const slugFromHash = () => {
    try { return decodeURIComponent(location.hash.replace(/^#/, '')); }
    catch { return ''; }
  };

  const isState = (state) => state && typeof state === 'object';
  const validSaved = (value) => isState(value) && typeof value.scrollY === 'number';

  /* ---------- media ---------- */

  function hydrateMedia(detail) {
    if (!detail || detail.dataset.hydrated === 'true') return;

    detail.querySelectorAll('[data-src]').forEach(media => {
      media.src = media.dataset.src;
      media.removeAttribute('data-src');

      if (media.tagName === 'VIDEO') {
        if (media.dataset.volume !== undefined) {
          const volume = Number(media.dataset.volume);
          if (!Number.isNaN(volume)) media.volume = Math.max(0, Math.min(1, volume));
        }
        media.load();
      }
    });

    detail.dataset.hydrated = 'true';
  }

  // Autoplay videos every time a project opens, not only the first time.
  function playAutoplay(detail) {
    detail.querySelectorAll('video[data-autoplay="true"]').forEach(video => {
      video.play().catch(() => {});
    });
  }

  const pauseVideos = (scope) => scope.querySelectorAll('video').forEach(video => video.pause());
  const playCoverVideos = () => indexView.querySelectorAll('video[autoplay]').forEach(video => {
    video.play().catch(() => {});
  });

  /* ---------- scroll ---------- */

  function rememberIndexScroll(slug) {
    const trigger = slug ? findTrigger(slug) : null;
    saved = {
      scrollY: window.scrollY,
      anchor: trigger ? slug : null,
      anchorTop: trigger ? trigger.getBoundingClientRect().top : 0,
    };
  }

  function restoreIndexScroll() {
    let y = saved.scrollY || 0;
    const trigger = saved.anchor ? findTrigger(saved.anchor) : null;
    if (trigger) y = window.scrollY + trigger.getBoundingClientRect().top - saved.anchorTop;
    window.scrollTo(0, Math.max(0, Math.round(y)));
  }

  /* ---------- swapping views (instant, happens while everything is blurred out) ---------- */

  function swapTo(target) {
    if (target === INDEX) {
      details.forEach(detail => {
        detail.hidden = true;
        pauseVideos(detail);
      });
      body.classList.remove('viewer-open');
      viewer.setAttribute('aria-hidden', 'true');
      shown = INDEX;
      emit('viewer:close');      // header rotator re-measures before we restore scroll
      restoreIndexScroll();
      playCoverVideos();

      const trigger = saved.anchor ? findTrigger(saved.anchor) : null;
      if (keyboardOpen && trigger) trigger.focus({ preventScroll: true });
      return;
    }

    const detail = findDetail(target);
    const fromIndex = shown === INDEX;
    details.forEach(item => {
      item.hidden = item !== detail;
      if (item !== detail) pauseVideos(item);
    });
    hydrateMedia(detail);

    body.classList.add('viewer-open');
    viewer.setAttribute('aria-hidden', 'false');
    shown = target;
    if (fromIndex) {
      pauseVideos(indexView);
      emit('viewer:open', { slug: target });
    }
    window.scrollTo(0, 0);
    playAutoplay(detail);
    if (keyboardOpen) backButton.focus({ preventScroll: true });
  }

  /* ---------- the transition ---------- */

  async function transitionTo(target, { instant = false } = {}) {
    const current = ++token;
    const toViewer = target !== INDEX;

    // Page background follows the destination (light homepage / dark viewer).
    body.classList.toggle('vt-theme-viewer', toViewer);

    if (instant) {
      body.classList.add('vt-instant');
      body.classList.remove('vt-hide', 'vt-busy');
      swapTo(target);
      void body.offsetHeight;
      body.classList.remove('vt-instant');
      return;
    }

    body.classList.add('vt-busy');

    if (shown !== target) {
      if (toViewer) hydrateMedia(findDetail(target)); // start loading media during the fade-out
      const outgoing = shown === INDEX ? indexView : findDetail(shown);
      body.classList.add('vt-hide');                   // 1. blur out what is on screen
      await transitionDone(outgoing, cssTime('--vt-out-duration', 450));
      if (current !== token) return;

      swapTo(target);                                  // 2. swap while nothing is visible
      // Commit the hidden (blurred) style on the newly shown layer so it can transition from it.
      document.querySelectorAll('.vt-layer').forEach(layer => getComputedStyle(layer).filter);
    }

    await nextFrame();
    if (current !== token) return;
    body.classList.remove('vt-hide');                  // 3. blur in the new view

    await wait(cssTime('--vt-in-duration', 650));
    if (current !== token) return;
    body.classList.remove('vt-busy');
  }

  /* ---------- navigation ---------- */

  function openFromTrigger(event) {
    // Let cmd/ctrl/shift/middle-click open the project link in a new tab as usual.
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;

    const slug = event.currentTarget.dataset.project;
    if (!findDetail(slug)) return;
    event.preventDefault();
    if (shown !== INDEX) return;

    clearTimeout(scrollSaveTimer);
    rememberIndexScroll(slug);
    keyboardOpen = event.detail === 0; // Enter on a focused tile fires a click with detail 0

    // Save the position on the homepage's own history entry, so Back can restore it...
    history.replaceState({ ...(isState(history.state) ? history.state : {}), view: 'index', indexScroll: saved }, '', location.href);
    // ...then add the project entry.
    history.pushState(
      { view: 'project', project: slug, fromIndex: true, indexScroll: saved },
      '',
      `#${encodeURIComponent(slug)}`
    );

    transitionTo(slug);
  }

  triggers.forEach(trigger => trigger.addEventListener('click', openFromTrigger));

  backButton.addEventListener('click', () => {
    if (shown === INDEX) return;

    if (isState(history.state) && history.state.fromIndex) {
      history.back(); // popstate below runs the transition
      return;
    }

    // Opened from a direct link (e.g. rasim.run/#ica): no homepage entry to go back to.
    saved = { scrollY: 0, anchor: null, anchorTop: 0 };
    history.replaceState({ view: 'index', indexScroll: saved }, '', `${location.pathname}${location.search}`);
    transitionTo(INDEX);
  });

  window.addEventListener('popstate', (event) => {
    if (isState(event.state) && validSaved(event.state.indexScroll)) saved = event.state.indexScroll;

    const slug = slugFromHash();
    transitionTo(slug && findDetail(slug) ? slug : INDEX);
  });

  window.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && shown !== INDEX) backButton.click();
  });

  // Remember the homepage scroll across a reload (history.state survives reloads).
  // Saved shortly after scrolling stops, only while the homepage entry is the current one.
  let scrollSaveTimer = 0;
  window.addEventListener('scroll', () => {
    clearTimeout(scrollSaveTimer);
    scrollSaveTimer = setTimeout(() => {
      const state = isState(history.state) ? history.state : {};
      if (shown !== INDEX || body.classList.contains('vt-busy') || state.view !== 'index') return;
      history.replaceState({ ...state, indexScroll: { scrollY: window.scrollY, anchor: null, anchorTop: 0 } }, '', location.href);
    }, 300);
  }, { passive: true });

  /* ---------- first load ---------- */

  const initialSlug = slugFromHash();
  if (initialSlug && findDetail(initialSlug)) {
    // Direct link to a project: show it straight away, no transition.
    history.replaceState({ view: 'project', project: initialSlug, fromIndex: false, indexScroll: saved }, '', location.href);
    transitionTo(initialSlug, { instant: true });
  } else {
    const previous = isState(history.state) && validSaved(history.state.indexScroll) ? history.state.indexScroll : null;
    if (previous) {
      saved = previous;
      window.scrollTo(0, previous.scrollY);
    }
    history.replaceState({ view: 'index', indexScroll: saved }, '', location.href);
  }
})();
