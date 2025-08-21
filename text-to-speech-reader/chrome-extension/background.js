// Background service worker for text-to-speech extension

let speakingTabId = null; // Tracks the tab ID for Chrome TTS playback

// --- SIDE PANEL MANAGEMENT ---
chrome.action.onClicked.addListener((tab) => {
  chrome.sidePanel.open({ windowId: tab.windowId });
});

// --- MESSAGE RELAY ---
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (sender.url?.includes("offscreen.html")) {
    chrome.runtime.sendMessage(request); // Forward messages from offscreen to sidebar
    return;
  }

  switch (request.action) {
    case "speakText":
      if (!sender.tab) {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          if (tabs[0]) {
            handleSpeakText(request.text, tabs[0]);
          } else {
            console.error("Could not find active tab to speak on.");
          }
        });
      } else {
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
});

/**
 * Handles audio control messages, directing them to the correct TTS engine.
 * @param {object} request The audio control request.
 */
async function handleAudioControl(request) {
  const { ttsProvider } = await chrome.storage.sync.get("ttsProvider");
  if (ttsProvider === "gemini") {
    await setupOffscreenDocument("offscreen.html");
    // FIX: Send a message with a new action name to avoid a loop.
    // This message is intended only for the offscreen document.
    chrome.runtime.sendMessage({ ...request, action: "offscreenAudioControl" });
  } else {
    // Handle Chrome TTS controls directly and send UI updates.
    if (request.control === "stop") {
      chrome.tts.stop();
    }
    if (request.control === "pause") {
      chrome.tts.pause();
      chrome.runtime.sendMessage({
        action: "audioStateChange",
        state: "paused",
      });
    }
    if (request.control === "resume") {
      chrome.tts.resume();
      chrome.runtime.sendMessage({
        action: "audioStateChange",
        state: "playing",
      });
    }
  }
}

/**
 * Opens the side panel and initiates speech from a content script action.
 * @param {string} text The text to be spoken.
 * @param {chrome.tabs.Tab} tab The tab where the action was initiated.
 */
async function handleReadFromContentScript(text, tab) {
  await chrome.sidePanel.open({ tabId: tab.id });
  handleSpeakText(text, tab);
}

/**
 * Determines which TTS engine to use based on stored settings.
 * @param {string} text The text to be spoken.
 * @param {chrome.tabs.Tab} tab The tab that initiated the request.
 */
async function handleSpeakText(text, tab) {
  const {
    ttsProvider,
    geminiApiKey,
    geminiVoice,
  } = await chrome.storage.sync.get([
    "ttsProvider",
    "geminiApiKey",
    "geminiVoice",
  ]);
  if (ttsProvider === "gemini" && geminiApiKey) {
    speakWithGemini(text, geminiApiKey, geminiVoice);
  } else {
    speakWithChromeTTS(text, tab);
  }
}

// --- TTS FUNCTIONS ---

function speakWithChromeTTS(text, tab) {
  chrome.storage.sync.get(["voice", "rate", "pitch"], (result) => {
    chrome.tts.speak(text, {
      voiceName: result.voice || undefined,
      rate: result.rate || 1,
      pitch: result.pitch || 1,
      onEvent: (event) => {
        switch (event.type) {
          case "start":
            speakingTabId = tab.id;
            chrome.runtime.sendMessage({
              action: "audioStateChange",
              state: "playing",
            });
            break;
          case "end":
          case "interrupted":
            speakingTabId = null;
            chrome.runtime.sendMessage({
              action: "audioStateChange",
              state: "ended",
            });
            break;
          case "error":
            speakingTabId = null;
            chrome.runtime.sendMessage({
              action: "audioStateChange",
              state: "error",
              error: event.errorMessage,
            });
            break;
        }
      },
    });
  });
}

async function speakWithGemini(text, apiKey, voice) {
  chrome.runtime.sendMessage({
    action: "audioStateChange",
    state: "generating",
  });
  const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-tts:generateContent?key=${apiKey}`;
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
      // MODIFICATION START
      // 1. Ensure the offscreen document is active.
      await setupOffscreenDocument("offscreen.html");

      // 2. Command the offscreen document to save the data to its localStorage.
      chrome.runtime.sendMessage({
        action: "offscreenAudioControl",
        control: "saveToLocalStorage",
        audioData,
        mimeType,
      });

      // 3. Notify the sidebar that the audio file is ready.
      chrome.runtime.sendMessage({
        action: "audioStateChange",
        state: "ready",
      });

      // 4. Command the offscreen document to play from its localStorage.
      chrome.runtime.sendMessage({
        action: "offscreenAudioControl",
        control: "playFromStorage",
      });
      // MODIFICATION END
    } else {
      throw new Error("No audio content in API response.");
    }
  } catch (error) {
    console.error("Gemini TTS Error:", error);
    chrome.runtime.sendMessage({
      action: "audioStateChange",
      state: "error",
      error: error.message,
    });
  }
}

// --- OFFSCREEN DOCUMENT HELPERS ---
let creating;
async function setupOffscreenDocument(path) {
  const offscreenUrl = chrome.runtime.getURL(path);
  const existingContexts = await chrome.runtime.getContexts({
    contextTypes: ["OFFSCREEN_DOCUMENT"],
    documentUrls: [offscreenUrl],
  });
  if (existingContexts.length > 0) return;
  if (creating) {
    await creating;
    return;
  }
  try {
    creating = chrome.offscreen.createDocument({
      url: path,
      reasons: ["AUDIO_PLAYBACK"],
      justification: "Playback of text-to-speech audio",
    });
    await creating;
  } catch (error) {
    console.error("Error creating offscreen document:", error);
    chrome.runtime.sendMessage({
      action: "audioStateChange",
      state: "error",
      error: error.message,
    });
  } finally {
    creating = null;
  }
}

// --- LIFECYCLE AND CONTEXT MENU ---
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Read Selected Text",
    contexts: ["selection"],
  });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText" && info.selectionText) {
    handleReadFromContentScript(info.selectionText, tab);
  }
});

chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  if (tabId === speakingTabId) {
    chrome.tts.stop();
    speakingTabId = null;
  }
});
