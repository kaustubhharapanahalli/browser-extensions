// Background service worker for text-to-speech extension

// --- OFFSCREEN DOCUMENT HELPERS ---

let creating; // To prevent multiple creation attempts

/**
 * Sets up and ensures the offscreen document is running for audio playback.
 * @param {string} path The path to the offscreen document's HTML file.
 */
async function setupOffscreenDocument(path) {
  // Check if we have an existing offscreen document
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) {
    return;
  }

  // Avoid creating a new document if one is already in the process of being created
  if (creating) {
    await creating;
  } else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Playback of text-to-speech audio",
    });
    await creating;
    creating = null;
  }
}

/**
 * Sends audio data to the offscreen document for playback.
 * @param {string} dataUrl The base64-encoded audio data URL.
 */
async function playAudioOffscreen(dataUrl) {
  await setupOffscreenDocument("offscreen.html");
  await chrome.runtime.sendMessage({ action: "playAudio", dataUrl });
}

/**
 * Sends a message to the offscreen document to stop any currently playing audio.
 */
async function stopAudioOffscreen() {
  // Check if an offscreen document even exists before trying to send a message.
  const offscreenUrl = chrome.runtime.getURL("offscreen.html");
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) {
    await chrome.runtime.sendMessage({ action: "stopAudio" });
  }
}

// --- MESSAGE LISTENER ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "speakText") {
    speakText(request.text);
  } else if (request.action === "speakWithGemini") {
    speakWithGemini(request.text, request.apiKey, request.voice, sendResponse);
    return true; // Keep channel open for async response
  } else if (request.action === "speakWithGoogleCloud") {
    speakWithGoogleCloud(
      request.text,
      request.apiKey,
      request.voice,
      request.rate,
      request.pitch,
      sendResponse
    );
    return true; // Keep channel open for async response
  } else if (request.action === "stopAudio") {
    stopAudioOffscreen().then(() => sendResponse({ success: true }));
    return true;
  }
});

// --- TTS FUNCTIONS ---

/**
 * Speaks text using the built-in Chrome TTS API.
 * @param {string} text The text to speak.
 */
function speakText(text) {
  chrome.storage.sync.get(["voice", "rate", "pitch"], (result) => {
    chrome.tts.speak(text, {
      voiceName: result.voice || undefined,
      rate: result.rate || 1,
      pitch: result.pitch || 1,
      onEvent: (event) => {
        if (event.type === "error") {
          console.error("TTS Error:", event.errorMessage);
        }
      },
    });
  });
}

/**
 * Speaks text using Google's Text-to-Speech API (suitable for Gemini/Studio voices).
 * @param {string} text The text to speak.
 * @param {string} apiKey The user's Google Cloud API key.
 * @param {string} voice The selected voice name.
 * @param {function} sendResponse The callback to send the result to the caller.
 */
async function speakWithGemini(text, apiKey, voice, sendResponse) {
  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1beta1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: text },
          voice: { languageCode: "en-US", name: voice },
          audioConfig: { audioEncoding: "MP3" },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API Error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    if (data.audioContent) {
      const dataUrl = `data:audio/mp3;base64,${data.audioContent}`;
      await playAudioOffscreen(dataUrl);
      sendResponse({ success: true });
    } else {
      throw new Error("No audio content in API response.");
    }
  } catch (error) {
    console.error("Gemini/TTS Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

/**
 * Speaks text using the Google Cloud Text-to-Speech API.
 * @param {string} text The text to speak.
 * @param {string} apiKey The user's Google Cloud API key.
 * @param {string} voice The selected voice name (e.g., 'Wavenet-A').
 * @param {number} rate The speaking rate.
 * @param {number} pitch The speaking pitch.
 * @param {function} sendResponse The callback to send the result to the caller.
 */
async function speakWithGoogleCloud(
  text,
  apiKey,
  voice,
  rate,
  pitch,
  sendResponse
) {
  try {
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1/text:synthesize?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          input: { text: text },
          voice: { languageCode: "en-US", name: `en-US-${voice}` },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: rate,
            pitch: pitch,
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API Error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    if (data.audioContent) {
      const dataUrl = `data:audio/mp3;base64,${data.audioContent}`;
      await playAudioOffscreen(dataUrl);
      sendResponse({ success: true });
    } else {
      throw new Error("No audio content received from API.");
    }
  } catch (error) {
    console.error("Google Cloud TTS Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// --- CONTEXT MENU AND INSTALL LISTENERS ---

chrome.runtime.onInstalled.addListener(() => {
  console.log("Text to Speech Reader extension installed.");
  // Set default values on installation
  chrome.storage.sync.set({
    ttsProvider: "chrome",
    voice: "",
    rate: 1,
    pitch: 1,
    geminiApiKey: "",
    googleCloudApiKey: "",
  });

  // Create context menu item
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Read Selected Text",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    // By default, context menu uses the simple Chrome TTS
    speakText(info.selectionText);
  }
});
