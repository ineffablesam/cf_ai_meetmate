console.log('AI Meeting Summarizer content script loaded');

// Listen for messages from the extension
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'pageInfo') {
    sendResponse({
      title: document.title,
      url: window.location.href,
      isGoogleMeet: window.location.hostname.includes('meet.google.com'),
    });
  }
});

// Detect when Google Meet is loaded
document.addEventListener('DOMContentLoaded', () => {
  if (window.location.hostname.includes('meet.google.com')) {
    console.log('Google Meet detected');
  }
});