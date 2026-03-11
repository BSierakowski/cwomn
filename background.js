// background.js — minimal service worker for cwomn

chrome.runtime.onInstalled.addListener(() => {
  // Default: disabled
  chrome.storage.local.set({ cwomn_enabled: false });
});
