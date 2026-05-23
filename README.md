# Ufora Shortcuts

A Chrome extension that adds keyboard shortcuts to Ufora to make navigating videos and the interface faster and easier.

<p align="center">
  <img src="./media/icon-v1.png" alt="Render of version 1 of the 3D logo I made in Blender 😄." width="280" />
  <img src="./media/icon-1920.png" alt="Render of version 2 of the 3D logo U made in Blender 😄." width="280" />
</p>

## Installation

For now, it's not yet uploaded to the Chrome Web Store (will be available soon).

1. Clone or download this repository
2. Open `chrome://extensions/` in your browser
3. Enable "Developer mode" (toggle in the top right)
4. Click "Load unpacked" and select this folder
5. Done! The extension is now active on (only) ufora.ugent.be

## UI Shortcuts

Save a lot of time with these preset UI shortcuts and by adding custom shortcuts (by pressing **Alt** when the courses menu is open):

- **Alt** - Hold to see keyboard shortcut labels on buttons
- **c** - Open the courses menu
    - combine with other custom letters to quickly go to course
- **u** - Open notifications

## Video Shortcuts

When watching a video on Ufora:

- **Space** - Play / Pause
- **Left/Right Arrow** - Skip 5 seconds backwards/forwards
- **Up/Down Arrow** - Increase/decrease volume
- **f** - Toggle fullscreen
- **m** - Mute/unmute

## How It Works

The extension injects a content script into Ufora pages that listens for keyboard events and controls the video player or triggers UI actions. It's smart about not interfering when you're typing in text fields.

## Notes

The extension only works on `https://ufora.ugent.be/*`, so it only runs when necessary.

## License

This project is proprietary and all rights are reserved. In short: unauthorized copying, modification, distribution, or use of this code without my permission is strictly prohibited. See the [LICENSE](LICENSE) file for details.

## Developer todo's

[x] Add localhost for support of custom shortcuts
[x] Make custom shortcuts work (+faster via direct redirect)
[x] Give video shortcuts priority over custom (course) shortcuts

## Build & packaging

A small helper is included to minify JS/CSS, assemble a `dist` folder and create a ZIP suitable for publishing.

- Install dev dependencies:

```bash
npm install
```

- Build and create zip:

```bash
npm run build
```

The script will create `dist/` and a zip file named based on `manifest.json` (e.g. `Ufora Shortcuts-1.0.0.zip`).
