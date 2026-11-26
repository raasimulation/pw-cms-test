/*
  Paragraph rotator for the homepage header.

  - The paragraphs inside [data-ti-rotator] take turns in one slot, sliding up.
  - Hovering the slot (or focusing it with the keyboard, or tapping it on touch screens)
    expands it into the regular stacked layout. Leaving the header collapses it again.
  - The Links block sits outside the rotator, so it never rotates.

  Every timing value is read from CSS custom properties in assets/css/motion.css,
  so you never need to edit this file to tune the motion.
*/
(() => {
  const rotator = document.querySelector('[data-ti-rotator]');
  if (!rotator) return;

  const slides = [...rotator.querySelectorAll('.ti-slide')];
  const header = rotator.closest('.ti-bs') || rotator;
  const root = document.documentElement;

  // Reduced motion, or nothing to rotate: keep the plain stacked layout (no JS styling at all).
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (slides.length < 2 || reduceMotion) return;

  const heightMode = rotator.dataset.tiHeight === 'active' ? 'active' : 'tallest';

  let active = 0;
  let expanded = false;
  let running = false;    // allowed to auto-advance
  let advanceTimer = 0;
  let parkTimer = 0;
  let enterTimer = 0;
  let leaveTimer = 0;
  let lastPointerType = 'mouse';
  let metrics = null;

  /* ---------- helpers ---------- */

  const cssVar = (name) => getComputedStyle(rotator).getPropertyValue(name).trim();

  const toMs = (value, fallback) => {
    if (!value) return fallback;
    const n = parseFloat(value);
    if (Number.isNaN(n)) return fallback;
    if (value.endsWith('ms')) return n;
    if (value.endsWith('s')) return n * 1000;
    return n;
  };

  const timing = () => ({
    switchMs: toMs(cssVar('--ti-switch-duration'), 900),
    expandMs: toMs(cssVar('--ti-expand-duration'), 700),
    holdBase: toMs(cssVar('--ti-hold-base'), 4000),
    holdPerWord: toMs(cssVar('--ti-hold-per-word'), 250),
    hoverDelay: toMs(cssVar('--ti-hover-delay'), 120),
    leaveDelay: toMs(cssVar('--ti-leave-delay'), 300),
  });

  const wordCount = (el) => (el.textContent.trim().match(/\S+/g) || []).length;

  // How long a paragraph stays on screen: a base time plus time per word, so long paragraphs stay longer.
  const holdFor = (index) => {
    const t = timing();
    return t.holdBase + t.holdPerWord * wordCount(slides[index]);
  };

  const setY = (slide, y) => slide.style.setProperty('--ti-y', `${Math.round(y)}px`);
  const setShown = (slide, shown) => slide.classList.toggle('is-shown', shown);

  // Apply a change with transitions switched off, then switch them back on.
  const withoutTransition = (fn) => {
    rotator.classList.add('is-static');
    fn();
    void rotator.offsetHeight; // commit the jump before transitions return
    rotator.classList.remove('is-static');
  };

  /* ---------- measuring ---------- */

  function measure() {
    if (!rotator.offsetWidth) return false; // hidden (viewer open): keep the last good metrics
    const gap = parseFloat(getComputedStyle(rotator).rowGap) || 0;
    const heights = slides.map(slide => slide.offsetHeight);
    const offsets = [];
    let y = 0;
    heights.forEach((h, i) => {
      offsets[i] = y;
      y += h + gap;
    });
    metrics = {
      gap,
      heights,
      offsets,
      tallest: Math.max(...heights),
      expandedHeight: y - gap,
    };
    return true;
  }

  const slotHeight = () => (heightMode === 'active' ? metrics.heights[active] : metrics.tallest);
  const parkedBelow = () => slotHeight() + metrics.gap;              // just under the slot
  const parkedAbove = (i) => -(metrics.heights[i] + metrics.gap);    // just above the slot

  function setHeight(px) {
    rotator.style.setProperty('--ti-h', `${Math.round(px)}px`);
  }

  // Put every slide where the current state says it belongs.
  function place() {
    if (!metrics) return;
    if (expanded) {
      slides.forEach((slide, i) => {
        setY(slide, metrics.offsets[i]);
        setShown(slide, true);
      });
      setHeight(metrics.expandedHeight);
    } else {
      slides.forEach((slide, i) => {
        setY(slide, i === active ? 0 : parkedBelow());
        setShown(slide, i === active);
      });
      setHeight(slotHeight());
    }
  }

  function relayout() {
    if (!measure()) return;
    clearTimeout(parkTimer);
    withoutTransition(place);
  }

  /* ---------- rotation ---------- */

  function schedule(delay) {
    clearTimeout(advanceTimer);
    if (!running || expanded) return;
    advanceTimer = setTimeout(advance, delay);
  }

  function advance() {
    if (!running || expanded || !metrics) return;
    const { switchMs } = timing();
    const prev = active;
    const next = (active + 1) % slides.length;

    rotator.classList.remove('is-expanding');

    // Make sure the incoming paragraph starts just below the slot.
    withoutTransition(() => {
      setY(slides[next], (heightMode === 'active' ? metrics.heights[next] : metrics.tallest) + metrics.gap);
      setShown(slides[next], false);
    });

    active = next;
    setY(slides[prev], parkedAbove(prev));
    setShown(slides[prev], false);
    setY(slides[next], 0);
    setShown(slides[next], true);
    setHeight(slotHeight());

    // Once the outgoing paragraph has slid out of view, move it back below the slot.
    clearTimeout(parkTimer);
    parkTimer = setTimeout(() => {
      if (expanded || prev === active) return;
      withoutTransition(() => setY(slides[prev], parkedBelow()));
    }, switchMs + 50);

    schedule(switchMs + holdFor(active));
  }

  function start() {
    if (running) return;
    running = true;
    schedule(holdFor(active));
  }

  function stop() {
    running = false;
    clearTimeout(advanceTimer);
  }

  /* ---------- expand / collapse ---------- */

  function expand() {
    if (expanded || !metrics) return;
    clearTimeout(advanceTimer);
    clearTimeout(parkTimer);
    clearTimeout(enterTimer);

    // Line the hidden paragraphs up around the visible one first, so the whole column
    // slides down together instead of paragraphs flying in from different places.
    const shift = metrics.offsets[active];
    withoutTransition(() => {
      slides.forEach((slide, i) => {
        if (i !== active) setY(slide, metrics.offsets[i] - shift);
      });
    });

    expanded = true;
    rotator.classList.add('is-expanding', 'is-expanded');
    place();
  }

  function collapse({ instant = false } = {}) {
    if (!expanded) return;
    clearTimeout(enterTimer);
    clearTimeout(leaveTimer);
    expanded = false;
    rotator.classList.remove('is-expanded');

    if (instant || !metrics) {
      withoutTransition(place);
      schedule(holdFor(active));
      return;
    }

    // Reverse of expand: the column slides back up as one piece, the others fade away.
    const shift = metrics.offsets[active];
    rotator.classList.add('is-expanding');
    slides.forEach((slide, i) => {
      setY(slide, metrics.offsets[i] - shift);
      setShown(slide, i === active);
    });
    setHeight(slotHeight());

    clearTimeout(parkTimer);
    parkTimer = setTimeout(() => {
      if (expanded) return;
      withoutTransition(place);
    }, timing().expandMs + 50);

    schedule(timing().expandMs + holdFor(active));
  }

  /* ---------- input ---------- */

  rotator.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(leaveTimer);
    clearTimeout(enterTimer);
    enterTimer = setTimeout(expand, timing().hoverDelay);
  });

  // Leaving the paragraphs before the hover delay ends cancels the expand.
  rotator.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(enterTimer);
  });

  // Once open, it stays open while the pointer is anywhere in the header (including Links).
  header.addEventListener('pointerenter', (event) => {
    if (event.pointerType === 'mouse') clearTimeout(leaveTimer);
  });

  header.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    clearTimeout(enterTimer);
    clearTimeout(leaveTimer);
    leaveTimer = setTimeout(() => collapse(), timing().leaveDelay);
  });

  // Touch and pen: tap the paragraphs to open or close them.
  rotator.addEventListener('pointerdown', (event) => { lastPointerType = event.pointerType; });
  rotator.addEventListener('click', (event) => {
    if (lastPointerType === 'mouse' || event.target.closest('a')) return;
    if (expanded) collapse(); else expand();
  });
  document.addEventListener('click', (event) => {
    if (expanded && lastPointerType !== 'mouse' && !header.contains(event.target)) collapse();
  });

  // Keyboard: focusing the paragraphs opens them, tabbing out of the header closes them.
  rotator.addEventListener('focusin', (event) => {
    if (event.target.matches(':focus-visible')) expand();
  });
  header.addEventListener('focusout', (event) => {
    if (!header.contains(event.relatedTarget) && !header.matches(':hover')) collapse();
  });

  /* ---------- lifecycle ---------- */

  rotator.classList.add('is-ready');
  rotator.setAttribute('tabindex', '0');
  rotator.setAttribute('role', 'group');
  if (!rotator.hasAttribute('aria-label')) rotator.setAttribute('aria-label', 'About, focus to show all paragraphs');
  relayout();

  // Re-measure when the width changes or the web font finishes loading.
  if ('ResizeObserver' in window) {
    let lastWidth = rotator.offsetWidth;
    new ResizeObserver(() => {
      const width = rotator.offsetWidth;
      if (!width || width === lastWidth) return;
      lastWidth = width;
      relayout();
    }).observe(rotator);
  } else {
    window.addEventListener('resize', relayout);
  }

  if (document.fonts) {
    document.fonts.ready.then(relayout);
    document.fonts.addEventListener('loadingdone', relayout);
  }

  // Pause while the project viewer covers the homepage.
  document.addEventListener('viewer:open', () => {
    stop();
    collapse({ instant: true });
  });
  document.addEventListener('viewer:close', () => {
    relayout();
    start();
  });

  // Pause in background tabs.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (!document.body.classList.contains('viewer-open')) start();
  });

  // Wait for the intro animation, if it is playing, before the first switch.
  const begin = () => {
    if (document.body.classList.contains('viewer-open') || document.hidden) return;
    relayout();
    start();
  };
  if (root.classList.contains('intro-on')) {
    document.addEventListener('intro:done', begin, { once: true });
  } else {
    begin();
  }
})();
