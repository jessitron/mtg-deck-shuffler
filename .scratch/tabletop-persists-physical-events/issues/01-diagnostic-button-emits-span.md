# 01 — Diagnostic button fires a span on click

**What to build:** A floating 😠 button over the Tabletop canvas, visible to any player
with no gating. Clicking it spins the icon briefly (the only visible feedback) and emits
a telemetry span proving the click was wired up end-to-end. No diagnostic logic runs yet
— this ticket only makes the affordance real and observable.

**Blocked by:** None — can start immediately.

**Status:** ready-for-agent

- [x] Button renders via tldraw's `InFrontOfTheCanvas` component slot (same slot
      `LibraryPortalOverlay.tsx` uses), as a plain React element in viewport space — not a
      tldraw shape, not a toolbar tool.
- [x] Button is labeled with a 😠 emoji, rendered unconditionally, no dev/admin gating.
- [x] Clicking it triggers a brief spin animation on the icon, regardless of any other
      outcome.
- [x] Click handler wraps its work in the Tabletop's `inSpan()` helper and emits a span
      confirming the click registered (placeholder attributes are fine — this ticket does
      not yet compute a real diagnostic).
- [x] Verified in Honeycomb (local environment) that clicking the button produces a span.
