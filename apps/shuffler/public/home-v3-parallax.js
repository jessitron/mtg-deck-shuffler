
(function () {
  'use strict';

  // Parallax factor: lower = slower background movement = appears farther away
  const PARALLAX_FACTOR = 0.15;

  // Get all sections with background images
  const hero = document.querySelector('.hero');
  const steps = document.querySelectorAll('.step');

  let ticking = false;

  function applyParallax(element) {
    const rect = element.getBoundingClientRect();
    const elementTop = rect.top;
    const elementHeight = rect.height;
    const windowHeight = window.innerHeight;

    const scrollOffset = (windowHeight / 2) - (elementTop + elementHeight / 2);
    const parallaxOffset = scrollOffset * PARALLAX_FACTOR;

    // Apply the parallax offset to background position
    element.style.backgroundPosition = `center calc(50% + ${parallaxOffset}px)`;
  }

  function updateParallax() {
    if (hero) {
      applyParallax(hero);
    }

    steps.forEach(step => {
      applyParallax(step);
    });

    ticking = false;
  }

  function requestTick() {
    if (!ticking) {
      requestAnimationFrame(updateParallax);
      ticking = true;
    }
  }

  // Listen for scroll events
  window.addEventListener('scroll', requestTick, { passive: true });

  // Initial update on page load
  updateParallax();
})();
