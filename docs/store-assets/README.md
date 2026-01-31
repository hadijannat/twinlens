# Chrome Web Store Assets

This directory contains assets for the Chrome Web Store listing.

## Required Screenshots (1280x800 or 640x400)

Capture these screens:

### 1. `screenshot-01-empty-state.png`
- Show the side panel with drop zone
- Include the privacy badge ("Your data stays local")
- Clean, welcoming first-run experience

### 2. `screenshot-02-overview.png`
- Load an AASX file (e.g., Festo sample)
- Show Overview tab with:
  - Asset thumbnail (if available)
  - Nameplate data (manufacturer, serial number)
  - Basic asset information

### 3. `screenshot-03-submodels.png`
- Submodels tree expanded
- Show a template view (Digital Nameplate or Technical Data)
- Demonstrate the structured data display

### 4. `screenshot-04-compliance.png`
- Compliance tab open
- Show battery regulation checks
- Display pass/fail indicators

### 5. `screenshot-05-chat.png`
- Chat tab active
- Show AI response with citations
- Demonstrate the conversational interface

## Promotional Tiles

### Small Promo (440x280) - `promo-small.png`
Content:
- TwinLens logo centered
- Tagline: "Digital Twin Viewer for Chrome"
- 3-4 feature icons: Security lock, 3D cube, Chat bubble, Compare

### Large Promo (920x680) - `promo-large.png`
Content:
- Full feature showcase
- Multiple screenshots arranged
- Key features highlighted:
  - "Privacy-First" with lock icon
  - "AASX & Digital Passport Support"
  - "AI-Powered Insights"
  - "Compare Assets"

### Marquee (optional, 1400x560) - `promo-marquee.png`
Hero image for featured listing.

## Icons

Verify high-quality icons at all sizes in `public/icons/`:
- `icon16.png` - Toolbar
- `icon48.png` - Extensions page
- `icon128.png` - Web Store listing

## Design Guidelines

- Use consistent color scheme (primary blue: #0ea5e9)
- Include device frame or browser context
- Show real data (use official IDTA samples)
- Ensure text is readable at thumbnail size
- No personal or sensitive information in screenshots
