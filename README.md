# Dados Card

A lightweight and stable first version of a Home Assistant custom card for **light** entities.

## Install via HACS

1. Open **HACS** in Home Assistant.
2. Go to **Frontend**.
3. Click the three-dot menu → **Custom repositories**.
4. Add repository: `https://github.com/agrestisdavid/dados-card`.
5. Category: **Dashboard**.
6. Install **Dados Card**.
7. Restart Home Assistant.
8. Verify the Lovelace resource exists:
   - `/hacsfiles/dados-card/dist/dados-card.js`

## Card Scope (Stability First)

This first release intentionally supports only `light` entities with a stable baseline feature set:

- Compact header layout: icon, name/state, toggle.
- Tap on the text area to expand/collapse controls (when `compact: true`).
- Hold on the icon to open Home Assistant `more-info`.
- Toggle button to call `light.toggle`.
- Expanded brightness slider (`light.turn_on` with `brightness`).

## Configuration

```yaml
type: custom:dados-card
entity: light.living_room
name: Living Room Light
compact: true
```

### Optional keys

- `name`: Override friendly name.
- `icon`: Override entity icon.
- `compact`: `true` (default) or `false`.

## Quick Installation & Usage Guide

After HACS installation:

1. Open a dashboard and click **Edit dashboard**.
2. Add a **Manual card**.
3. Paste the example YAML above.
4. Replace `entity` with your own light entity.
5. Save and test:
   - tap text area → expand/collapse
   - hold icon → more-info
   - tap toggle → on/off
   - move slider (expanded) → brightness
