# Dados Cards

A Home Assistant custom-card **bundle** repository.  
This repo is prepared to host multiple custom cards in one HACS installation.

## Install via HACS

1. Open **HACS** in Home Assistant.
2. Go to **Frontend**.
3. Click the three-dot menu → **Custom repositories**.
4. Add repository: `https://github.com/agrestisdavid/dados-cards`.
5. Category: **Dashboard**.
6. Install **Dados Cards**.
7. Restart Home Assistant.
8. Verify the Lovelace resource exists:
   - `/hacsfiles/dados-cards/dados-cards.js`

## Currently included cards

### Dados Light Card

Use this card with:

```yaml
type: custom:dados-light-card
entity: light.living_room
name: Living Room Light
```

## Backward compatibility

- The bundle currently also registers the legacy element name `dados-card` for existing dashboards.
- New setups should use `custom:dados-light-card`.

## Goal of this repository

This repository is now structured as a **bundle base** so additional custom cards can be added later while users keep only one HACS repository/resource.

## Troubleshooting

- Hard refresh the browser (`Ctrl/Cmd + Shift + R`).
- Confirm the resource path is exactly `/hacsfiles/dados-cards/dados-cards.js`.
- Restart Home Assistant if an old cached JS is still loaded.
