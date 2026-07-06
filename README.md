# Netflix Leaving Soon

A lightweight browser extension that scans your Netflix watchlist to identify titles scheduled for removal.

## Supported Browsers

- **Firefox:** Fully supported and published to the official marketplace.
- **Chrome / Chromium:** Unpublished but fully supported using the same codebase.

## Installation

The easiest way to use the scanner is to install the official Firefox Add-on:

1. Visit the [Netflix Leaving Soon Add-on page](https://addons.mozilla.org/firefox/addon/netflix-leaving-soon/).
2. Click **Add to Firefox**.
3. Log into Netflix and navigate to your **My List** page.
4. Click the extension icon to scan the page.

## Features

- **On-Demand Scanning:** Runs only when you click the extension icon, preserving your browser's speed and memory.
- **Automated Scrolling:** Automatically scrolls through your entire list to capture hidden or unloaded titles.
- **Smart Filtering:** Removes duplicate entries so you get a clean, organised list of what is leaving.
- **Secure Quick Links:** Click any scanned title to safely open its Netflix page in a new tab.

## Local Development

This extension uses a single codebase and a unified `manifest.json` for both Firefox and Chrome. To load the extension locally for development:

### Firefox

1. Open Firefox and navigate to `about:debugging`.
2. Click **This Firefox**.
3. Click **Load Temporary Add-on**.
4. Select the `manifest.json` file in the root directory.

### Chrome / Chromium

1. Open your browser and navigate to `chrome://extensions/`.
2. Enable **Developer mode** via the toggle switch in the top right corner.
3. Click **Load unpacked**.
4. Select the root project directory.

## Architecture

The project follows a standard Model-View-Controller (MVC) pattern:

- **`background.js`:** Manages extension state and dynamically injects content scripts to prevent background resource usage.
- **`controller.js`:** Handles auto-scrolling to bypass lazy loading and coordinates between the model and view.
- **`model.js`:** Parses the DOM using the `data-ui-tracking-context` attribute for reliable data extraction against changing CSS classes.
- **`view.js`:** Builds and renders the UI using a custom DOM helper function, keeping the project dependency-free.
