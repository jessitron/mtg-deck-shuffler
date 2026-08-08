# Plan: ticket 14 — zone appearance (dashed at rest, glow when armed)

Design decision already resolved (`.scratch/tabletop-physics/issues/11-what-a-zone-looks-like.md`
"Answer" section, confirmed still current). This ticket is implementation, not decision-making.

## 1. `apps/tabletop/src/client/shapes/zoneHitTest.ts` (new)

Extracts the topmost-zone-wins hit test out of `MtgCardShapeUtil.zoneAt()` so a second consumer
(the armed check) doesn't duplicate the z-order comparison:

```ts
export interface ZoneHit {
  id: TLShapeId;
  zone: MtgZoneShapeProps["zone"];
}

/** The topmost (highest-index) `mtg-zone` shape whose bounds contain `center`, if any.
 * Tie-break is index order, not distance — see tabletop-shape-mechanics watch point 8
 * for the known limitation once zones can overlap near corners (not this ticket's problem). */
export function topmostZoneAt(editor: Editor, center: VecLike): ZoneHit | undefined {
  let winner: (ZoneHit & { index: string }) | undefined;
  for (const candidate of editor.getCurrentPageShapes()) {
    if (candidate.type !== "mtg-zone") continue;
    const bounds = editor.getShapePageBounds(candidate);
    if (!bounds?.containsPoint(center)) continue;
    if (!winner || candidate.index > winner.index) {
      winner = { id: candidate.id, zone: (candidate.props as MtgZoneShapeProps).zone, index: candidate.index };
    }
  }
  return winner;
}

/** The id of the zone currently "armed": the topmost zone under the center of whatever
 * card is mid-drag, if any. One computed per editor (not per zone shape) so N zones
 * don't each independently rescan all zones on every pointer-move during a drag —
 * confirmed with tabletop-shape-mechanics that Translating updates shape position on
 * every raw pointer-move, not throttled. */
const armedZoneIdByEditor = new WeakMap<Editor, ReturnType<typeof computed<TLShapeId | undefined>>>();
function armedZoneIdSignal(editor: Editor) {
  let signal = armedZoneIdByEditor.get(editor);
  if (!signal) {
    signal = computed("armedZoneId", () => {
      if (!editor.isIn("select.translating")) return undefined;
      for (const id of editor.getSelectedShapeIds()) {
        const shape = editor.getShape(id);
        const bounds = shape && editor.getShapePageBounds(shape);
        const hit = bounds && topmostZoneAt(editor, bounds.center);
        if (hit) return hit.id;
      }
      return undefined;
    });
    armedZoneIdByEditor.set(editor, signal);
  }
  return signal;
}

/** Is `zoneId` the currently-armed zone? Never written to the store — pure reactive
 * read, local to this browser tab, so it produces no synced doc write and no undo
 * entry, and is never visible to other clients. */
export function useIsZoneArmed(editor: Editor, zoneId: TLShapeId): boolean {
  return useValue("isZoneArmed", () => armedZoneIdSignal(editor).get() === zoneId, [editor, zoneId]);
}
```

Confirmed importable from `"tldraw"`: `computed`, `useValue`, `Editor`, `TLShapeId`, `VecLike` all
resolve (tldraw does `export * from "@tldraw/editor"`, which does `export * from "@tldraw/state-react"`).

## 2. `MtgCardShapeUtil.tsx` — `zoneAt()` becomes a thin wrapper

```ts
private zoneAt(shape: MtgCardShape): string | undefined {
  const bounds = this.editor.getShapePageBounds(shape);
  return bounds ? topmostZoneAt(this.editor, bounds.center)?.zone : undefined;
}
```

Same return contract (a zone string or undefined) — no caller-visible change, `onTranslateEnd`'s
debounce/console.log logic is untouched.

## 3. `MtgZoneShapeUtil.tsx` — the actual visual treatment

