# TwinLens Privacy Policy

**Last updated:** January 2025

TwinLens is a privacy-first browser extension for viewing and validating Asset Administration Shell (AASX) files. This policy explains what data the extension accesses and how it's handled.

## Summary

- **No data collection by default** - TwinLens does not collect, transmit, or store any personal data
- **Local processing only** - All file parsing and validation happens entirely in your browser
- **Optional network features** - Features like AI Chat and Registry require explicit opt-in and use your own API keys

## Data Handling

### What We Never Do

- Collect usage analytics or telemetry
- Track your browsing activity
- Upload your AASX files to any server
- Store your documents or file contents externally
- Share any data with third parties

### Local Data Storage

TwinLens stores the following data locally in your browser using Chrome's storage API:

| Data | Purpose | Location |
|------|---------|----------|
| Settings | Your preferences (theme, display options) | `chrome.storage.local` |
| Compare Cart | Assets you've added for comparison | `chrome.storage.local` |
| API Keys | Your AI provider credentials (if configured) | `chrome.storage.local` |
| Registry Connections | Saved registry URLs (if configured) | `chrome.storage.local` |
| Privacy Consent | Record of your opt-in choices | `chrome.storage.local` |

This data never leaves your device unless you explicitly configure network features.

## Permissions Explained

### Required Permissions

| Permission | Why It's Needed |
|------------|-----------------|
| `sidePanel` | Display the main TwinLens viewer interface |
| `storage` | Save your settings and compare cart locally |
| `contextMenus` | Add "Scan for QR Code" to right-click menu |
| `activeTab` | Read the current tab when you click the extension icon |
| `scripting` | Inject the page scanner (only when enabled) |

### Optional Permissions (Requested On Demand)

| Permission | When Requested | Purpose |
|------------|----------------|---------|
| `https://api.anthropic.com/*` | When you enable AI Chat with Anthropic | Send chat messages to Claude API |
| `https://api.openai.com/*` | When you enable AI Chat with OpenAI | Send chat messages to OpenAI API |
| `https://openrouter.ai/*` | When you enable AI Chat with OpenRouter | Send chat messages to OpenRouter API |
| `https://*/*` | When you enable Registry or ID resolution | Connect to AAS registries and resolve ID links |

**You must explicitly grant these permissions.** TwinLens will prompt you before requesting any optional permission.

## Network Features

### AI Chat (Optional)

When you configure AI Chat:
- Your API key is stored locally and sent directly to your chosen provider
- Chat messages include a summary of the loaded asset (not the full file)
- We do not proxy or intercept your API calls
- See your provider's privacy policy for how they handle data

### Registry Browser (Optional)

When you connect to an AAS registry:
- Requests go directly to the registry URL you configure
- Authentication credentials are stored locally
- We do not operate any registries ourselves

### ID Link Resolution (Optional)

When you enable ID resolution:
- The extension may fetch URLs that appear to be Digital Product Passport links
- Requests go directly to the target URL
- No data is sent to any TwinLens servers

## Page Scanner

When you enable the page scanner:
- The extension reads the current page's DOM to find JSON-LD and AAS-related links
- This information is displayed to you and not transmitted anywhere
- The scanner runs only on pages where you activate it

## QR Code Scanning

When you scan a QR code:
- Image processing happens entirely in your browser
- Decoded URLs are displayed to you
- No image data is transmitted externally

## Third Parties

TwinLens does not use any third-party analytics, crash reporting, or tracking services.

If you configure AI Chat, your data is subject to your chosen provider's privacy policy:
- [Anthropic Privacy Policy](https://www.anthropic.com/privacy)
- [OpenAI Privacy Policy](https://openai.com/privacy)

## Children's Privacy

TwinLens does not knowingly collect any data from children or anyone else.

## Changes to This Policy

We may update this privacy policy to reflect changes in the extension. Material changes will be noted in the extension's changelog.

## Contact

For privacy questions or concerns, please open an issue at:
https://github.com/[owner]/twinlens/issues

## Open Source

TwinLens is open source. You can review the code yourself:
https://github.com/[owner]/twinlens
