// Content script for text-to-speech extension

// --- MESSAGE LISTENER ---

// Listen for messages from the popup to get the currently selected text.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const text = window.getSelection().toString().trim();
    sendResponse({ text: text });
  }
  // This listener doesn't need to be async, so we don't return true.
});

// --- FLOATING BUTTON ---

let floatingButton = null;

/**
 * Creates and injects the floating "Read" button onto the page.
 */
function createFloatingButton() {
  // Prevent creating multiple buttons
  if (document.getElementById("tts-floating-button")) return;

  floatingButton = document.createElement("button");
  floatingButton.id = "tts-floating-button";
  floatingButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="currentColor" viewBox="0 0 16 16">
      <path d="M11.536 14.01A8.473 8.473 0 0 0 14.026 8a8.473 8.473 0 0 0-2.49-6.01l.707-.707A9.473 9.473 0 0 1 15.026 8c0 2.456-1.02 4.907-2.784 6.707l-.707-.707z"/>
      <path d="M9.828 12.586a6.476 6.476 0 0 0 1.768-4.586 6.476 6.476 0 0 0-1.768-4.586l.707-.707A7.476 7.476 0 0 1 12.026 8a7.476 7.476 0 0 1-1.49 4.886l-.707-.707z"/>
      <path d="M7.414 2.586a2.5 2.5 0 0 1 0 3.536L3.621 9.922a.5.5 0 0 1-.707 0L.214 7.218a.5.5 0 0 1 0-.707l3.536-3.535a2.5 2.5 0 0 1 3.664 0zM2.5 5.5a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/>
    </svg>
  `;

  document.body.appendChild(floatingButton);

  // Add click listener to read the selected text
  floatingButton.addEventListener("click", (e) => {
    e.stopPropagation();
    const text = window.getSelection().toString().trim();
    if (text) {
      // This sends a message to the background script to use the default TTS engine.
      // This provides a quick way to read text without opening the popup.
      chrome.runtime.sendMessage({
        action: "speakText",
        text: text,
      });
    }
  });
}

/**
 * Shows or hides the floating button based on whether text is selected.
 */
function toggleFloatingButton() {
  if (!floatingButton) return;
  const text = window.getSelection().toString().trim();
  floatingButton.style.opacity = text ? "1" : "0";
  floatingButton.style.transform = text ? "scale(1)" : "scale(0.8)";
  floatingButton.style.pointerEvents = text ? "auto" : "none";
}

// --- INITIALIZATION ---

// Create the button once the page is loaded
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", createFloatingButton);
} else {
  createFloatingButton();
}

// Show/hide button on text selection change
document.addEventListener("selectionchange", toggleFloatingButton);
