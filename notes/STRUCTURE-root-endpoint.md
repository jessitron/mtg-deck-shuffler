# Root Endpoint Structure

## What happens when someone hits `/`

The root endpoint (`/`) is handled by Express's static file middleware, not by an explicit route handler in `app.ts`.

### Flow:

1. **Static File Serving**: The request matches the static file middleware configured on `app.ts:22`:
   ```typescript
   app.use(express.static(path.join(__dirname, "..", "public")));
   ```

2. **File Served**: Express serves `public/index.html`

3. **Page Content**: The HTML page contains:
   - Main landing page with "MTG Deck Shuffler" title
   - HTMX and Honeycomb tracing scripts
   - A div with `hx-get="/choose-deck"` that auto-loads on page load
   - Explanatory text about remote Magic gameplay
   - Footer with GitHub link

4. **Automatic HTMX Request**: The HTMX trigger `hx-trigger="load"` immediately makes a request to `/choose-deck` when the page loads, replacing the `#deck-input` div content with the deck selection form.

### Key Files:
- `src/app.ts:22` - Static file middleware configuration
- `public/index.html` - The actual page served for `/`
- `src/app.ts:26-39` - The `/choose-deck` endpoint that HTMX calls

### Result:
Users see the landing page with automatically-loaded deck selection interface, making it appear as a single integrated page while actually being composed of static HTML + dynamic HTMX content.