// This script runs in the offscreen document.
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

function playAudio(dataUrl) {
  if (audio) {
    audio.pause();
  }
  audio = new Audio(dataUrl);
  audio.play().catch((error) => console.error("Audio playback failed:", error));

  // Optional: Close the offscreen document when audio finishes playing
  // to conserve resources.
  audio.onended = () => {
    audio = null;
    window.close();
  };
}

function stopAudio() {
  if (audio) {
    audio.pause();
    audio = null;
  }
}
