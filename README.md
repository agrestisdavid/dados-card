# dados-card

Dados Card ist eine Home-Assistant Custom Card im Dados-Stil.

## Installation (HACS)

1. HACS → **Frontend** → Custom repositories
2. Repository hinzufügen: `https://github.com/agrestisdavid/dados-card`
3. Kategorie: **Dashboard**
4. "Dados Card" installieren
5. Home Assistant neu laden
6. In Lovelace unter **Ressourcen** prüfen, dass `/hacsfiles/dados-card/dist/dados-card.js` geladen ist.

## Erste Version (Light)

Aktuell ist die erste Version für `light`-Entities umgesetzt.

### Funktionen

- **Compact Mode** (Standard):
  - Layout: Icon links, Name/State mittig, Toggle rechts
  - Tap auf die Karte: erweitert die Karte
- **Expanded Mode**:
  - Slider + Modus-Button für `Brightness` / `Hue` / `Temperature`
  - Modus-Button schaltet die Slider-Funktion durch
- **Hold auf dem linken Icon**: öffnet `more-info`
- **Tap auf Toggle rechts**: `light.toggle`

## Konfiguration

```yaml
type: custom:dados-card
entity: light.kommode_wohnzimmer
name: Kommode Wohnzimmer
compact: true
```

Optional:

- `icon`: überschreibt das Entity-Icon
- `compact`: `true` oder `false`

## Button-Card Templates

Alle vorhandenen YAML-Templates wurden nach:

`/templates/button-card-templates`

verschoben.

