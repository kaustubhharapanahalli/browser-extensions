document.addEventListener("DOMContentLoaded", function () {
  // --- DOM Elements ---
  const readSelectedBtn = document.getElementById("readSelected");
  const stopReadingBtn = document.getElementById("stopReading");
  const ttsProviderSelect = document.getElementById("ttsProvider");
  const statusDiv = document.getElementById("status");

  // Provider Settings Panels
  const chromeSettings = document.getElementById("chromeSettings");
  const geminiSettings = document.getElementById("geminiSettings");
  const googleCloudSettings = document.getElementById("googleCloudSettings");

  // Input Elements
  const voiceSelect = document.getElementById("voiceSelect");
  const geminiApiKeyInput = document.getElementById("geminiApiKey");
  const geminiVoiceSelect = document.getElementById("geminiVoice");
  const googleCloudApiKeyInput = document.getElementById("googleCloudApiKey");
  const googleCloudVoiceSelect = document.getElementById("googleCloudVoice");
  const rateSlider = document.getElementById("rateSlider");
  const pitchSlider = document.getElementById("pitchSlider");
  const rateValueSpan = document.getElementById("rateValue");
  const pitchValueSpan = document.getElementById("pitchValue");

  // --- Functions ---

  /**
   * Populates the voice dropdown for the native Chrome TTS engine.
   */
  function loadChromeVoices() {
    if (chrome.tts) {
      chrome.tts.getVoices((voices) => {
        if (chrome.runtime.lastError) {
          console.error(
            "Error loading voices:",
            chrome.runtime.lastError.message
          );
          return;
        }
        voiceSelect.innerHTML = "";
        const englishVoices = voices.filter(
          (voice) => voice.lang && voice.lang.startsWith("en")
        );

        englishVoices.forEach((voice) => {
          const option = document.createElement("option");
          option.value = voice.voiceName;
          option.textContent = `${voice.voiceName} (${voice.lang})`;
          voiceSelect.appendChild(option);
        });
        // After loading, restore the saved voice selection
        chrome.storage.sync.get("voice", (result) => {
          if (result.voice) {
            voiceSelect.value = result.voice;
          }
        });
      });
    }
  }

  /**
   * Loads all saved settings from chrome.storage.sync and updates the UI.
   */
  function loadSettings() {
    chrome.storage.sync.get(null, (result) => {
      ttsProviderSelect.value = result.ttsProvider || "chrome";
      geminiApiKeyInput.value = result.geminiApiKey || "";
      googleCloudApiKeyInput.value = result.googleCloudApiKey || "";
      geminiVoiceSelect.value = result.geminiVoice || "en-US-Studio-M";
      googleCloudVoiceSelect.value = result.googleCloudVoice || "Wavenet-A";
      rateSlider.value = result.rate || 1;
      pitchSlider.value = result.pitch || 1;
      rateValueSpan.textContent = rateSlider.value;
      pitchValueSpan.textContent = pitchSlider.value;

      toggleProviderSettings();
      loadChromeVoices(); // Load voices and then set the value
    });
  }

  /**
   * Saves the current state of all settings to chrome.storage.sync.
   */
  function saveSettings() {
    chrome.storage.sync.set({
      ttsProvider: ttsProviderSelect.value,
      voice: voiceSelect.value,
      geminiApiKey: geminiApiKeyInput.value.trim(),
      googleCloudApiKey: googleCloudApiKeyInput.value.trim(),
      geminiVoice: geminiVoiceSelect.value,
      googleCloudVoice: googleCloudVoiceSelect.value,
      rate: parseFloat(rateSlider.value),
      pitch: parseFloat(pitchSlider.value),
    });
  }

  /**
   * Shows or hides settings panels based on the selected TTS provider.
   */
  function toggleProviderSettings() {
    const provider = ttsProviderSelect.value;
    chromeSettings.style.display = provider === "chrome" ? "block" : "none";
    geminiSettings.style.display = provider === "gemini" ? "block" : "none";
    googleCloudSettings.style.display =
      provider === "googleCloud" ? "block" : "none";
  }

  /**
   * Displays a status message to the user.
   * @param {string} message The message to display.
   * @param {'success' | 'error'} type The type of message.
   */
  function showStatus(message, type = "success") {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = "block";
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 4000);
  }

  /**
   * Handles the logic for initiating text-to-speech.
   */
  async function handleReadText() {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      if (!tab) {
        showStatus("No active tab found.", "error");
        return;
      }

      // Get selected text from the content script
      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getSelectedText",
      });
      const text = response?.text;

      if (!text) {
        showStatus("No text selected.", "error");
        return;
      }

      readSelectedBtn.disabled = true;
      stopReadingBtn.disabled = false;

      const provider = ttsProviderSelect.value;
      const commonOptions = {
        rate: parseFloat(rateSlider.value),
        pitch: parseFloat(pitchSlider.value),
      };

      if (provider === "chrome") {
        chrome.tts.speak(text, {
          ...commonOptions,
          voiceName: voiceSelect.value,
          onEvent: (event) => {
            if (
              event.type === "end" ||
              event.type === "interrupted" ||
              event.type === "error"
            ) {
              readSelectedBtn.disabled = false;
              stopReadingBtn.disabled = true;
            }
            if (event.type === "error") {
              showStatus(`Error: ${event.errorMessage}`, "error");
            }
          },
        });
      } else {
        // Handle API-based TTS (Gemini, Google Cloud)
        const apiKey =
          provider === "gemini"
            ? geminiApiKeyInput.value
            : googleCloudApiKeyInput.value;
        if (!apiKey.trim()) {
          showStatus(`Please enter your ${provider} API key.`, "error");
          readSelectedBtn.disabled = false;
          stopReadingBtn.disabled = true;
          return;
        }

        const action =
          provider === "gemini" ? "speakWithGemini" : "speakWithGoogleCloud";
        const voice =
          provider === "gemini"
            ? geminiVoiceSelect.value
            : googleCloudVoiceSelect.value;

        showStatus(`Generating speech with ${provider}...`);
        chrome.runtime.sendMessage(
          { action, text, apiKey, voice, ...commonOptions },
          (apiResponse) => {
            if (apiResponse && apiResponse.success) {
              showStatus("Playing audio...");
              // The stop button is already enabled. We leave it that way.
            } else {
              showStatus(
                `Error: ${apiResponse?.error || "Unknown error"}`,
                "error"
              );
              readSelectedBtn.disabled = false;
              stopReadingBtn.disabled = true;
            }
          }
        );
      }
    } catch (error) {
      showStatus(`Error: ${error.message}`, "error");
      readSelectedBtn.disabled = false;
      stopReadingBtn.disabled = true;
    }
  }

  /**
   * Stops all TTS playback.
   */
  function handleStopReading() {
    chrome.tts.stop(); // Stops native TTS
    chrome.runtime.sendMessage({ action: "stopAudio" }); // Stops offscreen audio
    readSelectedBtn.disabled = false;
    stopReadingBtn.disabled = true;
    showStatus("Playback stopped.");
  }

  // --- Event Listeners ---
  readSelectedBtn.addEventListener("click", handleReadText);
  stopReadingBtn.addEventListener("click", handleStopReading);
  ttsProviderSelect.addEventListener("change", () => {
    toggleProviderSettings();
    saveSettings();
  });

  // Add event listeners to all input fields to save settings on change
  [
    voiceSelect,
    geminiApiKeyInput,
    geminiVoiceSelect,
    googleCloudApiKeyInput,
    googleCloudVoiceSelect,
    rateSlider,
    pitchSlider,
  ].forEach((element) => {
    element.addEventListener("input", saveSettings);
    element.addEventListener("change", saveSettings);
  });

  // Update slider value displays
  rateSlider.addEventListener(
    "input",
    () => (rateValueSpan.textContent = rateSlider.value)
  );
  pitchSlider.addEventListener(
    "input",
    () => (pitchValueSpan.textContent = pitchSlider.value)
  );

  // --- Initialization ---
  loadSettings();
});
