// Content script for text-to-speech extension

// This listener responds to requests from the sidebar to get the currently selected text.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getSelectedText") {
    const selectedText = window.getSelection().toString().trim();
    sendResponse({ text: selectedText });
  }
  // Return true to indicate you wish to send a response asynchronously.
  return true;
});
