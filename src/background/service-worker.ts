/**
 * TwinLens Service Worker
 * Handles extension lifecycle, context menus, and side panel registration
 */

// Maximum allowed QR image size (5MB)
const MAX_QR_IMAGE_SIZE = 5 * 1024 * 1024;

// Register side panel behavior on extension install
chrome.runtime.onInstalled.addListener(() => {
  // Set up side panel to open on action click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  // Create context menu for .aasx file links
  chrome.contextMenus.create({
    id: 'open-in-twinlens',
    title: 'Open in TwinLens',
    contexts: ['link'],
    targetUrlPatterns: ['*://*/*.aasx', '*://*/*.AASX'],
  });

  // Create context menu for QR code images
  chrome.contextMenus.create({
    id: 'scan-qr-code',
    title: 'Scan QR Code for DPP',
    contexts: ['image'],
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === 'open-in-twinlens' && info.linkUrl) {
    // Store the URL for the side panel to pick up
    await chrome.storage.local.set({ pendingAasxUrl: info.linkUrl });

    // Open side panel if not already open
    if (tab?.id) {
      chrome.sidePanel.open({ tabId: tab.id });
    }
  }

  if (info.menuItemId === 'scan-qr-code' && info.srcUrl) {
    try {
      // Validate URL scheme
      let parsed: URL;
      try {
        parsed = new URL(info.srcUrl);
      } catch {
        throw new Error('Invalid URL');
      }

      if (!['https:', 'http:'].includes(parsed.protocol)) {
        throw new Error(`Invalid URL scheme: ${parsed.protocol}`);
      }

      // Fetch the image in the service worker (avoids CORS issues)
      const response = await fetch(info.srcUrl);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      // Check Content-Length header if available
      const contentLength = response.headers.get('Content-Length');
      if (contentLength && parseInt(contentLength, 10) > MAX_QR_IMAGE_SIZE) {
        throw new Error('Image too large (max 5MB)');
      }

      const blob = await response.blob();

      // Verify actual blob size
      if (blob.size > MAX_QR_IMAGE_SIZE) {
        throw new Error('Image too large (max 5MB)');
      }

      // Convert to base64 using FileReader (more efficient than byte-by-byte)
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error('Failed to read image'));
        reader.readAsDataURL(blob);
      });

      // Store the image data for the side panel
      await chrome.storage.local.set({
        pendingQRImage: {
          dataUrl,
          srcUrl: info.srcUrl,
        },
      });

      // Open side panel
      if (tab?.id) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
    } catch (error) {
      console.error('Failed to fetch QR image:', error);
      // Store error for the side panel to display
      await chrome.storage.local.set({
        pendingQRImage: {
          error: 'Failed to load image',
          srcUrl: info.srcUrl,
        },
      });
      if (tab?.id) {
        chrome.sidePanel.open({ tabId: tab.id });
      }
    }
  }
});

// Badge colors for different confidence levels
const BADGE_COLORS = {
  high: '#22c55e', // green
  medium: '#f59e0b', // amber
  low: '#6b7280', // gray
  none: '', // no badge
};

const BADGE_TEXT = {
  high: '\u2713', // checkmark
  medium: '?',
  low: '.',
  none: '',
};

// Listen for messages from side panel and content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'GET_PENDING_URL') {
    chrome.storage.local.get('pendingAasxUrl', (result) => {
      sendResponse({ url: result.pendingAasxUrl });
      // Clear after retrieving
      chrome.storage.local.remove('pendingAasxUrl');
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'GET_PENDING_QR') {
    chrome.storage.local.get('pendingQRImage', (result) => {
      sendResponse(result.pendingQRImage ?? null);
      // Clear after retrieving
      chrome.storage.local.remove('pendingQRImage');
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'PAGE_SCAN_RESULT' && sender.tab?.id) {
    const { result } = message;
    const tabId = sender.tab.id;

    // Update badge for this tab
    const confidence = result.confidence as keyof typeof BADGE_COLORS;
    const badgeColor = BADGE_COLORS[confidence];
    const badgeText = BADGE_TEXT[confidence];

    if (badgeText) {
      chrome.action.setBadgeText({ tabId, text: badgeText });
      chrome.action.setBadgeBackgroundColor({ tabId, color: badgeColor });
    } else {
      chrome.action.setBadgeText({ tabId, text: '' });
    }

    // Store the scan result for this tab
    chrome.storage.local.set({
      [`scanResult_${tabId}`]: result,
    });

    sendResponse({ received: true });
    return false;
  }

  if (message.type === 'GET_SCAN_RESULT') {
    const tabId = message.tabId;
    chrome.storage.local.get(`scanResult_${tabId}`, (result) => {
      sendResponse(result[`scanResult_${tabId}`] ?? null);
    });
    return true;
  }
});

// Clean up scan results when tabs are closed
chrome.tabs.onRemoved.addListener(async (tabId) => {
  try {
    await chrome.storage.local.remove(`scanResult_${tabId}`);
  } catch (err) {
    console.warn('Failed to cleanup scan result for tab:', tabId, err);
  }
});

/**
 * Clean up orphaned scan results from tabs that no longer exist
 * This handles edge cases where tabs were closed while extension was disabled
 */
async function cleanupOrphanedResults(): Promise<void> {
  try {
    const storage = await chrome.storage.local.get(null);
    const scanKeys = Object.keys(storage).filter((k) => k.startsWith('scanResult_'));

    if (scanKeys.length === 0) return;

    const tabs = await chrome.tabs.query({});
    const tabIds = new Set(tabs.map((t) => String(t.id)));

    const orphaned = scanKeys.filter((k) => {
      const tabId = k.replace('scanResult_', '');
      return !tabIds.has(tabId);
    });

    if (orphaned.length > 0) {
      await chrome.storage.local.remove(orphaned);
      console.log(`Cleaned up ${orphaned.length} orphaned scan result(s)`);
    }
  } catch (err) {
    console.warn('Failed to cleanup orphaned results:', err);
  }
}

// Run orphan cleanup on extension install/update
chrome.runtime.onInstalled.addListener(() => {
  cleanupOrphanedResults();
});

export {};
