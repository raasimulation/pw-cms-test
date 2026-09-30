(() => {
  const body = document.body;
  const indexView = document.getElementById('index-view');
  const viewer = document.getElementById('project-viewer');
  const triggers = [...document.querySelectorAll('.project-trigger')];
  const details = [...document.querySelectorAll('[data-project-detail]')];
  const backButton = document.querySelector('.viewer-back');

  if (!indexView || !viewer || !backButton) return;

  let indexScrollY = 0;
  let activeProject = null;

  const findDetail = (slug) => details.find(detail => detail.dataset.projectDetail === slug);

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
        if (media.dataset.autoplay === 'true') {
          media.play().catch(() => {});
        }
      }
    });

    detail.dataset.hydrated = 'true';
  }

  function pauseInactiveVideos(activeDetail) {
    details.forEach(detail => {
      if (detail === activeDetail) return;
      detail.querySelectorAll('video').forEach(video => video.pause());
    });
  }

  function showProject(slug, options = {}) {
    const detail = findDetail(slug);
    if (!detail) return false;

    if (!body.classList.contains('viewer-open')) {
      indexScrollY = window.scrollY;
    }

    details.forEach(item => {
      item.hidden = item !== detail;
    });

    hydrateMedia(detail);
    pauseInactiveVideos(detail);

    body.classList.add('viewer-open');
    viewer.setAttribute('aria-hidden', 'false');
    activeProject = slug;

    if (!options.preserveScroll) window.scrollTo(0, 0);
    return true;
  }

  function showIndex(options = {}) {
    details.forEach(detail => {
      detail.hidden = true;
      detail.querySelectorAll('video').forEach(video => video.pause());
    });

    body.classList.remove('viewer-open');
    viewer.setAttribute('aria-hidden', 'true');
    activeProject = null;

    const restoreTo = options.scrollTo ?? indexScrollY;
    requestAnimationFrame(() => window.scrollTo(0, restoreTo));
  }

  function openFromTrigger(event) {
    const trigger = event.currentTarget;
    const slug = trigger.dataset.project;
    if (!findDetail(slug)) return;

    event.preventDefault();
    indexScrollY = window.scrollY;

    history.pushState(
      { project: slug, fromIndex: true, indexScrollY },
      '',
      `#${encodeURIComponent(slug)}`
    );

    showProject(slug);
  }

  triggers.forEach(trigger => trigger.addEventListener('click', openFromTrigger));

  backButton.addEventListener('click', () => {
    if (history.state?.project && history.state?.fromIndex) {
      history.back();
      return;
    }

    history.replaceState({}, '', `${location.pathname}${location.search}`);
    showIndex({ scrollTo: indexScrollY });
  });

  window.addEventListener('popstate', event => {
    const slug = decodeURIComponent(location.hash.replace(/^#/, ''));

    if (slug && findDetail(slug)) {
      if (typeof event.state?.indexScrollY === 'number') indexScrollY = event.state.indexScrollY;
      showProject(slug);
    } else {
      const scrollTo = typeof event.state?.indexScrollY === 'number'
        ? event.state.indexScrollY
        : indexScrollY;
      showIndex({ scrollTo });
    }
  });

  window.addEventListener('keydown', event => {
    if (event.key !== 'Escape' || !activeProject) return;
    backButton.click();
  });

  // Allow direct links such as /#ica while keeping normal index behavior at /.
  const initialSlug = decodeURIComponent(location.hash.replace(/^#/, ''));
  if (initialSlug && findDetail(initialSlug)) {
    history.replaceState({ project: initialSlug, fromIndex: false, indexScrollY: 0 }, '', location.href);
    showProject(initialSlug);
  } else {
    history.replaceState({ indexScrollY: window.scrollY }, '', location.href);
  }
})();
