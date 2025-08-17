// Background service worker for text-to-speech extension

let speakingTabId = null; // Tracks the tab ID for Safari TTS playback

// --- SIDE PANEL MANAGEMENT ---
browser.action.onClicked.addListener((tab) => {
  browser.sidePanel.open({ windowId: tab.windowId });
});

// --- MESSAGE RELAY ---
browser.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.url?.includes("offscreen.html")) {
    browser.runtime.sendMessage(request); // Forward messages from offscreen to sidebar
    return true;
  }

  switch (request.action) {
    case "speakText":
      // FIX: If the message is from the sidebar, sender.tab is undefined.
      // We must query for the active tab to get the correct context.
      if (!sender.tab) {
        browser.tabs
          .query({ active: true, currentWindow: true })
          .then((tabs) => {
            if (tabs[0]) {
              handleSpeakText(request.text, tabs[0]);
            } else {
              console.error("Could not find active tab to speak on.");
            }
          });
      } else {
        // If the message is from a content script, sender.tab is available.
        handleSpeakText(request.text, sender.tab);
      }
      break;
    case "audioControl":
      handleAudioControl(request);
      break;
    case "readFromContentScript":
      handleReadFromContentScript(request.text, sender.tab);
      break;
  }
  return true; // Indicates an async response
});

/**
 * Handles audio control messages, directing them to the correct TTS engine.
 * @param {object} request The audio control request.
 */
async function handleAudioControl(request) {
  const { ttsProvider } = await browser.storage.sync.get("ttsProvider");
  if (ttsProvider === "gemini") {
    await setupOffscreenDocument("offscreen.html");
    // The message is broadcast globally, and the offscreen script will pick it up.
    browser.runtime.sendMessage(request);
  } else {
    // Handle Safari TTS controls directly and send UI updates.
    if (request.control === "stop") {
      if ("speechSynthesis" in window) {
        speechSynthesis.cancel(); // This will trigger an 'end' event.
      }
    }
    if (request.control === "pause") {
      if ("speechSynthesis" in window) {
        speechSynthesis.pause();
        browser.runtime.sendMessage({
          action: "audioStateChange",
          state: "paused",
        });
      }
    }
    if (request.control === "resume") {
      if ("speechSynthesis" in window) {
        speechSynthesis.resume();
        browser.runtime.sendMessage({
          action: "audioStateChange",
          state: "playing",
        });
      }
    }
  }
}

/**
 * Opens the side panel and initiates speech from a content script action.
 * @param {string} text The text to be spoken.
 * @param {browser.tabs.Tab} tab The tab where the action was initiated.
 */
async function handleReadFromContentScript(text, tab) {
  await browser.sidePanel.open({ tabId: tab.id });
  handleSpeakText(text, tab);
}

/**
 * Determines which TTS engine to use based on stored settings.
 * @param {string} text The text to be spoken.
 * @param {browser.tabs.Tab} tab The tab that initiated the request.
 */
async function handleSpeakText(text, tab) {
  const {
    ttsProvider,
    geminiApiKey,
    geminiVoice,
  } = await browser.storage.sync.get([
    "ttsProvider",
    "geminiApiKey",
    "geminiVoice",
  ]);
  if (ttsProvider === "gemini" && geminiApiKey) {
    speakWithGemini(text, geminiApiKey, geminiVoice);
  } else {
    speakWithSafariTTS(text, tab);
  }
}

// --- TTS FUNCTIONS ---

function speakWithSafariTTS(text, tab) {
  browser.storage.sync.get(["voice", "rate", "pitch"]).then((result) => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(text);

      // Set voice
      const voices = speechSynthesis.getVoices();
      if (result.voice) {
        const selectedVoice = voices.find(
          (voice) => voice.name === result.voice
        );
        if (selectedVoice) {
          utterance.voice = selectedVoice;
        }
      }

      // Set rate and pitch
      utterance.rate = result.rate || 1;
      utterance.pitch = result.pitch || 1;

      // Event handlers
      utterance.onstart = () => {
        speakingTabId = tab.id;
        browser.runtime.sendMessage({
          action: "audioStateChange",
          state: "playing",
        });
      };

      utterance.onend = () => {
        speakingTabId = null;
        browser.runtime.sendMessage({
          action: "audioStateChange",
          state: "ended",
        });
      };

      utterance.onerror = (event) => {
        speakingTabId = null;
        browser.runtime.sendMessage({
          action: "audioStateChange",
          state: "error",
          error: event.error,
        });
        console.error("TTS Error:", event);
      };

      speechSynthesis.speak(utterance);
    }
  });
}

async function speakWithGemini(text, apiKey, voice) {
  browser.runtime.sendMessage({
    action: "audioStateChange",
    state: "generating",
  });
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro-preview-tts:generateContent?key=${apiKey}`;
  try {
    const response = await fetch(API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text }] }],
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: voice } },
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
    const audioData = audioPart?.inlineData?.data;
    const mimeType = audioPart?.inlineData?.mimeType;

    if (audioData && mimeType?.startsWith("audio/")) {
      const sampleRateMatch = mimeType.match(/rate=(\d+)/);
      const sampleRate = sampleRateMatch
        ? parseInt(sampleRateMatch[1], 10)
        : 24000;
      await setupOffscreenDocument("offscreen.html");
      browser.runtime.sendMessage({
        action: "audioControl",
        control: "play",
        audioData,
        sampleRate,
      });
    } else {
      throw new Error("No audio content in API response.");
    }
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    browser.runtime.sendMessage({
      action: "audioStateChange",
      state: "error",
      error: error.message,
    });
  }
}

// --- OFFSCREEN DOCUMENT HELPERS ---
let creating;
async function setupOffscreenDocument(path) {
  const offscreenUrl = browser.runtime.getURL(path);
  const existingContexts = await browser.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });
  if (existingContexts.length > 0) return;
  if (creating) {
    await creating;
    return;
  }
  try {
    creating = browser.offscreen.createDocument({
      url: path,
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Playback of text-to-speech audio",
    });
    await creating;
  } catch (error) {
    console.error("Error creating offscreen document:", error);
    browser.runtime.sendMessage({
      action: "audioStateChange",
      state: "error",
      error: error.message,
    });
  } finally {
    creating = null;
  }
}

// --- LIFECYCLE AND CONTEXT MENU ---
browser.runtime.onInstalled.addListener(() => {
  browser.contextMenus.create({
    id: "readSelectedText",
    title: "Read Selected Text",
    contexts: ["selection"],
  });
});

browser.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    handleReadFromContentScript(info.selectionText, tab);
  }
});

browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === speakingTabId) {
    if ("speechSynthesis" in window) {
      speechSynthesis.cancel();
    }
    speakingTabId = null;
  }
});
