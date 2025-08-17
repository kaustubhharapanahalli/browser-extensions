# Text to Speech Reader Extensions

This repository contains browser extensions for Chrome and Safari that allow you to select text on any webpage and have it read aloud using text-to-speech technology.

## Features

Both extensions provide the following features:

- **Text Selection**: Select any text on a webpage and have it read aloud
- **Multiple TTS Providers**:
  - **Built-in TTS**: Chrome TTS API / Safari Web Speech API
  - **Gemini AI TTS**: Native text-to-speech with 30+ voice options (requires Gemini API key)
  - **Google Cloud TTS**: High-quality, realistic neural voices (requires Google Cloud API key)
- **Voice Control**: Choose from available system voices or Google Cloud neural voices
- **Speed & Pitch Control**: Adjust reading speed and pitch
- **Multiple Access Methods**:
  - Popup interface
  - Floating button (appears when text is selected)
  - Keyboard shortcuts
  - Right-click context menu
- **Settings Persistence**: Your voice, speed, and pitch preferences are saved

## Extensions

### Chrome Extension

- Uses Chrome's TTS API for built-in speech synthesis
- Gemini AI native TTS with 30+ voice options
- Google Cloud TTS API for realistic neural voices
- Manifest v3 format
- Keyboard shortcut: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)

### Safari Extension

- Uses Web Speech API for built-in speech synthesis
- Gemini AI native TTS with 30+ voice options
- Google Cloud TTS API for realistic neural voices
- Manifest v2 format
- Keyboard shortcut: `Cmd+Shift+R`
- Requires Safari's Extension Builder or Xcode for installation

## Quick Start

### Chrome Extension Installation

1. **Load the Extension**:
   - Open Chrome and go to `chrome://extensions/`
   - Enable "Developer mode" (toggle in top right)
   - Click "Load unpacked"
   - Select the `chrome-extension` folder

2. **Start Using**:
   - Click the extension icon in the toolbar
   - Select text on any webpage
   - Click "Read Selected Text"

### Safari Extension Installation

1. **Enable Developer Menu**:
   - Open Safari
   - Go to Safari > Preferences > Advanced
   - Check "Show Develop menu in menu bar"

2. **Load the Extension**:
   - Go to Develop > Show Extension Builder
   - Click the "+" button and select "Add Extension"
   - Navigate to the `safari-extension` folder and select it
   - Click "Run" to test the extension

3. **Enable the Extension**:
   - Go to Safari > Preferences > Extensions
   - Find "Text to Speech Reader" and enable it

## Gemini AI TTS Setup (Recommended)

For native text-to-speech with high-quality voices, you can use Gemini AI TTS:

### 1. Get a Gemini API Key

1. Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
2. Sign in with your Google account
3. Click "Create API Key"
4. Copy your API key

### 2. Configure Extension

1. Open the extension popup
2. Select "Gemini AI TTS (Native)" from the TTS Provider dropdown
3. Enter your Gemini API key in the "Gemini API Key" field
4. Choose from 30+ available voices with different characteristics
5. Your settings will be saved automatically

### 3. Available Voices

The extension supports all 30 Gemini TTS voices:

- **Kore, Orus, Alnilam** - Firm, authoritative voices
- **Zephyr, Autonoe** - Bright, energetic voices  
- **Puck, Laomedeia** - Upbeat, enthusiastic voices
- **Charon, Rasalgethi** - Informative, educational voices
- **Umbriel, Callirrhoe** - Easy-going, relaxed voices
- **Erinome, Iapetus** - Clear, articulate voices
- **Schedar** - Even, balanced voice
- **Achird** - Friendly, approachable voice
- **Sadachbia** - Lively, dynamic voice
- **Fenrir** - Excitable, passionate voice
- **Aoede** - Breezy, light voice
- **Enceladus** - Breathy, intimate voice
- **Algieba, Despina** - Smooth, polished voices
- **Algenib** - Gravelly, distinctive voice
- **Achernar** - Soft, gentle voice
- **Gacrux** - Mature, experienced voice
- **Pulcherrima** - Forward, direct voice
- **Zubenelgenubi** - Casual, conversational voice
- **Sadaltager** - Knowledgeable, expert voice
- **Sulafat** - Warm, comforting voice
- **Vindemiatrix** - Gentle, soothing voice

### 4. How It Works

- **Native TTS**: Uses Gemini's built-in text-to-speech capabilities
- **Exact Text**: Reads the exact selected text without modifications
- **High Quality**: Professional-grade speech synthesis
- **Voice Variety**: 30 different voices with unique characteristics
- **Language Support**: Automatically detects and supports 24 languages

### 5. Pricing

Gemini TTS has competitive pricing:

- **Free tier**: 15 requests per minute, 1500 requests per day
- **Paid tier**: $0.00025 per 1K characters (very affordable)

## Google Cloud TTS Setup (Optional)

For realistic, high-quality speech synthesis, you can use Google Cloud Text-to-Speech API:

### 1. Get a Google Cloud API Key

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Cloud Text-to-Speech API**:
   - Go to APIs & Services > Library
   - Search for "Cloud Text-to-Speech API"
   - Click "Enable"
4. Create API credentials:
   - Go to APIs & Services > Credentials
   - Click "Create Credentials" > "API Key"
   - Copy your API key

### 2. Configure Extensions

1. Open the extension popup
2. Select "Google Cloud TTS (Realistic)" from the TTS Provider dropdown
3. Enter your API key in the "Google Cloud API Key" field
4. Choose your preferred neural voice from the available options
5. Your settings will be saved automatically

