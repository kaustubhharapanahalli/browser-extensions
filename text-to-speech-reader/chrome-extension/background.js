// Background service worker for text-to-speech extension

// --- OFFSCREEN DOCUMENT HELPERS ---

let creating; // To prevent multiple creation attempts

// Function to setup and ensure the offscreen document is running
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

// Function to send audio data to the offscreen document for playback
async function playAudioOffscreen(dataUrl) {
  await setupOffscreenDocument("offscreen.html");
  await chrome.runtime.sendMessage({ action: "playAudio", dataUrl });
}

async function stopAudioOffscreen() {
  await setupOffscreenDocument("offscreen.html");
  await chrome.runtime.sendMessage({ action: "stopAudio" });
}

// --- MESSAGE LISTENER ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "speakText") {
    // This uses the built-in chrome.tts which is fine
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

// --- TTS FUNCTIONS (MODIFIED) ---

// Function to speak text using Chrome TTS API (Unchanged)
function speakText(text) {
  chrome.storage.sync.get(["voice", "rate", "pitch"], (result) => {
    const settings = {
      voiceName: result.voice || undefined,
      rate: result.rate || 1,
      pitch: result.pitch || 1,
    };
    chrome.tts.speak(text, settings, (event) => {
      if (chrome.runtime.lastError) {
        console.error("TTS Error:", chrome.runtime.lastError);
      }
    });
  });
}

// CORRECTED function to speak text using Gemini AI's dedicated TTS model
async function speakWithGemini(text, apiKey, voice, sendResponse) {
  try {
    // This is the dedicated endpoint for Text-to-Speech synthesis
    const response = await fetch(
      `https://texttospeech.googleapis.com/v1beta/text:synthesize?key=${apiKey}`,
      // Note: For simplicity and consistency, the Gemini TTS model can be called via the standard texttospeech endpoint.
      // Alternatively, if you have access to newer Gemini-specific endpoints, the structure might differ.
      // This approach is robust and uses the same infra as Google Cloud TTS but with newer models.
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          // The text to be synthesized
          input: {
            text: text,
          },
          // Voice selection parameters
          voice: {
            // The language code is crucial
            languageCode: "en-US",
            // The 'voice' parameter from the popup will be the full voice name
            name: voice,
          },
          // Audio configuration
          audioConfig: {
            // We'll request MP3 for consistency and smaller file size
            audioEncoding: "MP3",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(
        `Gemini/TTS API Error: ${
          errorData.error?.message || response.statusText
        }`
      );
    }

    const data = await response.json();

    // The response structure is the same as the Google Cloud TTS API
    if (data.audioContent) {
      // Create a data URL from the base64 MP3 content
      const dataUrl = `data:audio/mp3;base64,${data.audioContent}`;
      await playAudioOffscreen(dataUrl);
      sendResponse({ success: true });
    } else {
      console.error("No audio content in Gemini/TTS response:", data);
      throw new Error("No audio content received from Gemini/TTS API");
    }
  } catch (error) {
    console.error("Gemini/TTS Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Updated function to speak text using Google Cloud Text-to-Speech API
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
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          input: {
            text: text,
          },
          voice: {
            languageCode: "en-US",
            name: `en-US-${voice}`, // Simplified voice name for clarity
          },
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
        `TTS API Error: ${errorData.error?.message || response.statusText}`
      );
    }

    const data = await response.json();

    if (data.audioContent) {
      // Create a data URL from the base64 MP3 content
      const dataUrl = `data:audio/mp3;base64,${data.audioContent}`;
      await playAudioOffscreen(dataUrl);
      sendResponse({ success: true });
    } else {
      throw new Error("No audio content received from TTS API");
    }
  } catch (error) {
    console.error("TTS API Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// --- CONTEXT MENU AND INSTALL LISTENERS (Mostly Unchanged) ---

chrome.runtime.onInstalled.addListener(() => {
  console.log("Text to Speech Reader extension installed");
  chrome.storage.sync.set({
    voice: "",
    rate: 1,
    pitch: 1,
  });
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Read Selected Text",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText") {
    // By default, context menu uses the simple Chrome TTS
    speakText(info.selectionText);
  }
});
