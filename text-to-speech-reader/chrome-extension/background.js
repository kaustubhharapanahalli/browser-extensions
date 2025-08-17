// Background service worker for text-to-speech extension

// --- OFFSCREEN DOCUMENT HELPERS ---

let creating; // To prevent multiple creation attempts

async function setupOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });

  if (existingContexts.length > 0) return;
  if (creating) await creating;
  else {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Playback of text-to-speech audio",
    });
    await creating;
    creating = null;
  }
}

async function stopAudioOffscreen() {
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
  } else if (request.action === "stopAudio") {
    stopAudioOffscreen().then(() => sendResponse({ success: true }));
    return true;
  }
});

// --- TTS FUNCTIONS ---

function speakText(text) {
  chrome.storage.sync.get(["voice", "rate", "pitch"], (result) => {
    chrome.tts.speak(text, {
      voiceName: result.voice || undefined,
      rate: result.rate || 1,
      pitch: result.pitch || 1,
      onEvent: (event) => {
        if (event.type === "error")
          console.error("TTS Error:", event.errorMessage);
      },
    });
  });
}

/**
 * Speaks text using the Gemini Text-to-Speech API.
 * This function fetches the audio and passes the raw data to the offscreen document for playback.
 * @param {string} text The text to speak.
 * @param {string} apiKey The user's Gemini API key.
 * @param {string} voice The selected voice name.
 * @param {function} sendResponse The callback to send the result to the caller.
 */
async function speakWithGemini(text, apiKey, voice, sendResponse) {
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;

  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: text }],
          },
        ],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: { voiceName: voice },
            },
          },
        },
        model: "gemini-2.5-flash-preview-tts",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `API Error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();
    const audioPart = data?.candidates?.[0]?.content?.parts?.[0];
    const audioData = audioPart?.inlineData?.data; // This is a base64 string
    const mimeType = audioPart?.inlineData?.mimeType;

    if (audioData && mimeType && mimeType.startsWith("audio/")) {
      const sampleRateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = sampleRateMatch
        ? parseInt(sampleRateMatch[1], 10)
        : 24000;

      // **FIX:** Send raw data to the offscreen document for processing and playback.
      await setupOffscreenDocument("offscreen.html");
      await chrome.runtime.sendMessage({
        action: "playGeminiAudio",
        audioData, // base64 string
        sampleRate,
      });

      sendResponse({ success: true });
    } else {
      throw new Error("No audio content in API response.");
    }
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// --- CONTEXT MENU AND INSTALL LISTENERS ---

chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.set({
    ttsProvider: "chrome",
    voice: "",
    rate: 1,
    pitch: 1,
    geminiApiKey: "",
  });

  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Read Selected Text",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    speakText(info.selectionText);
  }
});
