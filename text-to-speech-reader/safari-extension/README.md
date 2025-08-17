# Text to Speech Reader - Safari Extension

A Safari extension that allows you to select text on any webpage and have it read aloud using text-to-speech technology with a modern sidebar interface.

## Features

- **Text Selection**: Select any text on a webpage and have it read aloud
- **Sidebar Interface**: Modern, persistent sidebar for easy access and control
- **Multiple TTS Providers**:
  - Safari TTS (Standard)
  - Gemini AI TTS (Realistic)
- **Voice Control**: Choose from available system voices or Gemini AI voices
- **Speed & Pitch Control**: Adjust reading speed and pitch
- **Audio Player Controls**: Play, pause, stop, and replay functionality
- **Multiple Access Methods**:
  - Sidebar interface (click extension icon)
  - Right-click context menu
  - Keyboard shortcuts
- **Settings Persistence**: Your voice, speed, and pitch preferences are saved
- **Offscreen Audio Playback**: Reliable audio playback using offscreen documents

## Installation

1. **Download the Extension**:
   - Clone or download this repository
   - Navigate to the `safari-extension` folder

2. **Load in Safari**:
   - Open Safari and go to Safari > Settings > Extensions
   - Enable "Developer mode" (toggle in bottom left)
   - Click "Add Extension"
   - Select the `safari-extension` folder

3. **Verify Installation**:
   - You should see the extension icon in your Safari toolbar
   - Click the icon to open the sidebar interface

## Usage

### Method 1: Sidebar Interface

1. Click the extension icon in the toolbar to open the sidebar
2. Select text on the current webpage
3. Click "Read Selected Text" in the sidebar
4. Use the audio player controls to manage playback
5. Adjust settings for voice, speed, and pitch

### Method 2: Context Menu

1. Select text on any webpage
2. Right-click the selected text
3. Choose "Read Selected Text" from the context menu
4. The sidebar will open automatically and start reading

## Settings

### TTS Provider

- **Safari TTS**: Uses Safari's built-in text-to-speech engine
- **Gemini AI TTS**: Uses Google's Gemini AI for more realistic speech (requires API key)

### Voice Settings

- **Safari TTS**: Choose from available system voices
- **Gemini AI TTS**: Choose from Gemini AI voices (Zephyr, Puck, Charon, etc.)

### Audio Controls

- **Speed**: Adjust reading speed (0.5x to 2x)
- **Pitch**: Adjust voice pitch (0.5x to 2x)

All settings are automatically saved and will be remembered across browser sessions.

## Gemini AI Setup

To use Gemini AI TTS:

1. Get an API key from [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Open the sidebar and select "Gemini TTS (Realistic)" as the provider
3. Enter your API key in the settings
4. Choose your preferred Gemini voice
5. Select text and click "Read Selected Text"

## Permissions

This extension requires the following permissions:

- `activeTab`: To access the current webpage
- `storage`: To save your preferences
- `tts`: To use Safari's text-to-speech API
- `contextMenus`: To create right-click context menu
- `offscreen`: To enable audio playback in offscreen documents
- `sidePanel`: To display the sidebar interface

## Troubleshooting

1. **No voices available**: Make sure your system has text-to-speech voices installed
2. **Extension not working**: Try refreshing the webpage or restarting Safari
3. **Audio not playing**: Check your system's audio settings and volume
4. **Sidebar not opening**: Make sure the extension is properly loaded and has the `sidePanel` permission
5. **Gemini API errors**:
   - Verify your API key is correct
   - Check that you have sufficient API quota
   - Ensure the API key has access to Gemini models
6. **"Cannot read properties of undefined (reading 'speak')" error**:
   - Make sure you've reloaded the extension after installation
   - Check that the extension has the `tts` permission
   - Try using Gemini TTS instead of Safari TTS
   - Check the browser console for additional error messages

## Development

To modify the extension:

1. Make your changes to the source files
2. Go to Safari > Settings > Extensions
3. Click the refresh icon on the extension card
4. Test your changes

## Files Structure

```txt
safari-extension/
├── manifest.json          # Extension configuration
├── sidebar.html           # Sidebar interface
├── sidebar.js             # Sidebar functionality
├── sidebar.css            # Sidebar styles
├── content.js             # Content script for web pages
├── background.js          # Background service worker
├── offscreen.html         # Offscreen document for audio playback
├── offscreen.js           # Offscreen audio handling
├── icons/                 # Extension icons
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # This file
```

## License

This project is open source and available under the MIT License.
