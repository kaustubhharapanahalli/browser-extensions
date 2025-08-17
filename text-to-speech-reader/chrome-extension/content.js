// Content script for text-to-speech extension
let selectedText = "";

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const text = window.getSelection().toString().trim();
    sendResponse({ text: text });
  }
});

// Add context menu functionality
document.addEventListener("mouseup", () => {
  const selection = window.getSelection();
  selectedText = selection.toString().trim();

  // Highlight selected text (optional visual feedback)
  if (selectedText) {
    // You can add visual feedback here if needed
    console.log("Text selected:", selectedText);
  }
});

// Add keyboard shortcut support (Ctrl+Shift+R or Cmd+Shift+R)
document.addEventListener("keydown", (event) => {
  const isMac = navigator.platform.toUpperCase().indexOf("MAC") >= 0;
  const modifierKey = isMac ? event.metaKey : event.ctrlKey;

  if (modifierKey && event.shiftKey && event.key === "R") {
    event.preventDefault();

    const text = window.getSelection().toString().trim();
    if (text) {
      // Send message to background script to trigger TTS
      chrome.runtime.sendMessage({
        action: "speakText",
        text: text,
      });
    }
  }
});

// Add floating button for easy access (optional)
function createFloatingButton() {
  const button = document.createElement("div");
  button.id = "tts-floating-button";
  button.innerHTML = "🔊";
  button.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    width: 50px;
    height: 50px;
    background: #4285f4;
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    font-size: 20px;
    z-index: 10000;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    opacity: 0;
    transition: opacity 0.3s;
  `;

  button.addEventListener("click", () => {
    const text = window.getSelection().toString().trim();
    if (text) {
      chrome.runtime.sendMessage({
        action: "speakText",
        text: text,
      });
    }
  });

  document.body.appendChild(button);

  // Show button when text is selected
  document.addEventListener("mouseup", () => {
    const text = window.getSelection().toString().trim();
    button.style.opacity = text ? "1" : "0";
  });
}

// Initialize floating button
createFloatingButton();
