(function () {
  const FOCUSABLE_SELECTOR =
    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

  const priorFocus = { modal: null, cardModal: null };
  const wasOpen = { modal: false, cardModal: false };

  function mainContentRegion() {
    return document.querySelector('#game-container') || document.querySelector('main.prepare-container');
  }

  function focusableIn(overlay) {
    return [overlay, ...overlay.querySelectorAll(FOCUSABLE_SELECTOR)].filter((el) => el.offsetParent !== null || el === overlay);
  }

  function restoreFocus(el) {
    if (el && typeof el.focus === 'function' && document.body.contains(el)) {
      el.focus();
    }
  }

  function updateFocusAndInert() {
    const modalContainer = document.getElementById('modal-container');
    const cardModalContainer = document.getElementById('card-modal-container');
    const modalOverlay = modalContainer && modalContainer.querySelector('.modal-overlay');
    const cardOverlay = cardModalContainer && cardModalContainer.querySelector('.card-modal-overlay');

    const modalOpenNow = !!modalOverlay;
    const cardOpenNow = !!cardOverlay;
    const topmost = cardOverlay || modalOverlay || null;

    // Opening transitions: remember what had focus, then move focus in.
    if (modalOpenNow && !wasOpen.modal) {
      priorFocus.modal = document.activeElement;
    }
    if (cardOpenNow && !wasOpen.cardModal) {
      priorFocus.cardModal = document.activeElement;
    }

    // Background handling: everything except the topmost dialog is inert.
    const main = mainContentRegion();
    if (main) main.toggleAttribute('inert', !!topmost);
    if (modalContainer) modalContainer.toggleAttribute('inert', !!topmost && topmost !== modalOverlay);
    if (cardModalContainer) cardModalContainer.toggleAttribute('inert', !!topmost && topmost !== cardOverlay);

    if ((cardOpenNow && !wasOpen.cardModal) || (!cardOpenNow && modalOpenNow && !wasOpen.modal)) {
      topmost.focus();
    }

    // Closing transitions: restore focus to whatever opened this dialog.
    if (!cardOpenNow && wasOpen.cardModal) {
      restoreFocus(priorFocus.cardModal);
      priorFocus.cardModal = null;
    }
    if (!modalOpenNow && wasOpen.modal) {
      restoreFocus(priorFocus.modal);
      priorFocus.modal = null;
    }

    wasOpen.modal = modalOpenNow;
    wasOpen.cardModal = cardOpenNow;
  }

  document.addEventListener('htmx:afterSettle', updateFocusAndInert);
  document.addEventListener('DOMContentLoaded', updateFocusAndInert);

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Tab') return;

    const cardModalContainer = document.getElementById('card-modal-container');
    const modalContainer = document.getElementById('modal-container');
    const cardOverlay = cardModalContainer && cardModalContainer.querySelector('.card-modal-overlay');
    const modalOverlay = modalContainer && modalContainer.querySelector('.modal-overlay');
    const topmost = cardOverlay || modalOverlay;
    if (!topmost) return;

    const focusable = focusableIn(topmost);
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  });
})();
