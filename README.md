# Empathy Atlas

Warm, single-page guide to empathy with interactive practice tools, short field notes, and a science primer. Built with plain HTML, CSS, and JavaScript—no build step required.

## What’s inside
- Hero, meaning, fieldwork, science, tensions, practice, gallery, and references sections tuned for readability and accessibility (skip link, ARIA labels, keyboardable tabs/accordions).
- Theme toggle (light/dark/auto) and motion toggle that respect system preferences.
- Practice area with two guidance sliders, randomized micro-tasks, weekly log modal, and confetti feedback; everything saves to `localStorage` on-device only.
- Audio reflection buttons (Web Audio API) plus copy-to-clipboard for citations.
- Responsive layout with dual style layers (`css/styles.css`, `css/styles2.css`) and two JS bundles for behavior (`js/script.js`, `js/script2.js`).

## Run locally
Open `index.html` in your browser—no dependencies. For a quick server, from the repo root run `python -m http.server` and visit the shown localhost port.
