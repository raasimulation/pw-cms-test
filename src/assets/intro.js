/*
  Intro animation: builds the rings of letters, then removes the overlay when its
  CSS exit animation ends. Timing and look live in assets/css/intro.css; the text
  comes from the data-intro-text attribute (site.json → intro_text).

  Fires a document event "intro:done" when finished (the header rotator waits for it).
*/
(() => {
  const root = document.documentElement;
  const intro = document.getElementById('intro');
  if (!intro) return;

  let finished = false;
  let fallbackTimer = 0;

  const cleanUp = () => {
    window.removeEventListener('keydown', skip);
    window.removeEventListener('wheel', skip);
    window.removeEventListener('touchmove', skip);
    clearTimeout(fallbackTimer);
  };

  const finish = () => {
    if (finished) return;
    finished = true;
    cleanUp();
    intro.remove();
    root.classList.remove('intro-on');
    root.classList.add('intro-done');
    document.dispatchEvent(new CustomEvent('intro:done'));
  };

  function skip() {
    if (!finished) intro.classList.add('is-skipping');
  }

  // Not playing this time (already seen, direct project link), or intro.css missing: get out of the way.
  if (!root.classList.contains('intro-on') || getComputedStyle(intro).position !== 'fixed') {
    intro.remove();
    root.classList.remove('intro-on');
    return;
  }

  const style = getComputedStyle(intro);
  const read = (name) => style.getPropertyValue(name).trim();
  const toMs = (value, fallback) => {
    const n = parseFloat(value);
    if (Number.isNaN(n)) return fallback;
    if (value.endsWith('ms')) return n;
    if (value.endsWith('s')) return n * 1000;
    return n;
  };

  const text = (intro.dataset.introText || '').trim();
  const chars = Array.from(text); // splits by character, emoji-safe
  if (!chars.length) {
    finish();
    return;
  }

  const rings = Math.max(1, Math.round(parseFloat(read('--intro-rings')) || 4));
  const stage = intro.querySelector('.intro-stage') || intro.appendChild(document.createElement('div'));
  stage.classList.add('intro-stage');
  stage.style.setProperty('--n', chars.length);

  const fragment = document.createDocumentFragment();
  for (let ring = 0; ring < rings; ring++) {
    chars.forEach((char, i) => {
      if (/\s/.test(char)) return; // spaces stay as empty spokes
      const letter = document.createElement('span');
      letter.className = 'intro-letter';
      letter.textContent = char;
      letter.style.setProperty('--i', i);
      letter.style.setProperty('--ring', ring);
      fragment.appendChild(letter);
    });
  }
  stage.appendChild(fragment);

  intro.addEventListener('animationend', (event) => {
    if (event.target !== intro) return;
    if (event.animationName === 'intro-exit' || event.animationName === 'intro-exit-skip') finish();
  });

  intro.addEventListener('click', skip);
  window.addEventListener('keydown', skip);
  window.addEventListener('wheel', skip, { passive: true });
  window.addEventListener('touchmove', skip, { passive: true });

  // Safety net in case animation events never fire (e.g. animations disabled in the browser).
  const total =
    toMs(read('--intro-start-delay'), 200) +
    rings * toMs(read('--intro-ring-interval'), 130) +
    toMs(read('--intro-hold'), 900) +
    toMs(read('--intro-exit-duration'), 750);
  fallbackTimer = setTimeout(finish, total + 1500);
})();
