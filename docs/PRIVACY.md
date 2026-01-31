# TwinLens Privacy Policy

**Last updated:** January 31, 2025

## Overview

TwinLens is a privacy-first Chrome extension for viewing Asset Administration Shell (AASX) files and Digital Product Passports. We are committed to protecting your privacy and being transparent about our data practices.

**Key principle:** All data processing occurs locally in your browser. Your files never leave your device.

## Data We Collect

### AASX Files
- **Processing:** Files are parsed and displayed entirely within your browser
- **Storage:** Files are not uploaded to any external server
- **Persistence:** File data is only kept in memory during your session

### Local Settings
- **API Keys:** If you choose to use AI features, your API keys are stored locally in `chrome.storage.local`
- **Preferences:** User preferences (theme, display options) are stored locally
- **Compare Cart:** Assets saved for comparison are stored in IndexedDB within your browser

### What We Do NOT Collect
- We do not collect analytics or usage data
- We do not track your browsing activity
- We do not collect personal information
- We do not collect or transmit AASX file contents

## Third-Party Services

TwinLens offers optional AI-powered features that require you to provide your own API keys for:

### Anthropic Claude API
- When configured, your questions and asset context are sent to Anthropic's API
- Subject to [Anthropic's Privacy Policy](https://www.anthropic.com/privacy)

### OpenAI API
- When configured, your questions and asset context are sent to OpenAI's API
- Subject to [OpenAI's Privacy Policy](https://openai.com/privacy)

### OpenRouter API
- When configured, your questions are routed through OpenRouter
- Subject to [OpenRouter's Privacy Policy](https://openrouter.ai/privacy)

**Important:** These services are entirely optional. TwinLens works fully without any AI configuration.

## AAS Registry Connections

When you connect to an AAS Registry:
- Connection details are stored locally in your browser
- Queries are sent directly from your browser to the registry server
- No data passes through our servers

## Data Security

- All data processing occurs locally in your browser
- API keys are stored encrypted in Chrome's secure storage
- No data is transmitted to servers we control
- No cookies are used by TwinLens itself

## Permissions Explained

| Permission | Purpose |
|------------|---------|
| `sidePanel` | Displays TwinLens as a Chrome side panel |
| `storage` | Stores settings and compare cart locally |
| `contextMenus` | Adds "Open with TwinLens" right-click options |

## Children's Privacy

TwinLens is a technical tool for viewing industrial asset data and is not directed at children under 13.

## Changes to This Policy

We may update this privacy policy from time to time. We will notify users of any material changes by updating the "Last updated" date.

## Open Source

TwinLens is open source. You can review our code at:
https://github.com/YOUR_USERNAME/twinlens

## Contact

If you have questions about this privacy policy or TwinLens's data practices, please open an issue on our GitHub repository.

---

**Summary:** Your data stays on your device. AI features are optional and use your own API keys. We don't collect, store, or transmit your data.
