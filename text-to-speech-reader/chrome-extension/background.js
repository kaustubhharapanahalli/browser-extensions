// Background service worker for text-to-speech extension

// Handle messages from content scripts and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "speakText") {
    speakText(request.text);
  } else if (request.action === "speakWithGemini") {
    speakWithGeminiEnhanced(
      request.text,
      request.apiKey,
      request.voiceStyle,
      request.rate,
      request.pitch,
      sendResponse
    );
    return true; // Keep the message channel open for async response
  } else if (request.action === "speakWithGoogleCloud") {
    speakWithGoogleCloud(
      request.text,
      request.apiKey,
      request.voice,
      request.rate,
      request.pitch,
      sendResponse
    );
    return true; // Keep the message channel open for async response
  }
});

// Function to speak text using Chrome TTS API
function speakText(text) {
  // Check if chrome.tts is available
  if (typeof chrome === "undefined" || !chrome.tts) {
    console.error("Chrome TTS API not available");
    return;
  }

  // Get saved settings
  chrome.storage.sync.get(["voice", "rate", "pitch"], (result) => {
    const settings = {
      voiceName: result.voice || undefined,
      rate: result.rate || 1,
      pitch: result.pitch || 1,
    };

    chrome.tts.speak(text, settings, (event) => {
      if (chrome.runtime.lastError) {
        console.error("TTS Error:", chrome.runtime.lastError);
        return;
      }

      if (event && event.type === "error") {
        console.error("TTS Error:", event);
      }
    });
  });
}

// Function to speak text using Gemini AI for enhancement + Free TTS
async function speakWithGeminiEnhanced(
  text,
  apiKey,
  voiceStyle,
  rate,
  pitch,
  sendResponse
) {
  try {
    // First, use Gemini to enhance the text
    const enhancedText = await enhanceTextWithGemini(text, apiKey, voiceStyle);

    // Then use a free TTS service
    await speakWithFreeTTS(enhancedText, rate, pitch, sendResponse);
  } catch (error) {
    console.error("Gemini Enhanced TTS Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Function to enhance text using Gemini AI
async function enhanceTextWithGemini(text, apiKey, voiceStyle) {
  const prompt = `Please enhance the following text for better speech synthesis. Make it more natural and readable while maintaining the original meaning. Style: ${voiceStyle}. Text: "${text}"`;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                text: prompt,
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
      }),
    }
  );

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(
      `Gemini API Error: ${errorData.error?.message || response.statusText}`
    );
  }

  const data = await response.json();

  if (data.candidates && data.candidates[0] && data.candidates[0].content) {
    return data.candidates[0].content.parts[0].text;
  } else {
    // Fallback to original text if Gemini fails
    return text;
  }
}

// Function to speak text using free TTS service
async function speakWithFreeTTS(text, rate, pitch, sendResponse) {
  try {
    // Use a free TTS service (e.g., ResponsiveVoice or similar)
    // For now, we'll use Chrome TTS as fallback
    if (typeof chrome !== "undefined" && chrome.tts) {
      chrome.tts.speak(
        text,
        {
          rate: rate,
          pitch: pitch,
        },
        (event) => {
          if (chrome.runtime.lastError) {
            console.error("TTS Error:", chrome.runtime.lastError);
            sendResponse({ success: false, error: "Failed to play audio" });
          } else if (event && event.type === "end") {
            sendResponse({ success: true });
          }
        }
      );
    } else {
      // Alternative: Use Web Speech API
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = rate;
        utterance.pitch = pitch;

        utterance.onend = () => {
          sendResponse({ success: true });
        };

        utterance.onerror = (error) => {
          console.error("Speech synthesis error:", error);
          sendResponse({ success: false, error: "Failed to play audio" });
        };

        speechSynthesis.speak(utterance);
      } else {
        throw new Error("No TTS service available");
      }
    }
  } catch (error) {
    console.error("Free TTS Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Function to speak text using Google Cloud Text-to-Speech API
async function speakWithGoogleCloud(
  text,
  apiKey,
  voice,
  rate,
  pitch,
  sendResponse
) {
  try {
    // Use Google Cloud Text-to-Speech API for realistic speech
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
            name: `en-US-${voice.charAt(0).toUpperCase() + voice.slice(1)}-I`, // Convert to proper voice name
            ssmlGender: "NEUTRAL",
          },
          audioConfig: {
            audioEncoding: "MP3",
            speakingRate: rate,
            pitch: pitch,
            effectsProfileId: ["headphone-class-device"],
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
      // Convert base64 audio to blob and play
      const audioBlob = new Blob(
        [Uint8Array.from(atob(data.audioContent), (c) => c.charCodeAt(0))],
        {
          type: "audio/mp3",
        }
      );

      const audioUrl = URL.createObjectURL(audioBlob);
      const audio = new Audio(audioUrl);

      audio.onended = () => {
        URL.revokeObjectURL(audioUrl);
        sendResponse({ success: true });
      };

      audio.onerror = (error) => {
        URL.revokeObjectURL(audioUrl);
        console.error("Audio playback error:", error);
        sendResponse({ success: false, error: "Failed to play audio" });
      };

      audio.play().catch((error) => {
        URL.revokeObjectURL(audioUrl);
        console.error("Audio play error:", error);
        sendResponse({ success: false, error: "Failed to play audio" });
      });
    } else {
      throw new Error("No audio content received from TTS API");
    }
  } catch (error) {
    console.error("TTS API Error:", error);
    sendResponse({ success: false, error: error.message });
  }
}

// Handle extension installation
chrome.runtime.onInstalled.addListener(() => {
  console.log("Text to Speech Reader extension installed");

  // Set default settings
  chrome.storage.sync.set({
    voice: "",
    rate: 1,
    pitch: 1,
  });
});

// Handle context menu creation (optional)
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "readSelectedText",
    title: "Read Selected Text",
    contexts: ["selection"],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "readSelectedText") {
    speakText(info.selectionText);
  }
});
