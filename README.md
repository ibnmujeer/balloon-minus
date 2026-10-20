# Pixel Balloon Pop - Subtraction

An 8-bit retro arcade educational math game designed for children. Players practice subtraction by popping floating balloons or tapping arcade control buttons. The game features vibrant pixel art, procedural chiptune sound effects, and full touch compatibility optimized for mobile phones and tablets.

## Features

* **Dual Input Mechanics**: Tap rising balloons directly on the canvas, or use the touch-optimized bottom arcade answer deck. Keyboard controls are also supported.
* **Progressive Difficulty**: Select from Easy (numbers 1 to 10), Medium (numbers 1 to 20), and Hard (numbers 1 to 100) difficulty tiers.
* **8-Bit Audio Engine**: Built-in procedural sound effects and looping chiptune background music powered by the Web Audio API without external audio assets.
* **PWA Support**: Fully installable as a Progressive Web App on mobile and desktop devices with offline support via a service worker.
* **Responsive Arcade UI/UX**: Features CRT scanline aesthetics, dynamic scaling for mobile portrait viewports, and delta-time normalized physics.

## File Structure

* `index.html`: Main game structure, HTML template, and screen overlays.
* `style.css`: Retro 8-bit styling, PICO-8 inspired color palette, and responsive layouts.
* `game.js`: Core game loop, canvas renderer, sound manager, and input handlers.
* `manifest.json`: Web app manifest for PWA installation.
* `sw.js`: Service worker for offline caching and relative asset routing.
* `icon.svg`: Scalable 8-bit pixel art app icon.

## Deploying to GitHub Pages

1. Place all project files (`index.html`, `style.css`, `game.js`, `manifest.json`, `sw.js`, `icon.svg`) in the root directory of your GitHub repository.
2. Go to your repository on GitHub and open **Settings**.
3. Select the **Pages** tab from the left sidebar menu.
4. Under **Build and deployment**, choose **Deploy from a branch**, select your main branch and the `/ (root)` folder, then click **Save**.
5. Your game will be live at `https://<username>.github.io/<repo-name>/`.