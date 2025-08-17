document.addEventListener("DOMContentLoaded", function () {
  // --- DOM Elements ---
  const readSelectedBtn = document.getElementById("readSelected");
  const stopReadingBtn = document.getElementById("stopReading");
  const ttsProviderSelect = document.getElementById("ttsProvider");
  const statusDiv = document.getElementById("status");

  // Provider Settings Panels
  const chromeSettings = document.getElementById("chromeSettings");
  const geminiSettings = document.getElementById("geminiSettings");
  const commonControls = document.getElementById("commonControls");

  // Input Elements
  const voiceSelect = document.getElementById("voiceSelect");
  const geminiApiKeyInput = document.getElementById("geminiApiKey");
  const geminiVoiceSelect = document.getElementById("geminiVoice");
  const rateSlider = document.getElementById("rateSlider");
  const pitchSlider = document.getElementById("pitchSlider");
  const rateValueSpan = document.getElementById("rateValue");
  const pitchValueSpan = document.getElementById("pitchValue");

  // --- Functions ---

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
        chrome.storage.sync.get("voice", (result) => {
          if (result.voice) voiceSelect.value = result.voice;
        });
      });
    }
  }

  function loadSettings() {
    chrome.storage.sync.get(null, (result) => {
      ttsProviderSelect.value = result.ttsProvider || "chrome";
      geminiApiKeyInput.value = result.geminiApiKey || "";
      geminiVoiceSelect.value = result.geminiVoice || "Zephyr";
      rateSlider.value = result.rate || 1;
      pitchSlider.value = result.pitch || 1;
      rateValueSpan.textContent = rateSlider.value;
      pitchValueSpan.textContent = pitchSlider.value;

      toggleProviderSettings();
      loadChromeVoices();
    });
  }

  function saveSettings() {
    chrome.storage.sync.set({
      ttsProvider: ttsProviderSelect.value,
      voice: voiceSelect.value,
      geminiApiKey: geminiApiKeyInput.value.trim(),
      geminiVoice: geminiVoiceSelect.value,
      rate: parseFloat(rateSlider.value),
      pitch: parseFloat(pitchSlider.value),
    });
  }

  /**
   * Shows/hides settings based on provider. Gemini API doesn't use rate/pitch.
   */
  function toggleProviderSettings() {
    const provider = ttsProviderSelect.value;
    chromeSettings.style.display = provider === "chrome" ? "block" : "none";
    geminiSettings.style.display = provider === "gemini" ? "block" : "none";
    // Hide rate/pitch controls for Gemini, as it doesn't support them via API
    commonControls.style.display = provider === "chrome" ? "block" : "none";
  }

  function showStatus(message, type = "success") {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
    statusDiv.style.display = "block";
    setTimeout(() => {
      statusDiv.style.display = "none";
    }, 4000);
  }

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

      if (provider === "chrome") {
        chrome.tts.speak(text, {
          rate: parseFloat(rateSlider.value),
          pitch: parseFloat(pitchSlider.value),
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
      } else if (provider === "gemini") {
        const apiKey = geminiApiKeyInput.value;
        if (!apiKey.trim()) {
          showStatus("Please enter your Gemini API key.", "error");
          readSelectedBtn.disabled = false;
          stopReadingBtn.disabled = true;
          return;
        }

        showStatus("Generating speech with Gemini...");
        chrome.runtime.sendMessage(
          {
            action: "speakWithGemini",
            text,
            apiKey,
            voice: geminiVoiceSelect.value,
          },
          (apiResponse) => {
            if (apiResponse && apiResponse.success) {
              showStatus("Playing audio...");
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

  [
    voiceSelect,
    geminiApiKeyInput,
    geminiVoiceSelect,
    rateSlider,
    pitchSlider,
  ].forEach((element) => {
    element.addEventListener("input", saveSettings);
    element.addEventListener("change", saveSettings);
  });

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
