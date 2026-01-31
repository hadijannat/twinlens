# TwinLens - AAS Digital Twin Viewer

View and validate Asset Administration Shell (AASX/JSON) files directly in your browser. Perfect for working with Industry 4.0 Digital Product Passports (DPP).

## Key Features

**Privacy First**
- All processing happens locally in your browser
- No data is uploaded to external servers
- Optional network features require explicit consent

**Full AAS Support**
- Reads AASX packages and JSON-LD files
- Supports AAS spec v2 and v3
- Recognizes IDTA submodel templates (Nameplate, Carbon Footprint, Technical Data, Documentation)

**Digital Product Passport Validation**
- Battery passport compliance checker based on EU Regulation 2023/1542
- Validates required fields and data quality
- Clear pass/fail indicators with detailed explanations

**Asset Comparison**
- Compare up to 4 assets side-by-side
- Identify differences in specifications and properties
- Persistent compare cart across sessions

**QR Code Scanning**
- Right-click any image to scan for DPP links
- Automatic detection of AAS-compatible URLs

**Page Scanner**
- Detects JSON-LD and AAS links on web pages
- Shows confidence score for detected assets

**AI Chat (Optional)**
- Ask questions about loaded assets
- Supports Anthropic Claude and OpenAI-compatible APIs
- Requires your own API key - no data shared with us

**Registry Browser (Optional)**
- Connect to BaSyx AAS registries
- Browse and load remote shells

## Use Cases

- Quality engineers validating supplier Digital Product Passports
- Developers testing AAS implementations
- Compliance officers checking regulatory requirements
- Researchers exploring Digital Twin standards

## Technical Details

- Works entirely offline after installation
- Supports large AASX files with embedded documents
- 3D model preview for CAD files (GLB, GLTF)
- Export comparison reports

## Open Source

TwinLens is free and open source. Report issues or contribute at:
https://github.com/[owner]/twinlens

## Permissions Explained

- "Read and change data on the sites you visit" - Only activated when you enable page scanning; needed to detect DPP links on web pages
- "Storage" - Saves your settings and compare cart locally
- "Side panel" - Displays the main viewer interface

No tracking. No analytics. Your data stays on your device.
