# Snapshot Tests Removed

**Date**: 2026-01-05

## What was removed

- All HTML snapshot test files from `test/snapshot/`:
  - `card-modal-html.snapshot.test.ts`
  - `error-page-html.snapshot.test.ts`
  - `game-html.snapshot.test.ts`
  - `game-page-html.snapshot.test.ts`
  - `history-modal-html.snapshot.test.ts`
  - `library-modal-html.snapshot.test.ts`
  - `table-modal-html.snapshot.test.ts`
- All snapshot data files (18 HTML files in `test/snapshot/snapshots/`)
- npm scripts: `test:snapshot`, `test:snapshot:update`, `test:snapshot:diff`

## Why they were removed

The snapshot tests weren't providing value at this stage of development:

1. **High maintenance burden**: Every UI change required manual snapshot updates, creating friction in the development workflow
2. **Unclear signal**: Snapshot diffs showed *what* changed but didn't indicate *whether* the change was correct
3. **Not preventing bugs**: The tests caught CSS and markup changes but didn't validate functional correctness
4. **Better verification exists**: End-to-end verification tests (`test/verification/*.spec.ts`) provide more meaningful validation of user-facing behavior

## Future considerations

Snapshot tests may be useful later, but with a different approach:

- **Component-level snapshots**: Test individual components rather than entire pages
- **Semantic assertions**: Focus on data-* attributes and semantic structure rather than full HTML
- **Visual regression testing**: Tools like Percy or Chromatic for actual visual validation
- **Critical paths only**: Only snapshot truly stable, critical UI elements

For now, rely on:
- End-to-end verification tests for user flows
- Unit tests for business logic
- Manual testing for visual changes
