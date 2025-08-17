document.addEventListener("DOMContentLoaded", () => {
  // --- DOM Elements ---
  const readBtn = document.getElementById("readSelected");
  const statusDiv = document.getElementById("status");
  const playerDiv = document.getElementById("player");
  const playerText = document.getElementById("playerText");
  const seeker = document.getElementById("seeker");
  const currentTimeSpan = document.getElementById("currentTime");
  const durationSpan = document.getElementById("duration");
  const replayBtn = document.getElementById("replayBtn");
  const playPauseBtn = document.getElementById("playPauseBtn");
  const stopBtn = document.getElementById("stopBtn");
  const ttsProviderSelect = document.getElementById("ttsProvider");
  const chromeSettings = document.getElementById("chromeSettings");
  const geminiSettings = document.getElementById("geminiSettings");
  const commonControls = document.getElementById("commonControls");
  const voiceSelect = document.getElementById("voiceSelect");
  const geminiApiKeyInput = document.getElementById("geminiApiKey");
  const geminiVoiceSelect = document.getElementById("geminiVoice");
  const rateSlider = document.getElementById("rateSlider");
  const pitchSlider = document.getElementById("pitchSlider");
  const rateValueSpan = document.getElementById("rateValue");
  const pitchValueSpan = document.getElementById("pitchValue");

  let currentText = "";
  let isSeeking = false;

  // --- SVG Icons ---
  const playIcon = `<svg viewBox="0 0 16 16"><path d="M11.596 8.697l-6.363 3.692c-.54.313-1.233-.066-1.233-.697V4.308c0-.63.692-1.01 1.233-.696l6.363 3.692a.802.802 0 0 1 0 1.393z"/></svg>`;
  const pauseIcon = `<svg viewBox="0 0 16 16"><path d="M5.5 3.5A1.5 1.5 0 0 1 7 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5zm5 0A1.5 1.5 0 0 1 12 5v6a1.5 1.5 0 0 1-3 0V5a1.5 1.5 0 0 1 1.5-1.5z"/></svg>`;
  const replayIcon = `<svg viewBox="0 0 16 16"><path d="M8 3a5 5 0 1 0 4.546 2.914.5.5 0 0 1 .908-.417A6 6 0 1 1 8 2v1z"/><path d="M8 4.466V.534a.25.25 0 0 1 .41-.192l2.36 1.966c.12.1.12.284 0 .384L8.41 4.658A.25.25 0 0 1 8 4.466z"/></svg>`;
  const stopIcon = `<svg viewBox="0 0 16 16"><path d="M5 3.5h6A1.5 1.5 0 0 1 12.5 5v6a1.5 1.5 0 0 1-1.5 1.5H5A1.5 1.5 0 0 1 3.5 11V5A1.5 1.5 0 0 1 5 3.5z"/></svg>`;
  playPauseBtn.innerHTML = playIcon;
  replayBtn.innerHTML = replayIcon;
  stopBtn.innerHTML = stopIcon;

  // --- Functions ---
  const formatTime = (seconds) => {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60)
      .toString()
      .padStart(2, "0");
    return `${min}:${sec}`;
  };

  const showStatus = (message, isError = false) => {
    statusDiv.textContent = message;
    statusDiv.className = `status ${isError ? "error" : ""}`;
  };

  const resetPlayer = () => {
    playerDiv.classList.add("hidden");
    showStatus("Select text on the page and click read.");
    seeker.value = 0;
    seeker.disabled = true;
    currentTimeSpan.textContent = "0:00";
    durationSpan.textContent = "0:00";
    playPauseBtn.innerHTML = playIcon;
    playPauseBtn.classList.add("play");
    currentText = "";
  };

  const loadSettings = () => {
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
  };

  const saveSettings = () => {
    chrome.storage.sync.set({
      ttsProvider: ttsProviderSelect.value,
      voice: voiceSelect.value,
      geminiApiKey: geminiApiKeyInput.value.trim(),
      geminiVoice: geminiVoiceSelect.value,
      rate: parseFloat(rateSlider.value),
      pitch: parseFloat(pitchSlider.value),
    });
  };

  const toggleProviderSettings = () => {
    const provider = ttsProviderSelect.value;
    chromeSettings.style.display = provider === "chrome" ? "block" : "none";
    geminiSettings.style.display = provider === "gemini" ? "block" : "none";
    commonControls.style.display = provider === "chrome" ? "block" : "none";
  };

  const loadChromeVoices = () => {
    if (chrome.tts) {
      chrome.tts.getVoices((voices) => {
        voiceSelect.innerHTML = "";
        voices
          .filter((v) => v.lang?.startsWith("en"))
          .forEach((voice) => {
            const option = document.createElement("option");
            option.value = voice.voiceName;
            option.textContent = `${voice.voiceName} (${voice.lang})`;
            voiceSelect.appendChild(option);
          });
        chrome.storage.sync.get("voice", (r) => {
          if (r.voice) voiceSelect.value = r.voice;
        });
      });
    }
  };

  // --- Event Listeners ---
  readBtn.addEventListener("click", async () => {
    try {
      const [tab] = await chrome.tabs.query({
        active: true,
        currentWindow: true,
      });
      const response = await chrome.scripting.executeScript({
        target: { tabId: tab.id },
        func: () => window.getSelection().toString().trim(),
      });
      const text = response[0].result;

      if (text) {
        currentText = text;
        playerText.textContent = text;
        playerDiv.classList.remove("hidden");
        chrome.runtime.sendMessage({ action: "speakText", text });
      } else {
        showStatus("No text selected on the page.", true);
      }
    } catch (e) {
      showStatus("Could not get selected text.", true);
      console.error(e);
    }
  });

  playPauseBtn.addEventListener("click", () => {
    const isPlaying = !playPauseBtn.classList.contains("play");
    chrome.runtime.sendMessage({
      action: "audioControl",
      control: isPlaying ? "pause" : "resume",
    });
  });

  stopBtn.addEventListener("click", () => {
    chrome.runtime.sendMessage({ action: "audioControl", control: "stop" });
    resetPlayer();
  });

  replayBtn.addEventListener("click", () => {
    if (currentText) {
      chrome.runtime.sendMessage({ action: "speakText", text: currentText });
    }
  });

  seeker.addEventListener("input", () => {
    isSeeking = true;
  });
  seeker.addEventListener("change", () => {
    isSeeking = false;
    chrome.runtime.sendMessage({
      action: "audioControl",
      control: "seek",
      time: parseFloat(seeker.value),
    });
  });

  [
    ttsProviderSelect,
    voiceSelect,
    geminiApiKeyInput,
    geminiVoiceSelect,
    rateSlider,
    pitchSlider,
  ].forEach((el) => el.addEventListener("change", saveSettings));
  rateSlider.addEventListener(
    "input",
    () => (rateValueSpan.textContent = rateSlider.value)
  );
  pitchSlider.addEventListener(
    "input",
    () => (pitchValueSpan.textContent = pitchSlider.value)
  );
  ttsProviderSelect.addEventListener("change", toggleProviderSettings);

  // Listen for state changes from the background/offscreen scripts
  chrome.runtime.onMessage.addListener((request) => {
    if (request.action === "audioStateChange") {
      switch (request.state) {
        case "generating":
          showStatus("Generating audio...");
          playerDiv.classList.remove("hidden");
          break;
        case "playing":
          showStatus("Playing...");
          playPauseBtn.innerHTML = pauseIcon;
          playPauseBtn.classList.remove("play");
          seeker.disabled = false;
          break;
        case "paused":
          showStatus("Paused.");
          playPauseBtn.innerHTML = playIcon;
          playPauseBtn.classList.add("play");
          break;
        case "ended":
          resetPlayer();
          break;
        case "timeupdate":
          if (!isSeeking) {
            seeker.value = request.currentTime;
            seeker.max = request.duration;
            currentTimeSpan.textContent = formatTime(request.currentTime);
            durationSpan.textContent = formatTime(request.duration);
          }
          break;
        case "error":
          showStatus(request.error || "An unknown error occurred.", true);
          resetPlayer();
          break;
      }
    } else if (request.action === "ttsEvent") {
      // For Chrome TTS
      if (request.event.type === "start") {
        showStatus("Playing...");
        playerDiv.classList.remove("hidden");
      } else if (
        request.event.type === "end" ||
        request.event.type === "error"
      ) {
        resetPlayer();
      }
    }
  });

  // --- Initialization ---
  loadSettings();
});
