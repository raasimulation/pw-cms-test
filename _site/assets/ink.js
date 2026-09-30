(function () {
    const host = document.querySelector('.intro-description');
    const trigger = document.getElementById('name-hover');

    if (!host || !trigger) return;

    /* pointer-driven, so it has no meaning on touch */
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!canHover || reduced) return;

    const COLOR = 'rgb(199, 21, 133)';
    const MIN_WIDTH = 1.2;
    const MAX_WIDTH = 5;
    const FADE_MS = 400;

    const canvas = document.createElement('canvas');
    canvas.className = 'ink-canvas';
    canvas.setAttribute('aria-hidden', 'true');
    host.appendChild(canvas);

    const ctx = canvas.getContext('2d', { alpha: true, desynchronized: true });
    let dpr = 1;

    /* client-space coordinates, flushed once per frame */
    const buffer = [];
    let armed = false;
    let started = false;
    let rafId = 0;
    let fadeTimer = 0;
    let rect = null;
    let rectDirty = true;
    let lastX = 0, lastY = 0, midX = 0, midY = 0, width = MIN_WIDTH;

    /* ---- sizing ---------------------------------------------------- */

    function resize() {
        dpr = Math.min(window.devicePixelRatio || 1, 2);
        const w = host.clientWidth;
        const h = host.clientHeight;
        if (!w || !h) return;

        canvas.width = Math.round(w * dpr);
        canvas.height = Math.round(h * dpr);
        canvas.style.width = w + 'px';
        canvas.style.height = h + 'px';

        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = COLOR;

        started = false;
        rectDirty = true;
    }

    if ('ResizeObserver' in window) {
        new ResizeObserver(resize).observe(host);
    } else {
        window.addEventListener('resize', resize);
    }
    resize();

    /* ---- drawing --------------------------------------------------- */

    function flush() {
        rafId = 0;

        if (rectDirty) {
            rect = host.getBoundingClientRect();
            rectDirty = false;
        }

        for (let i = 0; i < buffer.length; i += 2) {
            const x = buffer[i] - rect.left;
            const y = buffer[i + 1] - rect.top;

            if (!started) {
                lastX = midX = x;
                lastY = midY = y;
                started = true;
                continue;
            }

            const nextMidX = (lastX + x) / 2;
            const nextMidY = (lastY + y) / 2;

            /* faster movement draws thinner, like a real nib */
            const dx = x - lastX;
            const dy = y - lastY;
            const speed = Math.sqrt(dx * dx + dy * dy);
            const target = Math.max(MIN_WIDTH, MAX_WIDTH - speed * 0.12);
            width = width * 0.7 + target * 0.3;

            ctx.lineWidth = width;
            ctx.beginPath();
            ctx.moveTo(midX, midY);
            ctx.quadraticCurveTo(lastX, lastY, nextMidX, nextMidY);
            ctx.stroke();

            midX = nextMidX;
            midY = nextMidY;
            lastX = x;
            lastY = y;
        }

        buffer.length = 0;
    }

    function onMove(e) {
        /* one sample per hardware reading, not per frame */
        if (e.getCoalescedEvents) {
            const points = e.getCoalescedEvents();
            for (let i = 0; i < points.length; i++) {
                buffer.push(points[i].clientX, points[i].clientY);
            }
        } else {
            buffer.push(e.clientX, e.clientY);
        }

        if (!rafId) rafId = requestAnimationFrame(flush);
    }

    function markDirty() { rectDirty = true; }

    /* ---- arm / disarm ---------------------------------------------- */

    function arm() {
        if (armed) return;
        armed = true;
        started = false;
        width = MIN_WIDTH;

        window.clearTimeout(fadeTimer);
        canvas.classList.remove('fading');
        rectDirty = true;

        host.addEventListener('pointermove', onMove, { passive: true });
        window.addEventListener('scroll', markDirty, { passive: true });
    }

    function disarm() {
        if (!armed) return;
        armed = false;
        started = false;

        host.removeEventListener('pointermove', onMove);
        window.removeEventListener('scroll', markDirty);

        if (rafId) {
            cancelAnimationFrame(rafId);
            rafId = 0;
        }
        buffer.length = 0;

        canvas.classList.add('fading');
        fadeTimer = window.setTimeout(function () {
            if (armed) return;
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            canvas.classList.remove('fading');
        }, FADE_MS);
    }

    trigger.addEventListener('mouseenter', arm);
    host.addEventListener('pointerleave', disarm);
})();