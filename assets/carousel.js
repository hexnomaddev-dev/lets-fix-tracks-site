(() => {
  const showcase = document.querySelector('[data-carousel]');
  const stage = showcase.querySelector('.carousel-stage');
  const slides = [...stage.querySelectorAll('.carousel-slide')];
  const controls = showcase.querySelector('.carousel-controls');
  const indicators = [...controls.querySelectorAll('.carousel-dots button')];
  const play = controls.querySelector('.carousel-play');
  const caption = showcase.querySelector('.carousel-caption');
  const status = showcase.querySelector('.carousel-status');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const interval = 6000;

  let current = 0;
  let timer;
  let paused = false;
  let resumeRequested = false;
  let hovered = matchMedia('(hover: hover)').matches && showcase.matches(':hover');
  let swipe;

  function schedule() {
    clearTimeout(timer);
    if (paused || swipe || document.hidden || motion.matches) return;
    if (!resumeRequested && (hovered || showcase.querySelector(':focus-visible'))) return;
    timer = setTimeout(() => show(current + 1), interval);
  }

  function show(index, manual = false) {
    const next = (index + slides.length) % slides.length;
    slides[current].classList.remove('is-active');
    slides[current].setAttribute('aria-hidden', 'true');
    indicators[current].removeAttribute('aria-current');
    current = next;
    slides[current].classList.add('is-active');
    slides[current].setAttribute('aria-hidden', 'false');
    indicators[current].setAttribute('aria-current', 'true');
    caption.textContent = slides[current].dataset.caption;
    if (manual) status.textContent = slides[current].getAttribute('aria-label');
    schedule();
  }

  function updateAutoplay() {
    play.hidden = motion.matches;
    const label = paused ? 'Resume autoplay' : 'Pause autoplay';
    play.setAttribute('aria-label', label);
    play.title = label;
    play.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
    schedule();
  }

  controls.querySelector('.carousel-prev').addEventListener('click', () => show(current - 1, true));
  controls.querySelector('.carousel-next').addEventListener('click', () => show(current + 1, true));
  indicators.forEach((button, index) => button.addEventListener('click', () => show(index, true)));
  play.addEventListener('click', () => {
    paused = !paused;
    // An explicit resume works even while the pointer or keyboard focus is on this button.
    resumeRequested = !paused;
    updateAutoplay();
  });
  showcase.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
    event.preventDefault();
    show(current + (event.key === 'ArrowLeft' ? -1 : 1), true);
  });
  showcase.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    resumeRequested = false;
    schedule();
  });
  showcase.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovered = false;
    schedule();
  });
  showcase.addEventListener('focusin', () => {
    resumeRequested = false;
    schedule();
  });
  showcase.addEventListener('focusout', () => queueMicrotask(schedule));

  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    swipe = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
    schedule();
  });
  stage.addEventListener('pointerup', (event) => {
    if (swipe?.id !== event.pointerId) return;
    const dx = event.clientX - swipe.x;
    const dy = event.clientY - swipe.y;
    swipe = undefined;
    if (Math.abs(dx) >= 40 && Math.abs(dx) > 1.3 * Math.abs(dy)) {
      show(current + (dx > 0 ? -1 : 1), true);
    } else {
      schedule();
    }
  });
  stage.addEventListener('lostpointercapture', (event) => {
    if (swipe?.id !== event.pointerId) return;
    swipe = undefined;
    schedule();
  });

  for (const image of stage.querySelectorAll('img')) {
    const showFallback = () => {
      image.hidden = true;
      image.nextElementSibling.hidden = false;
    };
    if (image.complete && !image.naturalWidth) showFallback();
    else image.addEventListener('error', showFallback, { once: true });
  }

  document.addEventListener('visibilitychange', schedule);
  motion.addEventListener('change', updateAutoplay);
  controls.hidden = false;
  updateAutoplay();
})();
