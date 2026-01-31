# Changelog

All notable changes to TwinLens will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-31

### Initial Public Release

First stable release of TwinLens, a privacy-first Chrome extension for viewing and validating Asset Administration Shell (AASX) files.

### Features

#### Core Viewing
- Side panel viewer with 8 tabs: Overview, Submodels, Documents, Compliance, Raw, Compare, Chat, Registry
- Support for AASX packages (ZIP-based) and JSON files
- AAS specification v2 and v3 support with automatic format detection
- IDTA submodel template recognition and specialized rendering

#### IDTA Template Support
- **Nameplate** - Manufacturer identification and product info
- **Carbon Footprint** - PCF data with calculation methodology
- **Technical Data** - Product specifications and properties
- **Handover Documentation** - Document index with file previews

#### Validation
- Zod-based schema validation with preprocessing for real-world files
- Official aas-core3.0-typescript library integration
- Battery passport compliance linter (11 rules based on EU Regulation 2023/1542)

#### Compare Cart
- Add up to 4 assets for side-by-side comparison
- Persistent storage across browser sessions
- Property-level diff highlighting

#### QR Code Scanning
- Right-click context menu for scanning images
- Native BarcodeDetector with jsQR fallback
- Automatic DPP link detection

#### Page Scanner
- DOM scanning for JSON-LD and AAS links
- Meta tag detection
- Confidence scoring for detected assets

#### AI Chat (Optional, Opt-in)
- Multi-provider support: Anthropic Claude, OpenAI-compatible APIs
- Asset context grounding for relevant answers
- Streaming responses
- Bring-your-own API key

#### Registry Browser (Optional, Opt-in)
- BaSyx registry client
- Shell discovery and browsing
- Bearer and Basic authentication

### Privacy

- All processing happens locally by default
- No analytics or telemetry
- Optional network features require explicit consent
- Minimal default permissions, optional host permissions on demand

### Architecture

- Chrome Extension Manifest v3
- React 18 for UI
- Web Workers for parsing (non-blocking)
- Lazy-loaded 3D viewer for CAD files

### Testing

- 118+ passing tests
- Unit tests for parsers, schemas, extractors
- Integration tests with real AASX fixtures

---

## [0.1.4] - 2025-01-31

### Added
- Comprehensive AAS validation preprocessing
- Deep cleaning of empty objects and arrays
- ValueId.keys validation fix

## [0.1.3] - 2025-01-30

### Added
- Blueprint gaps implementation
- Local-only mode
- Privacy UI with consent management
- AI grounding improvements

## [0.1.0] - 2025-01-29

### Added
- Initial development release
- Basic AASX parsing
- Side panel viewer prototype
