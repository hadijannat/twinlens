# TwinLens Privacy Policy

Effective date: January 31, 2026

TwinLens is a privacy‑first Chrome extension for viewing and validating
Asset Administration Shell (AASX) and AAS JSON files. This policy explains
what data TwinLens handles, when it is used, and your choices.

## Summary
- TwinLens processes files and page data locally by default.
- We do not operate our own servers for data collection.
- Data is sent to third parties only when you explicitly enable optional
  features (for example, AI providers or remote registry lookups).

## Data We Process
TwinLens may access the following data types depending on how you use it:

- **Website content and resources**: When page scanning is enabled, TwinLens
  analyzes page content such as JSON‑LD, links, and meta tags to detect AAS/DPP
  indicators.
- **Web history (URLs)**: The current page URL is used to identify AAS/DPP
  patterns and show scan results in the side panel.
- **User‑provided files**: AASX/JSON files you load into the extension.
- **Settings and preferences**: Stored locally in Chrome storage to remember
  your configuration (for example, validation mode, compare list, AI settings).
- **Authentication information** (optional): If you enable AI features and
  enter an API key, it is stored locally in Chrome storage.
- **Personal communications** (optional): If you use AI chat features, your
  prompts and extracted summaries are sent to the AI provider you select.

## How We Use Data
- To parse and display AASX/JSON files in the side panel.
- To validate content and show compliance findings.
- To scan the current page for AAS/DPP indicators when requested.
- To remember your settings and compare items.
- To send data to AI providers **only** when you explicitly enable AI features.

## Data Sharing
TwinLens does **not** sell your data.

Data is shared only in these cases:
- **AI Providers (optional)**: If enabled, relevant content and prompts are
  sent to the provider you choose (e.g., OpenAI, Anthropic, or OpenRouter).
- **Remote URLs (user‑initiated)**: If you open AASX/JSON or registry links,
  TwinLens will fetch those resources to display them.

These third parties handle data according to their own privacy policies.

## Data Storage & Retention
- Settings and scan results are stored **locally** in Chrome storage.
- We do not maintain a server‑side database of user data.
- You can clear extension data at any time via Chrome’s extension settings.

## Your Choices
- Use TwinLens entirely offline by not enabling AI or remote lookups.
- Disable page scanning in settings if you do not want website content analyzed.
- Remove stored settings by clearing extension data.

## Security
We use Chrome’s extension storage APIs and standard browser security to protect
locally stored data. No method is 100% secure, but we minimize data collection
and keep processing local by default.

## Contact
If you have questions or requests, please open an issue at:
https://github.com/hadijannat/twinlens/issues

## Changes
We may update this policy as the extension evolves. The effective date above
will be updated when changes are made.
