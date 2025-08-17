document.addEventListener("DOMContentLoaded", function () {
  const readSelectedBtn = document.getElementById("readSelected");
  const stopReadingBtn = document.getElementById("stopReading");
  const ttsProvider = document.getElementById("ttsProvider");
  const voiceSelect = document.getElementById("voiceSelect");
  const geminiApiKey = document.getElementById("geminiApiKey");
  const geminiVoice = document.getElementById("geminiVoice");
  const googleCloudApiKey = document.getElementById("googleCloudApiKey");
  const googleCloudVoice = document.getElementById("googleCloudVoice");
  const chromeSettings = document.getElementById("chromeSettings");
  const geminiSettings = document.getElementById("geminiSettings");
  const geminiVoiceSettings = document.getElementById("geminiVoiceSettings");
  const googleCloudSettings = document.getElementById("googleCloudSettings");
  const googleCloudVoiceSettings = document.getElementById(
    "googleCloudVoiceSettings"
  );
  const rateSlider = document.getElementById("rateSlider");
  const pitchSlider = document.getElementById("pitchSlider");
  const rateValue = document.getElementById("rateValue");
  const pitchValue = document.getElementById("pitchValue");
  const status = document.getElementById("status");

  // Load available voices
  function loadVoices() {
    // Check if chrome.tts is available
    if (typeof chrome !== "undefined" && chrome.tts) {
      chrome.tts.getVoices((voices) => {
        if (chrome.runtime.lastError) {
          console.error("Error loading voices:", chrome.runtime.lastError);
          showStatus(
            "Error loading voices: " + chrome.runtime.lastError.message,
            "error"
          );
          return;
        }

        voiceSelect.innerHTML = "";
        if (voices && voices.length > 0) {
          voices.forEach((voice) => {
            const option = document.createElement("option");
            option.value = voice.voiceName;
            option.textContent = `${voice.voiceName} (${voice.lang})`;
            voiceSelect.appendChild(option);
          });
        } else {
          // Add a default option if no voices are available
          const option = document.createElement("option");
          option.value = "";
          option.textContent = "No voices available";
          voiceSelect.appendChild(option);
        }
      });
    } else {
      console.error("Chrome TTS API not available");
      showStatus("Chrome TTS API not available", "error");
    }
  }

  // Load saved settings
  function loadSettings() {
    chrome.storage.sync.get(
      [
        "ttsProvider",
        "voice",
        "geminiApiKey",
        "geminiVoice",
        "googleCloudApiKey",
        "googleCloudVoice",
        "rate",
        "pitch",
      ],
      (result) => {
        if (result.ttsProvider) {
          ttsProvider.value = result.ttsProvider;
          toggleProviderSettings(result.ttsProvider);
        }
        if (result.voice) {
          voiceSelect.value = result.voice;
        }
        if (result.geminiApiKey) {
          geminiApiKey.value = result.geminiApiKey;
        }
        if (result.geminiVoice) {
          geminiVoice.value = result.geminiVoice;
        }
        if (result.googleCloudApiKey) {
          googleCloudApiKey.value = result.googleCloudApiKey;
        }
        if (result.googleCloudVoice) {
          googleCloudVoice.value = result.googleCloudVoice;
        }
        if (result.rate) {
          rateSlider.value = result.rate;
          rateValue.textContent = result.rate;
        }
        if (result.pitch) {
          pitchSlider.value = result.pitch;
          pitchValue.textContent = result.pitch;
        }
      }
    );
  }

  // Save settings
  function saveSettings() {
    chrome.storage.sync.set({
      ttsProvider: ttsProvider.value,
      voice: voiceSelect.value,
      geminiApiKey: geminiApiKey.value,
      geminiVoice: geminiVoice.value,
      googleCloudApiKey: googleCloudApiKey.value,
      googleCloudVoice: googleCloudVoice.value,
      rate: parseFloat(rateSlider.value),
      pitch: parseFloat(pitchSlider.value),
    });
  }

  // Toggle provider-specific settings
  function toggleProviderSettings(provider) {
    // Hide all settings first
    chromeSettings.style.display = "none";
    geminiSettings.style.display = "none";
    geminiVoiceSettings.style.display = "none";
    googleCloudSettings.style.display = "none";
    googleCloudVoiceSettings.style.display = "none";

    if (provider === "chrome") {
      chromeSettings.style.display = "block";
    } else if (provider === "gemini") {
      geminiSettings.style.display = "block";
      geminiVoiceSettings.style.display = "block";
    } else if (provider === "googleCloud") {
      googleCloudSettings.style.display = "block";
      googleCloudVoiceSettings.style.display = "block";
    }
  }

  // Show status message
  function showStatus(message, type = "success") {
    status.textContent = message;
    status.className = `status ${type}`;
    status.style.display = "block";
    setTimeout(() => {
      status.style.display = "none";
    }, 3000);
  }

  // Read selected text
  readSelectedBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });

      const response = await chrome.tabs.sendMessage(tab.id, {
        action: "getSelectedText",
      });

      if (response && response.text) {
        const provider = ttsProvider.value;

        if (provider === "chrome") {
          // Use Chrome TTS
          if (typeof chrome !== "undefined" && chrome.tts) {
            const settings = {
              voiceName: voiceSelect.value,
              rate: parseFloat(rateSlider.value),
              pitch: parseFloat(pitchSlider.value),
            };

            chrome.tts.speak(response.text, settings, (event) => {
              if (chrome.runtime.lastError) {
                console.error("TTS Error:", chrome.runtime.lastError);
                readSelectedBtn.disabled = false;
                stopReadingBtn.disabled = true;
                showStatus(
                  "Error: " + chrome.runtime.lastError.message,
                  "error"
                );
                return;
              }

              if (event && event.type === "start") {
                readSelectedBtn.disabled = true;
                stopReadingBtn.disabled = false;
                showStatus("Reading started...");
              } else if (
                event &&
                (event.type === "end" || event.type === "error")
              ) {
                readSelectedBtn.disabled = false;
                stopReadingBtn.disabled = true;
                if (event.type === "error") {
                  showStatus("Error reading text", "error");
                } else {
                  showStatus("Reading completed");
                }
              }
            });
          } else {
            showStatus(
              "Chrome TTS API not available. Please use Google Cloud TTS instead.",
              "error"
            );
          }
        } else if (provider === "gemini") {
          // Use Gemini AI native TTS
          if (!geminiApiKey.value.trim()) {
            showStatus("Please enter your Gemini API key", "error");
            return;
          }

          readSelectedBtn.disabled = true;
          stopReadingBtn.disabled = false;
          showStatus("Generating speech with Gemini AI...");

          // Send message to background script to handle Gemini AI TTS
          chrome.runtime.sendMessage(
            {
              action: "speakWithGemini",
              text: response.text,
              apiKey: geminiApiKey.value,
              voice: geminiVoice.value,
            },
            (response) => {
              readSelectedBtn.disabled = false; // Re-enable button
              stopReadingBtn.disabled = true; // Disable stop after request
              if (response && response.success) {
                showStatus("Reading with Gemini AI...");
              } else {
                showStatus(
                  "Error: " + (response ? response.error : "Unknown error"),
                  "error"
                );
              }
            }
          );
        } else if (provider === "googleCloud") {
          // Use Google Cloud TTS API
          if (!googleCloudApiKey.value.trim()) {
            showStatus("Please enter your Google Cloud API key", "error");
            return;
          }

          readSelectedBtn.disabled = true;
          stopReadingBtn.disabled = false;
          showStatus("Generating realistic speech...");

          // Send message to background script to handle Google Cloud TTS API
          chrome.runtime.sendMessage(
            {
              action: "speakWithGoogleCloud",
              text: response.text,
              apiKey: googleCloudApiKey.value,
              voice: googleCloudVoice.value,
              rate: parseFloat(rateSlider.value),
              pitch: parseFloat(pitchSlider.value),
            },
            (response) => {
              readSelectedBtn.disabled = false; // Re-enable button
              stopReadingBtn.disabled = true; // Disable stop after request
              if (response && response.success) {
                showStatus("Reading with Google Cloud TTS...");
              } else {
                showStatus(
                  "Error: " + (response ? response.error : "Unknown error"),
                  "error"
                );
              }
            }
          );
        }
      } else {
        showStatus("No text selected. Please select some text first.", "error");
      }
    } catch (error) {
      showStatus("Error: " + error.message, "error");
    }
  });

  // Stop reading
  stopReadingBtn.addEventListener("click", () => {
    // This will stop the built-in Chrome TTS
    if (typeof chrome !== "undefined" && chrome.tts) {
      chrome.tts.stop();
    }
    // This will send a message to stop audio in the offscreen document
    // for Gemini and Google Cloud
    chrome.runtime.sendMessage({ action: "stopAudio" });

    readSelectedBtn.disabled = false;
    stopReadingBtn.disabled = true;
    showStatus("Reading stopped");
  });

  // Update rate value display
  rateSlider.addEventListener("input", () => {
    rateValue.textContent = rateSlider.value;
    saveSettings();
  });

  // Update pitch value display
  pitchSlider.addEventListener("input", () => {
    pitchValue.textContent = pitchSlider.value;
    saveSettings();
  });

  // Save settings when voice changes
  voiceSelect.addEventListener("change", saveSettings);

  // Toggle provider settings when provider changes
  ttsProvider.addEventListener("change", () => {
    toggleProviderSettings(ttsProvider.value);
    saveSettings();
  });

  // Save settings when Gemini settings change
  geminiApiKey.addEventListener("input", saveSettings);
  geminiVoice.addEventListener("change", saveSettings);

  // Initialize
  console.log("Initializing Text to Speech Reader extension...");
  console.log(
    "Chrome TTS available:",
    typeof chrome !== "undefined" && !!chrome.tts
  );

  loadVoices();
  loadSettings();
});
