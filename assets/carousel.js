(() => {
  const carousel = document.querySelector('[data-carousel]');
  if (!carousel) return;

  const stage = carousel.querySelector('.carousel-stage');
  const slides = [...stage.querySelectorAll('.carousel-slide')];
  const controls = carousel.querySelector('.carousel-controls');
  const steps = [...controls.querySelectorAll('.carousel-dots button')];
  const playback = controls.querySelector('.carousel-play');
  const caption = carousel.querySelector('.carousel-caption');
  const description = carousel.querySelector('.carousel-description');
  const counter = carousel.querySelector('.carousel-count');
  const announcement = carousel.querySelector('.carousel-status');
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

  let active = 0;
  let timer;
  let paused = false;
  let explicitResume = false;
  let hovered = matchMedia('(hover: hover)').matches && carousel.matches(':hover');
  let gesture;

  function schedule() {
    clearTimeout(timer);
    if (paused || document.hidden || reducedMotion.matches || gesture) return;
    if (!explicitResume && (hovered || carousel.querySelector(':focus-visible'))) return;
    timer = setTimeout(() => select(active + 1), 8000);
  }

  function select(index, manual = false) {
    active = (index + slides.length) % slides.length;
    slides.forEach((slide, position) => {
      const selected = position === active;
      slide.classList.toggle('is-active', selected);
      slide.setAttribute('aria-hidden', String(!selected));
      if (selected) steps[position].setAttribute('aria-current', 'step');
      else steps[position].removeAttribute('aria-current');
    });
    caption.textContent = slides[active].dataset.caption;
    description.textContent = slides[active].dataset.description;
    counter.textContent = (active + 1) + ' / ' + slides.length;
    if (manual) announcement.textContent = slides[active].getAttribute('aria-label');
    schedule();
  }

  function updatePlayback() {
    playback.hidden = reducedMotion.matches;
    const label = paused ? 'Resume autoplay' : 'Pause autoplay';
    playback.setAttribute('aria-label', label);
    playback.title = label;
    playback.firstElementChild.textContent = paused ? '▶' : 'Ⅱ';
    schedule();
  }

  controls.querySelector('.carousel-prev').addEventListener('click', () => select(active - 1, true));
  controls.querySelector('.carousel-next').addEventListener('click', () => select(active + 1, true));
  steps.forEach((button, index) => button.addEventListener('click', () => select(index, true)));
  playback.addEventListener('click', () => {
    paused = !paused;
    explicitResume = !paused;
    updatePlayback();
  });

  carousel.addEventListener('keydown', (event) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    const destinations = { ArrowLeft: active - 1, ArrowRight: active + 1, Home: 0, End: slides.length - 1 };
    if (!Object.hasOwn(destinations, event.key)) return;
    event.preventDefault();
    select(destinations[event.key], true);
  });
  carousel.addEventListener('pointerenter', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovered = true;
    explicitResume = false;
    schedule();
  });
  carousel.addEventListener('pointerleave', (event) => {
    if (event.pointerType !== 'mouse') return;
    hovered = false;
    schedule();
  });
  carousel.addEventListener('focusin', () => {
    explicitResume = false;
    schedule();
  });
  carousel.addEventListener('focusout', () => queueMicrotask(schedule));

  stage.addEventListener('pointerdown', (event) => {
    if (event.pointerType !== 'touch' || !event.isPrimary) return;
    gesture = { id: event.pointerId, x: event.clientX, y: event.clientY };
    stage.setPointerCapture(event.pointerId);
    schedule();
  });
  stage.addEventListener('pointerup', (event) => {
    if (gesture?.id !== event.pointerId) return;
    const horizontal = event.clientX - gesture.x;
    const vertical = event.clientY - gesture.y;
    gesture = undefined;
    if (Math.abs(horizontal) >= 40 && Math.abs(horizontal) > Math.abs(vertical) * 1.3) {
      select(active + (horizontal < 0 ? 1 : -1), true);
    } else {
      schedule();
    }
  });
  stage.addEventListener('lostpointercapture', (event) => {
    if (gesture?.id !== event.pointerId) return;
    gesture = undefined;
    schedule();
  });
  document.addEventListener('visibilitychange', schedule);
  reducedMotion.addEventListener('change', updatePlayback);
  controls.hidden = false;
  updatePlayback();
})();
