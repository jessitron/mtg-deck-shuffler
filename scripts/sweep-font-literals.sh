#!/bin/bash
# One-shot sweep: replace hand-written font-family literals in the Shuffler's
# stylesheets with the fleet's role tokens (@fleet/design-tokens).
#
# Kept as a script rather than run as a shell one-liner so the exact
# substitutions are reviewable, and so a stray variant shows up as a leftover
# rather than being silently missed.
#
# NOT swept: `monospace` and `inherit`, which are genuine one-offs, and
# design-gallery.css, which is gallery chrome that must never be copied into
# the app — but it renders the specimens, so it uses the tokens too.
#
# Deliberate convergence: styles.css's `body` had `"Ovo", Arial, sans-serif`
# while every other Ovo site said `"Ovo", serif`. The token settles it as
# `"Ovo", serif`. Only visible if Ovo fails to load, and having one answer is
# the point of the token.

set -euo pipefail

cd "$(dirname "$0")/../apps/shuffler/public"

for f in *.css; do
  # Both quote styles were in use.
  sed -i '' \
    -e 's/font-family: "Orbitron", sans-serif;/font-family: var(--font-chrome);/g' \
    -e "s/font-family: 'Orbitron', sans-serif;/font-family: var(--font-chrome);/g" \
    -e 's/font-family: "Ovo", Arial, sans-serif;/font-family: var(--font-content);/g' \
    -e 's/font-family: "Ovo", serif;/font-family: var(--font-content);/g' \
    -e "s/font-family: 'Ovo', serif;/font-family: var(--font-content);/g" \
    -e 's/font-family: "Risque", cursive;/font-family: var(--font-display);/g' \
    -e "s/font-family: 'Risque', cursive;/font-family: var(--font-display);/g" \
    "$f"
done

echo "Swept. Any remaining typeface literals (should be none):"
grep -rn "Orbitron\|Ovo\|Risque" ./*.css || echo "  (none)"
