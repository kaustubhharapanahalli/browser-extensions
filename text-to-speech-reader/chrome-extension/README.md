# Text to Speech Reader - Chrome Extension

A Chrome extension that allows you to select text on any webpage and have it read aloud using text-to-speech technology.

## Features

- **Text Selection**: Select any text on a webpage and have it read aloud
- **Voice Control**: Choose from available system voices
- **Speed & Pitch Control**: Adjust reading speed and pitch
- **Multiple Access Methods**:
  - Popup interface
  - Floating button (appears when text is selected)
  - Keyboard shortcut (Ctrl+Shift+R or Cmd+Shift+R)
  - Right-click context menu
- **Settings Persistence**: Your voice, speed, and pitch preferences are saved

## Installation

1. **Download the Extension**:
   - Clone or download this repository
   - Navigate to the `chrome-extension` folder

2. **Load in Chrome**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

3. **Verify Installation**:
   - You should see the extension icon in your Chrome toolbar
   - Click the icon to open the popup interface

## Usage

### Method 1: Popup Interface

1. Click the extension icon in the toolbar
2. Select text on the current webpage
3. Click "Read Selected Text" in the popup
4. Use the controls to adjust voice, speed, and pitch

### Method 2: Floating Button

1. Select text on any webpage
2. A floating 🔊 button will appear in the top-right corner
3. Click the button to read the selected text

### Method 3: Keyboard Shortcut

1. Select text on any webpage
2. Press `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
3. The text will be read aloud

### Method 4: Context Menu

1. Select text on any webpage
2. Right-click the selected text
3. Choose "Read Selected Text" from the context menu

## Settings

- **Voice**: Choose from available system voices
- **Speed**: Adjust reading speed (0.5x to 2x)
- **Pitch**: Adjust voice pitch (0.5x to 2x)

All settings are automatically saved and will be remembered across browser sessions.

## Permissions

This extension requires the following permissions:

- `activeTab`: To access the current webpage
- `scripting`: To inject content scripts
- `storage`: To save your preferences
- `tts`: To use Chrome's text-to-speech API

## Troubleshooting

1. **No voices available**: Make sure your system has text-to-speech voices installed
2. **Extension not working**: Try refreshing the webpage or restarting Chrome
3. **Audio not playing**: Check your system's audio settings and volume
4. **"Cannot read properties of undefined (reading 'speak')" error**:
   - Make sure you've reloaded the extension after installation
   - Check that the extension has the `tts` permission
   - Try using Google Cloud TTS instead of Chrome TTS
   - Check the browser console for additional error messages
5. **Chrome TTS API not available**: 
   - This usually means the extension needs to be reloaded
   - Go to `chrome://extensions/` and click the refresh icon on the extension
   - Or try using Google Cloud TTS as an alternative

## Development

To modify the extension:

1. Make your changes to the source files
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

## Files Structure

```txt
chrome-extension/
├── manifest.json          # Extension configuration
├── popup.html            # Popup interface
├── popup.js              # Popup functionality
├── content.js            # Content script for web pages
├── content.css           # Styles for content script
├── background.js         # Background service worker
├── icons/                # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md             # This file
```

## License

This project is open source and available under the MIT License.
