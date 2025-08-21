// This script runs in the offscreen document to handle audio playback.
let audio;
let audioUrl; // Keep track of the object URL

// --- AUDIO HELPERS ---
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

function pcmToWav(pcmData, sampleRate) {
  const numChannels = 1,
    bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(44 + i * 2, pcmData[i], true);
  }
  return new Blob([view], { type: "audio/wav" });
}

// --- MESSAGE LISTENER ---
chrome.runtime.onMessage.addListener((request) => {
  // Listen for the specific action name to avoid loops.
  if (request.action !== "offscreenAudioControl") return;

  switch (request.control) {
    // MODIFICATION START: Replaced 'play' with 'playFromStorage' for Gemini audio
    case "playFromStorage":
      chrome.storage.local.get("latestGeminiAudio", (result) => {
        if (result.latestGeminiAudio) {
          const { audioData, mimeType } = result.latestGeminiAudio;
          const sampleRateMatch = mimeType.match(/rate=(\d+)/);
          const sampleRate = sampleRateMatch
            ? parseInt(sampleRateMatch[1], 10)
            : 24000;
          const pcmBuffer = base64ToArrayBuffer(audioData);
          const pcm16 = new Int16Array(pcmBuffer);
          const wavBlob = pcmToWav(pcm16, sampleRate);
          audioUrl = URL.createObjectURL(wavBlob);
          playAudio(audioUrl);
        } else {
          sendMessage({
            state: "error",
            error: "Could not find audio to play.",
          });
        }
      });
      break;
    // MODIFICATION END
    case "pause":
      if (audio) audio.pause();
      break;
    case "resume":
      if (audio) audio.play();
      break;
    case "stop":
      stopAudio();
      sendMessage({ state: "ended" }); // Manually send ended state on stop
      break;
    case "seek":
      if (audio) audio.currentTime = request.time;
      break;
  }
});

function playAudio(url) {
  if (audio) stopAudio(); // Clean up previous audio
  audio = new Audio(url);

  // Attach event listeners to send state updates
  audio.onplay = () => sendMessage({ state: "playing" });
  audio.onpause = () => sendMessage({ state: "paused" });
  audio.onended = () => {
    sendMessage({ state: "ended" });
    stopAudio(); // Clean up
  };
  audio.ontimeupdate = () => {
    if (audio) {
      // Check if audio exists before sending update
      sendMessage({
        state: "timeupdate",
        currentTime: audio.currentTime,
        duration: audio.duration,
      });
    }
  };
  audio.onerror = () => {
    sendMessage({ state: "error", error: "Audio playback failed" });
    stopAudio();
  };

  audio.play().catch((e) => console.error("Audio playback failed:", e));
}

function stopAudio() {
  if (audio) {
    audio.pause();
    audio.onplay = audio.onpause = audio.onended = audio.ontimeupdate = audio.onerror = null;
  }
  if (audioUrl) {
    URL.revokeObjectURL(audioUrl);
    audioUrl = null;
  }
  audio = null;
}

/**
 * Sends a message to the service worker to be broadcasted.
 * @param {object} payload The data to send.
 */
function sendMessage(payload) {
  chrome.runtime.sendMessage({ action: "audioStateChange", ...payload });
}
