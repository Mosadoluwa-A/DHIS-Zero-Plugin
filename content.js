// content.js

// Inject filler.js into the page context
const script = document.createElement('script');
script.src = chrome.runtime.getURL('filler.js');
script.onload = () => script.remove();
(document.head || document.documentElement).appendChild(script);

// Forward messages from extension to the page context
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  window.postMessage({
    source: "DHIS2 Auto Filler",  // Use consistent name
    ...message
  }, "*");
});
