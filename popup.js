const STORAGE_KEY = 'cwomn_enabled';

const btn = document.getElementById('toggleBtn');
const status = document.getElementById('status');

function updateUI(enabled) {
  if (enabled) {
    btn.textContent = '💤 Stop Hewwoifying';
    btn.className = 'toggle-btn on';
    status.textContent = 'Twanswation is on~ uwu';
    status.className = 'status active';
  } else {
    btn.textContent = '✨ Hewwoify! ✨';
    btn.className = 'toggle-btn off';
    status.textContent = 'Twanswation is off';
    status.className = 'status';
  }
}

// Load current state
chrome.storage.local.get([STORAGE_KEY], (result) => {
  updateUI(!!result[STORAGE_KEY]);
});

btn.addEventListener('click', () => {
  chrome.storage.local.get([STORAGE_KEY], (result) => {
    const wasEnabled = !!result[STORAGE_KEY];
    const nowEnabled = !wasEnabled;

    chrome.storage.local.set({ [STORAGE_KEY]: nowEnabled }, () => {
      updateUI(nowEnabled);

      // Send message to active tab's content script
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (tabs[0]?.id) {
          chrome.tabs.sendMessage(tabs[0].id, {
            action: nowEnabled ? 'enable' : 'disable'
          });
        }
      });
    });
  });
});
