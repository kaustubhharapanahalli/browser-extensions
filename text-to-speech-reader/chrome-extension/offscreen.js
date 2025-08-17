// This script runs in the offscreen document to handle audio playback.
let audio;

// --- AUDIO HELPERS (Moved from background.js) ---

/**
 * Decodes a base64 string into an ArrayBuffer.
 * @param {string} base64 The base64 string to decode.
 * @returns {ArrayBuffer} The decoded data.
 */
function base64ToArrayBuffer(base64) {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Converts raw PCM audio data into a playable WAV file Blob.
 * @param {Int16Array} pcmData The raw 16-bit PCM audio data.
 * @param {number} sampleRate The sample rate of the audio (e.g., 24000).
 * @returns {Blob} A Blob object representing the WAV file.
 */
function pcmToWav(pcmData, sampleRate) {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = (sampleRate * numChannels * bitsPerSample) / 8;
  const blockAlign = (numChannels * bitsPerSample) / 8;
  const dataSize = pcmData.length * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);

  // RIFF header
  view.setUint32(0, 0x52494646, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x57415645, false); // "WAVE"

  // fmt chunk
  view.setUint32(12, 0x666d7420, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);

  // data chunk
  view.setUint32(36, 0x64617461, false); // "data"
  view.setUint32(40, dataSize, true);

  // Write PCM data
  for (let i = 0; i < pcmData.length; i++) {
    view.setInt16(44 + i * 2, pcmData[i], true);
  }

  return new Blob([view], { type: "audio/wav" });
}

// --- MESSAGE LISTENER ---

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "playGeminiAudio") {
    // **FIX:** Process raw audio data and play it
    const pcmBuffer = base64ToArrayBuffer(request.audioData);
    const pcm16 = new Int16Array(pcmBuffer);
    const wavBlob = pcmToWav(pcm16, request.sampleRate);
    const audioUrl = URL.createObjectURL(wavBlob);
    playAudio(audioUrl);
    sendResponse({ success: true });
  } else if (request.action === "stopAudio") {
    stopAudio();
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open
});

/**
 * Plays audio from a given URL. Stops any currently playing audio first.
 * @param {string} url The URL of the audio to play.
 */
function playAudio(url) {
  if (audio) {
    audio.pause();
    audio.onended = null;
  }
  audio = new Audio(url);
  audio.play().catch((error) => console.error("Audio playback failed:", error));

  audio.onended = () => {
    // Revoke the object URL to free up memory
    URL.revokeObjectURL(url);
    audio = null;
    window.close();
  };
}

/**
 * Stops the currently playing audio.
 */
function stopAudio() {
  if (audio) {
    audio.pause();
    URL.revokeObjectURL(audio.src); // Clean up the URL
    audio.onended = null;
    audio = null;
    window.close();
  }
}