**Correction after `-review`:** ticket 11's "Answer" section is prose ("a box-shadow ring plus a
background tint") — the actual approved spec is the staged candidate CSS Jess looked at and
picked on `/design`, `apps/shuffler/public/design-candidates.css`'s `.zone-mock--rest` /
`.zone-mock--armed-glow` (verified directly, not just via the owner's summary):

```css
.zone-mock--rest {
  border: 2px dashed var(--dark-pink);
  color: var(--dark-pink);
  background: rgba(187, 82, 119, 0.03);
}
.zone-mock--armed-glow {
  border: 2px dashed var(--dark-pink);
  color: var(--deep-space);
  background: rgba(230, 163, 61, 0.1);
  box-shadow:
    0 0 0 3px var(--armed-glow),
    0 0 16px 5px rgba(230, 163, 61, 0.65); /* --armed-glow, #e6a33d */
}
```

(CSS custom properties can't carry alpha, hence the rgba-duplicate-with-comment pattern already
used in the candidate itself.) Porting these verbatim as inline styles:

**The armed ring must show on the playmat too** ("the ring still shows" — ticket 14's own text),
even though the playmat keeps its own plain-black border identity rather than joining the dashed-
pink family. `box-shadow` is a spread-outward-from-the-border-edge effect (unlike `border`, which
`box-sizing: border-box` draws *inside* the element's own bounds) — so it's the one part of this
treatment that survives being covered by the playmat's/library's opaque `image` overlay (which
sits at identical `x/y/w/h`, per ticket 03). That means the armed ring is additive on top of
whichever border identity a zone already has:

```ts
component(shape: MtgZoneShape) {
  const { w, h, zone, label } = shape.props;
  const playmat = zone === "playmat";
  const armed = useIsZoneArmed(this.editor, shape.id);

  const style: React.CSSProperties = playmat
    ? {
        width: w, height: h, boxSizing: "border-box",
        border: "10px solid black",              // untokenized on purpose — matches the Shuffler's mats
        borderRadius: h * 0.05,                    // computed from height, not a CSS %, not a fixed px
        color: "black",
      }
    : {
        width: w, height: h, boxSizing: "border-box",
        border: "2px dashed var(--dark-pink)",
        color: armed ? "var(--deep-space)" : "var(--dark-pink)",
        background: armed ? "rgba(230, 163, 61, 0.1)" : "rgba(187, 82, 119, 0.03)",
      };

  if (armed) {
    style.boxShadow = "0 0 0 3px var(--armed-glow), 0 0 16px 5px rgba(230, 163, 61, 0.65)";
  }

  return (
    <HTMLContainer id={shape.id}>
      <div style={{ ...style, fontFamily: "var(--font-chrome)", fontSize: 24, padding: 4 }}>
        {label}
      </div>
    </HTMLContainer>
  );
}
```

This is the one place the two style objects (base + `if (armed)`) both touch the same element
without both setting `boxShadow` — only the `if` branch ever sets it, so there's no accumulate-
across-rules risk (design choice 5's gotcha) even with the two-step assembly.

Building one complete style object per branch (not spreading two objects that each set
`boxShadow`) sidesteps the "box-shadow doesn't accumulate across cascading rules" gotcha (design
choice 5) — that gotcha is a CSS-cascade problem, confirmed by the owner not to transfer to a
single JS object. The playmat branch is unaffected by "armed" — ticket 11 accepts the tint being
invisible there (opaque image overlay) and Jess explicitly rejected forking the treatment by zone
kind, but the playmat's *own* border/radius identity (plain black, untokenized) stays distinct
from the dashed-pink family regardless of armed state, per the ticket's own text.

No zone-kind branching for the armed tint's playmat/library invisibility beyond what's already
structural (playmat has its own border identity) — one dashed-pink-family rule for every other
zone, per Jess's explicit call in ticket 11 ("accept the degradation rather than fork the
treatment").

`useIsZoneArmed` is a hook call inside `component()`, matching the sanctioned tldraw pattern
(confirmed: `ImageShapeUtil`, `FrameShapeUtil`, `GeoShapeUtil` etc. all call `useValue` directly
inside their own `component()`).

## 4. Test plan (verify-first)

User-visible change → Playwright. Extend `test/verification/verify-zone-entry.spec.ts` or add a
new spec: drag a card slowly (mouse down + move, no mouse up) over a zone, assert the zone's
rendered `box-shadow`/`background-color` changes to the armed look; mouse up, assert it reverts.
A second Playwright *context* (separate browser client on the same table) must NOT see the armed
style change on their own copy of the same zone shape while the first client's drag is in
progress — this is the "local-only, never synced" requirement, and it's the one part of this
ticket that's easy to get wrong silently (a bug that writes armed state to the store would still
pass a single-client visual test).

## Owners consulted before this plan

- `tabletop-shape-mechanics-context`: confirmed `editor.isIn("select.translating")` +
  `getSelectedShapeIds()` is correct and reactive-safe; confirmed `useValue` inside `component()`
  is the sanctioned tldraw pattern with precedent in stock ShapeUtils; recommended the shared
  per-editor computed over a naive per-zone rescan (O(zones) vs O(zones²) per pointer-move tick).
- `shuffler-looks-like-itself-context`: confirmed `--dark-pink`/`--armed-glow` are real tokens
  that resolve the same way `--font-chrome` already proved to (ticket 13); confirmed the
  box-shadow-doesn't-accumulate gotcha is a CSS-cascade problem that doesn't transfer to a single
  JS style object; confirmed ticket 11's "Answer" section is still current, nothing re-decided.
