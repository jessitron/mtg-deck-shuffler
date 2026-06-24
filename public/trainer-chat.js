// Trainer chat: keep the "minutes ago" label current for the most recent message.
//
// The authoritative timestamp lives on the backend and is rendered into each
// bubble's data-received-at (epoch ms). Turning that into a relative string is a
// pure view concern, so we do it client-side and refresh it every minute — a
// server-rendered "3 min ago" would otherwise go stale until the next request.
(function () {
  "use strict";

  function relativeTime(epochMs) {
    var deltaMs = Date.now() - epochMs;
    var minutes = Math.floor(deltaMs / 60000);
    if (minutes < 1) return "just now";
    if (minutes === 1) return "1 min ago";
    if (minutes < 60) return minutes + " min ago";
    var hours = Math.floor(minutes / 60);
    if (hours === 1) return "1 hr ago";
    return hours + " hr ago";
  }

  function updateLastSeen() {
    var label = document.getElementById("advisor-chat-last-seen");
    if (!label) return;
    var bubbles = document.querySelectorAll("#advisor-chat-messages .advisor-chat-bubble[data-received-at]");
    if (bubbles.length === 0) {
      label.textContent = "";
      return;
    }
    // The most recent message is the largest timestamp (also the last appended).
    var newest = 0;
    bubbles.forEach(function (b) {
      var t = parseInt(b.getAttribute("data-received-at"), 10);
      if (t > newest) newest = t;
    });
    label.textContent = relativeTime(newest);
  }

  // This script loads in <head>, so document.body isn't available yet — attach to
  // document, which htmx events bubble to.
  document.addEventListener("DOMContentLoaded", updateLastSeen);
  // Recompute after each chat exchange is appended (hx-swap beforeend).
  document.addEventListener("htmx:afterSwap", updateLastSeen);
  // Keep it fresh as time passes.
  setInterval(updateLastSeen, 60000);

  // Ending the chat closes the drawer. The server signals this via an HX-Trigger
  // response header (the modal form is detached by its OOB swap, so it can't close
  // the drawer itself). htmx dispatches the event, which bubbles to document.
  document.addEventListener("trainer-chat-ended", function () {
    document.body.classList.remove("advisor-chat-open");
  });
})();
