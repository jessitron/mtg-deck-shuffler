import { tlmenus } from "tldraw";

/**
 * Works around a state desync in tldraw's own `MenuClickCapture`
 * (`@tldraw/editor`'s `lib/components/MenuClickCapture.tsx`): while a context
 * menu is open, that component renders a full-canvas capture div so an
 * outside click doesn't also hit whatever shape is underneath. For a plain
 * (left-button) outside click, its `handlePointerDown` closes the menu by
 * calling `editor.menus.clearOpenMenus()` directly — bypassing Radix
 * `ContextMenu.Root`'s own open/close handshake (`onOpenChange`) entirely.
 * That clears tldraw's own `tlmenus` atom (so the menu visually disappears —
 * `DefaultContextMenu` only renders its `Portal` while `tlmenus` says a menu
 * is open), but Radix's *internal* open state, tracked separately inside
 * `ContextMenu.Root`, never gets told to close. On the next right-click,
 * Radix sees its own state is already `open: true` and does nothing — so
 * `onOpenChange` never fires again, `tlmenus` never gets re-added, and the
 * menu silently fails to reopen even though the SelectTool's state chart
 * (an entirely separate code path) still selects the right-clicked shape.
 * That's the reported bug: right-click opens a menu once; after dismissing
 * it by clicking elsewhere, the next right-click selects the card but the
 * menu never comes back, until something else (e.g. Escape, which DOES
 * complete Radix's handshake correctly) resets it.
 *
 * Verified in `test/verification/verify-rightclick-reopen.spec.ts`: closing
 * the menu with Escape and reopening it works every time; closing it with an
 * outside left-click desyncs it after the very first cycle.
 *
 * The fix, since `MenuClickCapture` isn't swappable via `TLComponents`: beat
 * it to the punch. A capture-phase `pointerdown` listener on `document` runs
 * before `MenuClickCapture`'s own React (bubble-phase) handler, so if a menu
 * is open when a left-button outside click starts, dispatch a synthetic
 * `Escape` keydown first — Radix's own dismissable-layer listens for that on
 * `document` and closes the menu the correct way. By the time
 * `MenuClickCapture.handlePointerDown` runs its `clearOpenMenus()`, the menu
 * is already closed and in sync, so that call is a no-op instead of a
 * desync. A click that lands on the menu itself (choosing a menu item) is
 * excluded — closing it first would cancel the click before its own
 * `onSelect` ever runs.
 */
export function closeContextMenuBeforeOutsideClick(): () => void {
  const handlePointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    if (!tlmenus.hasAnyOpenMenus()) return;
    // A click landing on the menu itself (e.g. a menu item) must reach Radix's own
    // handler unaltered — dispatching Escape first would close the menu before that
    // click's own onSelect ever runs.
    if (event.target instanceof Element && event.target.closest('[data-testid="context-menu"]')) return;
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true }));
  };
  document.addEventListener("pointerdown", handlePointerDown, { capture: true });
  return () => document.removeEventListener("pointerdown", handlePointerDown, { capture: true });
}
