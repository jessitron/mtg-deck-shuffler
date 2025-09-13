# Template Structure Analysis

Status: considering

After notes/STRUCTURE-view-organization.md is implemented, I might not want this.
The benefit of templates is html highlighting. Can I get that in vscode without moving the html out of the code?

## Current State

The `src/html-formatters.ts` file has grown quite large with lots of repetitive HTML generation. It's time to break this out into a more maintainable template structure.

## Recommendations

### 1. Extract Card Components

The card rendering logic is duplicated across multiple functions:

```typescript
export function renderCardImage(card: any, cssClass: string, animationClass = "") {
  return `<img src="${getCardImageUrl(card.uid)}" 
           alt="${card.name}" 
           class="mtg-card-image ${cssClass}${animationClass}" 
           title="${card.name}" />`;
}

export function renderCardButtons(gameId: string, gameCardIndex: number, buttonType: "hand" | "revealed") {
  // Common button logic
}
```

### 2. Extract Modal Template

Both `formatLibraryModalHtml` and `formatTableModalHtml` share the same modal structure:

```typescript
export function renderModal(title: string, content: string, subtitle?: string) {
  return `<div class="modal-overlay" hx-get="/close-modal" ...>
    <div class="modal-dialog">
      <div class="modal-header">
        <h2 class="modal-title">${title}</h2>
        <button class="modal-close" ...>&times;</button>
      </div>
      <div class="modal-body">
        ${subtitle ? `<p style="...">${subtitle}</p>` : ""}
        ${content}
      </div>
    </div>
  </div>`;
}
```

### 3. Extract Game Layout Components

The game container structure is repeated:

```typescript
export function renderGameContainer(content: string) {
  return `<div id="game-container">${content}</div>`;
}

export function renderCommandZone(commanders: any[]) {
  // Commander rendering logic
}

export function renderGameDetails(game: GameState) {
  // Game details section
}
```

### 4. Consider a Template Engine

For even cleaner separation, consider using a lightweight template engine like `mustache` or `handlebars`:

```mustache
<div id="game-container">
  {{> command-zone}}
  {{> game-details}}
  {{> library-section}}
  {{#hasRevealedCards}}{{> revealed-cards}}{{/hasRevealedCards}}
  {{> hand-section}}
</div>
```

## Benefits

- **Maintainability**: Easier to update common UI patterns
- **Consistency**: Ensures consistent HTML structure
- **Testability**: Can unit test template logic separately
- **Readability**: Main formatter functions become much cleaner

## Implementation Plan

1. Create `src/templates/` directory
2. Extract card components first (most duplicated)
3. Extract modal template
4. Extract game layout components
5. Refactor `html-formatters.ts` to use new templates
6. Consider template engine if string concatenation becomes unwieldy

The current approach works but is getting unwieldy. Breaking it out now will make future UI changes much easier to manage.
