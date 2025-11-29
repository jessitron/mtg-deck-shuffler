/**
 * Parallax scrolling effect for home-v3.html
 * Makes background images appear far away by moving them slower than scroll speed
 */

(function () {
  'use strict';

  // Parallax factor: lower = slower background movement = appears farther away
  const PARALLAX_FACTOR = 0.15;

  // Get all sections with background images
  const hero = document.querySelector('.hero');
  const steps = document.querySelectorAll('.step');

  let ticking = false;

  /**
   * Apply parallax effect to an element based on scroll position
   */
  function applyParallax(element) {
    const rect = element.getBoundingClientRect();
    const elementTop = rect.top;
    const elementHeight = rect.height;
    const windowHeight = window.innerHeight;

    // Calculate how much of the element is visible in the viewport
    // When element is centered in viewport, offset should be 0
    // As we scroll, offset increases/decreases
    const scrollOffset = (windowHeight / 2) - (elementTop + elementHeight / 2);
    const parallaxOffset = scrollOffset * PARALLAX_FACTOR;

    // Apply the parallax offset to background position
    element.style.backgroundPosition = `center calc(50% + ${parallaxOffset}px)`;
  }

  /**
   * Update parallax for all elements
   */
  function updateParallax() {
    if (hero) {
      applyParallax(hero);
    }

    steps.forEach(step => {
      applyParallax(step);
    });

    ticking = false;
  }

  /**
   * Request animation frame for smooth performance
   */
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
