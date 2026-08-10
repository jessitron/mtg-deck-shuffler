/**
 * Focus management for the HTMX-swapped modals: card modal (#card-modal-container)
 * and library/history/table/error modals (#modal-container). These are plain divs
 * swapped by HTMX, not a native <dialog>, so the browser gives us none of
 * focus-in-on-open, Tab-trapping, background-inert, or focus-restore-on-close for
 * free — this file adds all four. Keyed off htmx:afterSettle, same as
 * table-look-focus.js's existing pattern for htmx-swap-safe focus work.
 *
 * `tabindex="0"` on each `.modal-overlay`/`.card-modal-overlay` (in the four
 * templates) is the sanctioned landing spot for initial focus — see
 * playmat.css's `:focus-visible` rule for those two selectors (inward
 * outline-offset, since they're full-viewport fixed elements). It is NOT a
 * fossil; this file is what it was waiting for.
 *
 * Background-escape is actually prevented by native `inert` (removes
 * descendants from tab order and the accessibility tree) — the Tab/Shift+Tab
 * handler below only adds first<->last wrap-around inside the open dialog so
 * Tab cycles instead of dead-ending; it is not what stops Tab from escaping.
 *
 * The two dialogs can stack (opening a card from inside the library modal
 * layers the card modal on top). "Topmost" is the card modal if it's open,
 * else the library/history/table modal, else none. Whichever container is
 * NOT topmost — including the main page content — gets `inert`. Each
 * container's own prior-focus is tracked separately, so closing the card
 * modal while the library modal is still open returns focus into the library
 * modal, not all the way back to the original page opener.
 */
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
    // If the element is gone (e.g. an unrelated #game-container re-render
    // happened while the modal was open), the browser already reverted
    // focus to <body> when it was removed — nothing more to do.
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
