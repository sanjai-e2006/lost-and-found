// Background service worker for YoLost Chrome Extension

chrome.runtime.onInstalled.addListener(() => {
  console.log('YoLost Extension Installed!');
});

// Handle extension icon click
chrome.action.onClicked.addListener((tab) => {
  chrome.tabs.create({
    url: 'https://lost-and-found-pr4m.vercel.app'
  });
});

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'notification') {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'public/icon-128.png',
      title: request.title,
      message: request.message
    });
  }
});
