# Before/After Comparison: Modal Closing Behavior

## User Flow

### Scenario
1. User opens the library search modal
2. User clicks on a card name to open the card modal
3. User clicks an action button (e.g., "Reveal", "Put in Hand")

## Before the Fix

### What Happened
- ❌ Card modal closes
- ❌ Library modal **remains open**
- ❌ User must manually close the library modal
- ❌ Updated game state is obscured by the open modal

### Code
```html
<button class="modal-action-button reveal-button"
        hx-post="/reveal-card/123/0"
        hx-target="#game-container"
        hx-swap="outerHTML"
        hx-on::after-request="htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'})"
        title="Move card to revealed">
  Reveal
</button>
```

### User Experience Issues
1. **Confusing**: User doesn't know if the action was successful
2. **Extra steps**: User must manually close the library modal
3. **Obscured view**: Can't see the updated game state
4. **Inconsistent**: Different behavior than expected

## After the Fix

### What Happens
- ✅ Card modal closes
- ✅ Library modal **also closes**
- ✅ User can immediately see the updated game state
- ✅ Clean, intuitive workflow

### Code
```html
<button class="modal-action-button reveal-button"
        hx-post="/reveal-card/123/0"
        hx-target="#game-container"
        hx-swap="outerHTML"
        hx-on::after-request="htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'}); htmx.ajax('GET', '/close-modal', {target: '#modal-container', swap: 'innerHTML'})"
        title="Move card to revealed">
  Reveal
</button>
```

### User Experience Improvements
1. **Clear feedback**: Both modals close, confirming the action
2. **No extra steps**: Everything happens automatically
3. **Immediate visibility**: Updated game state is visible right away
4. **Consistent**: Matches user expectations

## Technical Details

### The Fix
Added a second HTMX AJAX call to close the library/table modal:

```javascript
// Close card modal
htmx.ajax('GET', '/close-card-modal', {target: '#card-modal-container', swap: 'innerHTML'});

// Close library/table modal
htmx.ajax('GET', '/close-modal', {target: '#modal-container', swap: 'innerHTML'})
```

### Why It Works
- Both AJAX calls execute sequentially after the action completes
- If the library/table modal isn't open, the second call has no effect
- If it is open, it closes properly
- The game state updates before the modals close, so the user sees the result

### Affected Actions
This fix applies to all action buttons in card modals:

| Location | Actions |
|----------|---------|
| Library Cards | Reveal, Put in Hand |
| Revealed Cards | Play, Put in Hand, Put on Top, Put on Bottom |
| Hand Cards | Play, Put down |
| Table Cards | Return |

## Visual Comparison

### Before
```
[Library Modal Open]
  └─ [Card Modal Open]
       └─ User clicks "Reveal"
            └─ [Card Modal Closes]
                 └─ [Library Modal STILL OPEN] ❌
                      └─ User must manually close
```

### After
```
[Library Modal Open]
  └─ [Card Modal Open]
       └─ User clicks "Reveal"
            └─ [Card Modal Closes]
                 └─ [Library Modal Closes] ✅
                      └─ Clean game view
```

## Testing

### Automated Tests
```bash
npm test              # All unit tests pass
npm run test:snapshot # All snapshot tests pass
```

### Manual Testing
See `MANUAL_TEST.md` for detailed manual testing steps.

## Conclusion

The fix provides a much better user experience by automatically closing both modals when an action is performed. This matches user expectations and eliminates the need for manual cleanup.
