# Golden Master Testing for HTML Formatting

## Overview

Golden master testing (also known as snapshot testing) will capture the current HTML output of our view formatting functions and detect any unintended changes during refactoring. Then we can refactor the view functions.

The snapshot tests will let the user see HTML changes succinctly when we are implementing new features.

The snapshot tests should be run after each change, but only the user is authorized to update the snapshots. That's what they're for, to get the user to look at the changes.

## Plan of Attack

Start by implementing one test, for the view method called by "/", which is formatHomepageHtml. That's the simplest one.
The input to formatHomepageHtml is the list of available decks. That's a simple data structure. Add a few fake decks and call the function.