### 3. Available Neural Voices

The extension supports Google Cloud's Neural2 voices:

- **Neural2-A to Neural2-J**: High-quality neural voices with different characteristics
- Each voice has unique tonal qualities and speaking styles
- Supports speed and pitch adjustments

### 4. Cloud Pricing

Google Cloud Text-to-Speech API has the following pricing (as of 2024):

- **Neural2 voices**: $16.00 per 1 million characters
- **Standard voices**: $4.00 per 1 million characters
- **WaveNet voices**: $16.00 per 1 million characters

For most users, this translates to very low costs (e.g., reading a typical article might cost less than $0.01).

## Usage

### Method 1: Popup Interface

1. Click the extension icon in the browser toolbar
2. Select text on the current webpage
3. Choose your preferred TTS provider (Built-in or Google Cloud)
4. Click "Read Selected Text" in the popup
5. Use the controls to adjust voice, speed, and pitch

### Method 2: Floating Button

1. Select text on any webpage
2. A floating 🔊 button will appear in the top-right corner
3. Click the button to read the selected text

### Method 3: Keyboard Shortcut

1. Select text on any webpage
2. Press the keyboard shortcut:
   - Chrome: `Ctrl+Shift+R` (Windows/Linux) or `Cmd+Shift+R` (Mac)
   - Safari: `Cmd+Shift+R`
3. The text will be read aloud

### Method 4: Context Menu

1. Select text on any webpage
2. Right-click the selected text
3. Choose "Read Selected Text" from the context menu

## Settings

Both extensions allow you to customize:

- **TTS Provider**: Choose between built-in TTS or Google Cloud TTS
- **Voice**: Choose from available system voices or neural voices
- **Speed**: Adjust reading speed (0.5x to 2x)
- **Pitch**: Adjust voice pitch (0.5x to 2x)

All settings are automatically saved and will be remembered across browser sessions.

## Technical Differences

| Feature           | Chrome Extension                  | Safari Extension                 |
| ----------------- | --------------------------------- | -------------------------------- |
| Built-in TTS      | Chrome TTS API                    | Web Speech API                   |
| Google Cloud TTS  | ✅ Supported                       | ✅ Supported                      |
| Manifest          | v3                                | v2                               |
| API Namespace     | `chrome`                          | `browser`                        |
| Installation      | Chrome Web Store / Developer Mode | Safari Extension Builder / Xcode |
| Keyboard Shortcut | Ctrl/Cmd+Shift+R                  | Cmd+Shift+R                      |

## Requirements

### Chrome Extension Requirements

- Google Chrome 88+ (for Manifest v3)
- System text-to-speech voices installed
- Google Cloud API key (optional, for neural voices)

### Safari Extension Requirements

- Safari 7.1+ (for Web Speech API support)
- macOS with text-to-speech voices installed
- Safari's Extension Builder or Xcode for development
- Google Cloud API key (optional, for neural voices)

## Troubleshooting

### Common Issues

1. **No voices available**:
   - Make sure your system has text-to-speech voices installed
   - On macOS: System Preferences > Accessibility > Speech
   - On Windows: Settings > Time & Language > Speech

2. **Extension not working**:
   - Try refreshing the webpage
   - Restart the browser
   - Check that the extension is enabled

3. **Audio not playing**:
   - Check your system's audio settings and volume
   - Ensure the browser has permission to play audio

4. **Keyboard shortcuts not working**:
   - Make sure no other applications are using the same shortcuts
   - Try refreshing the page after installing the extension

### Google Cloud TTS Issues

1. **API key not working**:
   - Verify your API key is correct
   - Check that the Cloud Text-to-Speech API is enabled
   - Ensure your Google Cloud project has billing enabled

2. **Voice not available**:
   - Some neural voices may not be available in all regions
   - Try selecting a different voice from the dropdown

3. **Rate limiting**:
   - Google Cloud TTS has rate limits
   - If you hit limits, wait a moment and try again

### Chrome-Specific Issues

- **Manifest v3 errors**: Make sure you're using Chrome 88+
- **TTS API not working**: Check Chrome's permissions for the extension

### Safari-Specific Issues

- **Web Speech API not supported**: Update to Safari 7.1+
- **Extension Builder issues**: Try using Xcode instead
- **Permission errors**: Check Safari's security settings

## Development

### Chrome Extension Development

1. Make changes to files in `chrome-extension/`
2. Go to `chrome://extensions/`
3. Click the refresh icon on the extension card
4. Test your changes

### Safari Extension Development

1. Make changes to files in `safari-extension/`
2. In Safari's Extension Builder, click "Run" to test
3. For distribution, build the project in Xcode

## Project Structure

```txt
ChromeExtensions/
├── chrome-extension/          # Chrome extension files
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   ├── content.css
│   ├── background.js
│   ├── icons/
│   └── README.md
├── safari-extension/          # Safari extension files
│   ├── manifest.json
│   ├── popup.html
│   ├── popup.js
│   ├── content.js
│   ├── content.css
│   ├── background.js
│   ├── icons/
│   └── README.md
└── README.md                  # This file
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test both extensions
5. Submit a pull request

## License

This project is open source and available under the MIT License.

## Support

If you encounter any issues or have questions:

1. Check the troubleshooting section above
2. Review the individual extension README files
3. Open an issue on GitHub with details about your problem
