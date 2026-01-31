/**
 * TwinLens Service Worker
 * Handles extension lifecycle, context menus, and side panel registration
 */

// Register side panel behavior on extension install
chrome.runtime.onInstalled.addListener(() => {
  // Set up side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Create context menu for .aasx files (future enhancement)
  chrome.contextMenus.create({
    id: 'open-in-twinlens',
    title: 'Open in TwinLens',
    contexts: ['link'],
    targetUrlPatterns: ['*://*/*.aasx', '*://*/*.AASX'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === 'open-in-twinlens' && info.linkUrl) {
    // Store the URL for the side panel to pick up
    chrome.storage.local.set({ pendingAasxUrl: info.linkUrl });

    // Open side panel if not already open
    if (tab?.id) {
      chrome.sidePanel.open({ tabId: tab.id });
    }
  }
});

// Listen for messages from the side panel
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
  if (message.type === 'GET_PENDING_URL') {
    chrome.storage.local.get('pendingAasxUrl', (result) => {
      sendResponse({ url: result.pendingAasxUrl });
      // Clear after retrieving
      chrome.storage.local.remove('pendingAasxUrl');
    });
    return true; // Keep channel open for async response
  }
});

export {};
