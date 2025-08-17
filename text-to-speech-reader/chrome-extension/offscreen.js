// This script runs in the offscreen document to handle audio playback.
let audio;

// Listen for messages from the service worker.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "playAudio") {
    playAudio(request.dataUrl);
    sendResponse({ success: true });
  } else if (request.action === "stopAudio") {
    stopAudio();
    sendResponse({ success: true });
  }
  return true; // Keep the message channel open for async response
});

/**
 * Plays audio from a given data URL. Stops any currently playing audio first.
 * @param {string} dataUrl The data URL of the audio to play.
 */
function playAudio(dataUrl) {
  // Stop any existing audio playback
  if (audio) {
    audio.pause();
    audio.onended = null; // Remove previous listener
    audio = null;
  }

  audio = new Audio(dataUrl);
  audio.play().catch((error) => console.error("Audio playback failed:", error));

  // When audio finishes playing, close the offscreen document to conserve resources.
  audio.onended = () => {
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
    audio.onended = null; // Remove listener to prevent window closing
    audio = null;
    // We can also close the window on stop if desired
    window.close();
  }
}
