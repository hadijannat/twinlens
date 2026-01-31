# TwinLens

TwinLens is a privacy-first Chrome extension for viewing and validating
Asset Administration Shell (AASX) and AAS JSON files in a clean, modern
side panel.

## Why TwinLens

- **Fast** local parsing of AASX and JSON
- **Clear** submodel, document, and compliance views
- **Focused** tabbed workflow with compare mode
- **Privacy-first** by default

## Get Started (Unpacked)

```bash
npm install
npm run build
```

1. Open `chrome://extensions` and enable **Developer mode**
2. Click **Load unpacked** and choose the `dist/` folder

## Everyday Use

- Open the side panel from the TwinLens icon
- Drop an `.aasx` or `.json` file
- Review tabs: Overview, Submodels, Documents, Compliance, Raw JSON
- Pin assets to compare or export results

## Privacy

TwinLens keeps parsing and validation local. Network access is only used
when you opt into features like Registry lookups or AI helpers.

---

Want a contributor guide or architecture overview? Tell me and I’ll add it.
