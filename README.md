# Dados Card

A lightweight Home Assistant custom card for **light** entities, styled to match the Dados design system.

## Install via HACS

1. Open **HACS** in Home Assistant.
2. Go to **Frontend**.
3. Click the three-dot menu → **Custom repositories**.
4. Add repository: `https://github.com/agrestisdavid/dados-card`.
5. Category: **Dashboard**.
6. Install **Dados Card**.
7. Restart Home Assistant.
8. Verify the Lovelace resource exists:
   - `/hacsfiles/dados-card/dados-card.js`

## Features

- Compact header layout: icon tile, name/state, toggle button.
- **Tap the icon** → toggles the light on/off.
- **Hold the icon** → opens the Home Assistant more-info dialog.
- **Tap the name/state area** → expands/collapses the brightness slider (compact mode).
- **Toggle button** → calls `light.toggle`.
- Expanded **brightness slider** → calls `light.turn_on` with `brightness`.
- Dynamic **RGB color** from the light entity tints the icon tile and toggle.
- **Glow effect** behind the icon tile using the entity's color.

## Configuration

```yaml
type: custom:dados-card
entity: light.living_room
name: Living Room Light    # optional – overrides friendly_name
icon: mdi:ceiling-light   # optional – overrides entity icon
compact: true              # optional – default: true
```

### Options

| Key | Type | Default | Description |
|-----|------|---------|-------------|
| `entity` | string | **required** | Light entity ID |
| `name` | string | friendly_name | Override the displayed name |
| `icon` | string | state-based | Override the icon (MDI) |
| `compact` | boolean | `true` | `true` = starts collapsed, tap name to expand |

## Quick Start

After HACS installation:

1. Open a dashboard and click **Edit dashboard**.
2. Add a **Manual card**.
3. Paste the example YAML above.
4. Replace `entity` with your own light entity.

## Troubleshooting

- If the card does not appear, do a **hard refresh** (Ctrl/Cmd + Shift + R).
- Confirm the resource path is exactly `/hacsfiles/dados-card/dados-card.js`.
- If Home Assistant still shows an old version, restart Home Assistant once more.
