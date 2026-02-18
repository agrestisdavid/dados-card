const CARD_VERSION = '1.6.0';

// ─── Constants ───────────────────────────────────────────────

const DEFAULTS = {
  icon_on:         'mdi:lightbulb',
  icon_off:        'mdi:lightbulb-outline',
  toggle_icon_on:  'mdi:toggle-switch',
  toggle_icon_off: 'mdi:toggle-switch-off-outline',
  brightness_icon: 'mdi:brightness-percent',
  color_temp_icon: 'mdi:thermometer',
  hue_icon:        'mdi:palette',
  hold_ms:         500,
  glow:            true,
};

/** Fallback when the light has no color/temp info and no config.color is set.
 *  Approximates var(--state-light-on-color). */
const FALLBACK_RGB = [255, 218, 120];

// ─── Color utilities ─────────────────────────────────────────

const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));

function rgba(rgb, a) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function rgbCss(rgb) {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

/** hex / rgb(r,g,b) → [r,g,b] or null (for CSS vars, keywords, …). */
function parseRgb(color) {
  if (!color || typeof color !== 'string') return null;
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    return hex.length === 3
      ? hex.split('').map(c => parseInt(c + c, 16))
      : [0, 2, 4].map(i => parseInt(hex.slice(i, i + 2), 16));
  }
  const m = color.match(/^rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)$/i);
  return m ? [+m[1], +m[2], +m[3]] : null;
}

/** Simplified Tanner-Helland algorithm: mireds → [r,g,b]. */
function miredsToRgb(mireds) {
  const t = (1_000_000 / mireds) / 100;
  const r = t <= 66 ? 255 : clamp(Math.round(329.698727 * Math.pow(t - 60, -0.13320476)), 0, 255);
  const g = t <= 66
    ? clamp(Math.round(99.4708025 * Math.log(t) - 161.1195681), 0, 255)
    : clamp(Math.round(288.1221695 * Math.pow(t - 60, -0.07551485)), 0, 255);
  const b = t >= 66 ? 255 : (t <= 19 ? 0 : clamp(Math.round(138.5177312 * Math.log(t - 10) - 305.0447927), 0, 255));
  return [r, g, b];
}

/** Extract the light's current RGB from state attributes. */
function haLightRgb(stateObj) {
  if (stateObj.attributes.rgb_color) return [...stateObj.attributes.rgb_color];
  if (typeof stateObj.attributes.color_temp === 'number') return miredsToRgb(stateObj.attributes.color_temp);
  return null; // signal "no color info"
}

// ─── Stylesheet ───────────────────────────────────────────────
// 1rem = 16px
// Compact height = 5.25rem (84px) = 2 × 1.3125rem padding + 2.625rem row
// Card fills parent height if a grid row height is defined (sections dashboard)

const STYLES = /* css */ `
  :host {
    display: block;
    height: 100%;
  }

  ha-card {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 5rem;
    box-sizing: border-box;
    border-radius: 2.25rem;
    padding: 1.3125rem 1.25rem;
    overflow: hidden;
    backdrop-filter: blur(20px);
    background: var(--dados-card-bg, var(--ha-card-background, var(--card-background-color)));
  }

  /* ── Main row: always at top, vertically centered within its own height ── */
  .row {
    display: grid;
    grid-template-columns: 3.375rem 1fr auto;
    align-items: center;
    gap: 0.625rem;
    flex-shrink: 0;
  }

  /* ── Icon tile ───────────────────────────────────────────────── */
  .icon-tile {
    width: 3.375rem;
    height: 3.375rem;
    border-radius: 1.375rem;
    background: var(--dados-cell-bg, rgba(127,127,127,0.15));
    box-shadow: var(--dados-glow, none);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: none;
    padding: 0;
    overflow: hidden;
    flex-shrink: 0;
    transition: background 0.3s, box-shadow 0.3s;
  }

  .icon-tile ha-icon {
    --mdc-icon-size: 2.25rem;
    color: var(--dados-icon-color, var(--contrast2, #fff));
    transition: color 0.3s;
  }

  /* ── Text block ──────────────────────────────────────────────── */
  .text { min-width: 0; cursor: pointer; }

  .name {
    font-size: var(--dados-name-fs, 1rem);
    font-weight: 500;
    line-height: 1.15;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--dados-name-color, var(--contrast16, var(--primary-text-color)));
    letter-spacing: 0.025rem;
    padding-left: 0.1875rem;
  }

  .state {
    font-size: var(--dados-state-fs, 0.875rem);
    font-weight: 400;
    line-height: 1.15;
    margin-top: -0.0625rem;
    color: var(--dados-state-color, var(--contrast12, var(--secondary-text-color)));
    letter-spacing: 0.0375rem;
    padding-left: 0.1875rem;
  }

  /* ── Toggle button ───────────────────────────────────────────── */
  .toggle-btn {
    width: 3.5625rem;
    height: 3.5625rem;
    border: none;
    border-radius: 1.5rem;
    background: var(--contrast3, rgba(127,127,127,0.15));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .toggle-btn ha-icon {
    --mdc-icon-size: 2.25rem;
    color: var(--dados-toggle-color, var(--secondary-text-color));
    transition: color 0.2s;
  }

  /* ── Slider controls ─────────────────────────────────────────── */
  .controls {
    margin-top: 0.875rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
    flex-shrink: 0;
  }

  .slider-row {
    display: grid;
    grid-template-columns: 1fr 3.5625rem;
    gap: 0.5rem;
    align-items: center;
  }

  /* Slider wrapper — clips thumb overflow at pill corners */
  .slider-wrap {
    position: relative;
    overflow: hidden;
    border-radius: 1.5rem;
    height: 3.5625rem;
    display: block;
  }

  /* ── Brightness track + progress (real elements, border-radius friendly) ── */
  .bright-track {
    position: absolute;
    inset: 0;
    border-radius: inherit;
  }
  .bright-progress {
    position: absolute;
    top: 0;
    bottom: 0;
    left: 0;
    border-radius: inherit;
  }

  /* Pill slider — shared base */
  .dado-slider {
    -webkit-appearance: none;
    appearance: none;
    display: block;
    width: 100%;
    height: 3.5625rem;
    border-radius: 1rem;
    outline: none;
    cursor: pointer;
    margin: 0;
    padding: 0;
  }

  /* White oval thumb (all sliders) — no shadow */
  .dado-slider::-webkit-slider-thumb {
    -webkit-appearance: none;
    width: 0.5625rem;
    height: 2.625rem;
    border-radius: 0.5625rem;
    background: #fff;
    box-shadow: none;
    cursor: pointer;
  }
  .dado-slider::-moz-range-thumb {
    width: 0.5625rem;
    height: 2.625rem;
    border-radius: 0.5625rem;
    background: #fff;
    box-shadow: none;
    border: none;
    cursor: pointer;
  }

  .dado-slider::-moz-range-track {
    height: 3.5625rem;
    border-radius: 1.5rem;
    border: none;
  }

  /* ── Brightness slider: transparent — track + progress are separate divs ── */
  .brightness-slider {
    position: relative;
    z-index: 1;
    background: transparent;
  }
  .brightness-slider::-moz-range-track {
    background: transparent;
  }

  /* ── Color-temp slider: low→high temperature gradient ── */
  .colortemp-slider {
    background: linear-gradient(90deg,
      rgba(var(--temperature-low-rgb, 177, 197, 255), 1) 0%,
      rgba(var(--temperature-high-rgb, 255, 175, 131), 1) 100%);
  }
  .colortemp-slider::-moz-range-track {
    background: linear-gradient(90deg,
      rgba(var(--temperature-low-rgb, 177, 197, 255), 1) 0%,
      rgba(var(--temperature-high-rgb, 255, 175, 131), 1) 100%);
  }

  /* ── Hue slider: full hue rainbow ── */
  .hue-slider {
    background: linear-gradient(to right,
      #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 66%, #f0f 83%, #f00 100%);
  }
  .hue-slider::-moz-range-track {
    background: linear-gradient(to right,
      #f00 0%, #ff0 17%, #0f0 33%, #0ff 50%, #00f 66%, #f0f 83%, #f00 100%);
  }

  /* ── Indicator button next to each slider ── */
  .ctrl-btn {
    width: 3.5625rem;
    height: 3.5625rem;
    border: none;
    border-radius: 1.125rem;
    background: var(--contrast3, rgba(127,127,127,0.15));
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
    flex-shrink: 0;
    cursor: default;
  }
  .ctrl-btn ha-icon {
    --mdc-icon-size: 2rem;
    color: var(--contrast12, var(--secondary-text-color));
  }

  .hidden { display: none !important; }
`;

// ─── Editor schema ───────────────────────────────────────────

const EDITOR_SCHEMA = [
  { name: 'entity',   required: true, selector: { entity: { domain: 'light' } } },
  { name: 'name',     label: 'Name',  selector: { text: {} } },
  {
    type: 'expandable', title: 'Farben',
    schema: [
      { name: 'color',                label: 'Farbe — Img Cell (Standard: Lichtfarbe)',         selector: { text: {} } },
      { name: 'glow_color',           label: 'Glow-Farbe (Standard: Lichtfarbe)',               selector: { text: {} } },
      { name: 'toggle_color',         label: 'Toggle Color',                                    selector: { text: {} } },
      { name: 'icon_color',           label: 'Icon-Farbe wenn an',                              selector: { text: {} } },
      { name: 'icon_color_off',       label: 'Icon-Farbe wenn aus',                             selector: { text: {} } },
      { name: 'brightness_color',     label: 'Brightness Slider Farbe',                         selector: { text: {} } },
      { name: 'card_background_color',label: 'Kartenhintergrund',                               selector: { text: {} } },
    ],
  },
  {
    type: 'expandable', title: 'Icons',
    schema: [
      { name: 'icon_on',        label: 'Icon (An)',              selector: { icon: {} } },
      { name: 'icon_off',       label: 'Icon (Aus)',             selector: { icon: {} } },
      { name: 'toggle_icon_on', label: 'Toggle Icon (An)',       selector: { icon: {} } },
      { name: 'toggle_icon_off',label: 'Toggle Icon (Aus)',      selector: { icon: {} } },
      { name: 'brightness_icon',label: 'Helligkeit Slider Icon', selector: { icon: {} } },
      { name: 'color_temp_icon',label: 'Farbtemperatur Slider Icon', selector: { icon: {} } },
      { name: 'hue_icon',       label: 'Farbe (Hue) Slider Icon', selector: { icon: {} } },
    ],
  },
  {
    type: 'expandable', title: 'Schrift & Effekte',
    schema: [
      { name: 'name_font_size',  label: 'Name Schriftgröße (z.B. 1rem)',          selector: { text: {} } },
      { name: 'state_font_size', label: 'State Schriftgröße (z.B. 0.875rem)',     selector: { text: {} } },
      { name: 'name_color',      label: 'Name Farbe',                             selector: { text: {} } },
      { name: 'state_color',     label: 'State Farbe',                            selector: { text: {} } },
      { name: 'glow',            label: 'Glow-Effekt',                            selector: { boolean: {} } },
    ],
  },
];

// ─── Editor element ──────────────────────────────────────────

class DadosCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = { ...config };
    this._form ? (this._form.data = this._config) : this._build();
  }

  set hass(h) {
    this._hass = h;
    if (this._form) this._form.hass = h;
  }

  _build() {
    const form = document.createElement('ha-form');
    form.schema = EDITOR_SCHEMA;
    form.data = this._config;
    form.hass = this._hass;
    form.computeLabel = s => s.label ?? s.name;
    form.addEventListener('value-changed', e => {
      this._config = e.detail.value;
      this.dispatchEvent(new CustomEvent('config-changed', {
        detail: { config: this._config }, bubbles: true, composed: true,
      }));
    });
    this._form = form;
    this.shadowRoot.appendChild(form);
  }
}

if (!customElements.get('dados-card-editor')) {
  customElements.define('dados-card-editor', DadosCardEditor);
}

// ─── Card element ─────────────────────────────────────────────

class DadosCard extends HTMLElement {

  // ── Static API ─────────────────────────────────────────────

  static getConfigElement() { return document.createElement('dados-card-editor'); }

  static getStubConfig() {
    return { type: 'custom:dados-card', entity: 'light.example', name: 'Dados Light' };
  }

  // ── HA lifecycle ───────────────────────────────────────────

  setConfig(config) {
    if (!config?.entity) throw new Error('entity required');
    this._cfg = { ...DEFAULTS, ...config };
    this._expanded = false;
    this._stateKey = null;
    this._effectiveRgb = FALLBACK_RGB;
    this._lightRgb = null;

    if (!this.shadowRoot) this.attachShadow({ mode: 'open' });
    this._buildDom();
    if (this._hass) this._update();
  }

  set hass(h) {
    this._hass = h;
    this._update();
  }

  getCardSize() { return this._expanded ? 4 : 2; }

  getLayoutOptions() {
    return { grid_rows: 1, grid_min_rows: 1, grid_columns: 2, grid_min_columns: 1 };
  }

  // ── DOM build (once) ───────────────────────────────────────

  _buildDom() {
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card>
        <div class="row">
          <button class="icon-tile" id="iconBtn" aria-label="Toggle">
            <ha-icon id="iconEl"></ha-icon>
          </button>
          <div class="text" id="textBlock">
            <div class="name"  id="nameEl"></div>
            <div class="state" id="stateEl"></div>
          </div>
          <button class="toggle-btn" id="toggleBtn" aria-label="Toggle">
            <ha-icon id="toggleIconEl"></ha-icon>
          </button>
        </div>
        <div class="controls hidden" id="controls">
          <div class="slider-row" id="brightRow">
            <div class="slider-wrap">
              <div class="bright-track" id="brightTrack"></div>
              <div class="bright-progress" id="brightProgress"></div>
              <input class="dado-slider brightness-slider" id="brightSlider"
                     type="range" min="1" max="255" step="1" aria-label="Helligkeit"/>
            </div>
            <button class="ctrl-btn" tabindex="-1">
              <ha-icon id="brightIcon"></ha-icon>
            </button>
          </div>
          <div class="slider-row hidden" id="ctRow">
            <div class="slider-wrap">
              <input class="dado-slider colortemp-slider" id="ctSlider"
                     type="range" step="1" aria-label="Farbtemperatur"/>
            </div>
            <button class="ctrl-btn" tabindex="-1">
              <ha-icon id="ctIcon"></ha-icon>
            </button>
          </div>
          <div class="slider-row hidden" id="hueRow">
            <div class="slider-wrap">
              <input class="dado-slider hue-slider" id="hueSlider"
                     type="range" min="0" max="360" step="1" aria-label="Farbe"/>
            </div>
            <button class="ctrl-btn" tabindex="-1">
              <ha-icon id="hueIcon"></ha-icon>
            </button>
          </div>
        </div>
      </ha-card>`;

    const $ = id => this.shadowRoot.getElementById(id);
    this._el = {
      card:         this.shadowRoot.querySelector('ha-card'),
      iconBtn:      $('iconBtn'),   iconEl:      $('iconEl'),
      nameEl:       $('nameEl'),    stateEl:     $('stateEl'),
      toggleBtn:    $('toggleBtn'), toggleIconEl:$('toggleIconEl'),
      textBlock:    $('textBlock'),
      controls:     $('controls'),
      brightRow:    $('brightRow'), brightSlider:$('brightSlider'), brightIcon: $('brightIcon'),
      brightTrack:  $('brightTrack'), brightProgress: $('brightProgress'),
      ctRow:        $('ctRow'),     ctSlider:    $('ctSlider'),     ctIcon:     $('ctIcon'),
      hueRow:       $('hueRow'),    hueSlider:   $('hueSlider'),    hueIcon:    $('hueIcon'),
    };
    this._bindEvents();
  }

  // ── Update (targeted, dirty-checked) ──────────────────────

  _update() {
    if (!this._hass || !this._el) return;

    const state = this._hass.states[this._cfg.entity];
    if (!state) {
      if (this._stateKey !== '__missing__') {
        this._stateKey = '__missing__';
        this._el.nameEl.textContent  = `Entity not found: ${this._cfg.entity}`;
        this._el.stateEl.textContent = '';
      }
      return;
    }

    const hs  = state.attributes.hs_color ?? [];
    const key = [
      state.state,
      state.attributes.brightness   ?? '',
      state.attributes.color_temp   ?? '',
      state.attributes.rgb_color    ?? '',
      hs[0] ?? '',
    ].join('|');
    if (key === this._stateKey) return;
    this._stateKey = key;

    const isOn = state.state === 'on';

    // ── Capabilities ───────────────────────────────────────
    const hasBright = this._supports(state, 'brightness');
    const hasCT     = this._supports(state, 'color_temp');
    const hasColor  = this._supports(state, 'color');
    const hasAny    = hasBright || hasCT || hasColor;

    this._el.brightRow.classList.toggle('hidden', !hasBright);
    this._el.ctRow.classList.toggle('hidden', !hasCT);
    this._el.hueRow.classList.toggle('hidden', !hasColor);
    if (!hasAny) { this._expanded = false; }
    this._el.controls.classList.toggle('hidden', !this._expanded || !hasAny);

    // ── Color resolution ───────────────────────────────────
    //
    // Priority for Img Cell:
    //   1. config.color  (user override, hex/rgb or CSS var)
    //   2. HA light's rgb_color / color_temp → converted to RGB
    //   3. FALLBACK_RGB  [255,218,120]  (≈ --state-light-on-color)
    //
    // Priority for Glow:
    //   1. config.glow_color (or config.color) — any CSS color string
    //   2. HA light's rgb_color / color_temp → converted to RGB
    //   3. FALLBACK_RGB
    //
    // Toggle colour is independent: config.toggle_color → HA rgb_color → FALLBACK_RGB

    const lightRgb   = haLightRgb(state);   // may be null if no color info
    this._lightRgb = lightRgb;
    const cfgRgb     = parseRgb(this._cfg.color);   // null for CSS vars

    // effectiveRgb: used for img cell background (NOT for brightness slider)
    const effectiveRgb = cfgRgb ?? lightRgb ?? FALLBACK_RGB;
    // lightRgb stored separately so the brightness slider can fall back to the
    // entity's actual colour without being polluted by config.color (img cell).
    this._lightRgb = lightRgb;

    // Cell background — supports CSS vars in config.color
    const cellBg = isOn
      ? (this._cfg.color && !cfgRgb ? this._cfg.color : rgba(effectiveRgb, 1))
      : 'var(--contrast3, rgba(127,127,127,0.15))';

    // Glow priority: custom color (glow_color or color) → HA rgb/color_temp → fallback RGB
    const glowColor = (this._cfg.glow_color ?? this._cfg.color ?? '').toString().trim();
    const cfgGlowRgb = parseRgb(glowColor);
    const glowA = glowColor
      ? `color-mix(in srgb, ${glowColor} 70%, transparent)`
      : rgba(cfgGlowRgb ?? lightRgb ?? FALLBACK_RGB, 0.7);
    const glowB = glowColor
      ? `color-mix(in srgb, ${glowColor} 80%, transparent)`
      : rgba(cfgGlowRgb ?? lightRgb ?? FALLBACK_RGB, 0.8);

    // Toggle colour
    const toggleCss = isOn
      ? (this._cfg.toggle_color ?? (lightRgb ? rgbCss(lightRgb) : rgbCss(FALLBACK_RGB)))
      : 'var(--secondary-text-color)';

    // ── Text ───────────────────────────────────────────────
    this._el.nameEl.textContent =
      this._cfg.name || state.attributes.friendly_name || this._cfg.entity;
    this._el.stateEl.textContent = this._stateLabel(state, isOn);

    // ── Icons ──────────────────────────────────────────────
    // Explicit fallback to DEFAULTS so empty string still renders an icon
    const iconOn  = this._cfg.icon_on  || DEFAULTS.icon_on;
    const iconOff = this._cfg.icon_off || DEFAULTS.icon_off;
    this._el.iconEl.setAttribute('icon', isOn ? iconOn : iconOff);
    this._el.toggleIconEl.setAttribute('icon',
      isOn ? (this._cfg.toggle_icon_on  || DEFAULTS.toggle_icon_on)
           : (this._cfg.toggle_icon_off || DEFAULTS.toggle_icon_off));
    // Slider icons — configurable, fallback to DEFAULTS
    this._el.brightIcon.setAttribute('icon', this._cfg.brightness_icon || DEFAULTS.brightness_icon);
    this._el.ctIcon.setAttribute('icon',     this._cfg.color_temp_icon || DEFAULTS.color_temp_icon);
    this._el.hueIcon.setAttribute('icon',    this._cfg.hue_icon        || DEFAULTS.hue_icon);

    // ── Slider values ──────────────────────────────────────
    if (hasBright) {
      const bv = Math.max(1, state.attributes.brightness ?? 1);
      this._el.brightSlider.value = bv;
      this._setBrightnessProgress(bv);
    }
    if (hasCT) {
      const minM = state.attributes.min_mireds ?? 153;
      const maxM = state.attributes.max_mireds ?? 500;
      this._el.ctSlider.min   = minM;
      this._el.ctSlider.max   = maxM;
      this._el.ctSlider.value = state.attributes.color_temp ?? minM;
    }
    if (hasColor) {
      this._el.hueSlider.value = state.attributes.hs_color?.[0] ?? 180;
    }

    // ── CSS custom properties (on ha-card for scope) ───────
    const s = this._el.card.style;

    s.setProperty('--dados-cell-bg',    cellBg);
    s.setProperty('--dados-glow',       (isOn && this._cfg.glow !== false)
      ? `-55px -50px 70px 20px ${glowA}, -35px -35px 70px 10px ${glowB}`
      : 'none');
    s.setProperty('--dados-icon-color', isOn
      ? (this._cfg.icon_color     || 'var(--contrast2, #fff)')
      : (this._cfg.icon_color_off || 'var(--contrast16, #888)'));
    s.setProperty('--dados-toggle-color', toggleCss);

    // Font sizes
    this._setProp(s, '--dados-name-fs',    this._cfg.name_font_size);
    this._setProp(s, '--dados-state-fs',   this._cfg.state_font_size);
    // Font colours
    this._setProp(s, '--dados-name-color', this._cfg.name_color);
    this._setProp(s, '--dados-state-color',this._cfg.state_color);
    // Card background
    this._setProp(s, '--dados-card-bg',    this._cfg.card_background_color);
  }

  /** Set or remove a CSS custom property depending on whether value is truthy. */
  _setProp(style, prop, value) {
    value ? style.setProperty(prop, value) : style.removeProperty(prop);
  }

  // ── Brightness progress helper ─────────────────────────────

  /** Updates the progress-bar background of the brightness slider in real time. */
  _setBrightnessProgress(value) {
    const pct = Math.round((value / 255) * 100);

    // Color priority: brightness_color (exclusive) → entity rgb_color → FALLBACK.
    // When brightness_color is set it is used exclusively for both progress and track.
    // config.color (img cell) is deliberately excluded so the two don't bleed into each other.
    const cfgBrightRgb = parseRgb(this._cfg.brightness_color);
    let progCss, trackCss;
    if (this._cfg.brightness_color) {
      if (cfgBrightRgb) {
        progCss  = rgbCss(cfgBrightRgb);
        trackCss = rgba(cfgBrightRgb, 0.3);
      } else {
        // CSS var passthrough — use color-mix for 30 % track
        progCss  = this._cfg.brightness_color;
        trackCss = `color-mix(in srgb, ${this._cfg.brightness_color} 30%, transparent)`;
      }
    } else {
      const baseRgb = this._lightRgb ?? FALLBACK_RGB;
      progCss  = rgbCss(baseRgb);
      trackCss = rgba(baseRgb, 0.3);
    }

    // Real elements: .bright-track = full-width 30% bg, .bright-progress = rectangle with
    // border-radius inherited from .slider-wrap (adjustable via CSS).
    this._el.brightTrack.style.background    = trackCss;
    this._el.brightProgress.style.background = progCss;
    this._el.brightProgress.style.width      = `${pct}%`;
  }

  // ── Capability detection ───────────────────────────────────

  _supports(state, feature) {
    const modes = state.attributes.supported_color_modes ?? [];
    const sf    = state.attributes.supported_features    ?? 0;
    switch (feature) {
      case 'brightness': return modes.length ? modes.some(m => m !== 'onoff') : !!(sf & 1);
      case 'color_temp': return modes.length ? modes.includes('color_temp')   : !!(sf & 2);
      case 'color':      return modes.length
        ? modes.some(m => ['rgb','rgbw','rgbww','hs','xy'].includes(m))
        : !!(sf & 16);
      default: return false;
    }
  }

  // ── Event binding (once) ───────────────────────────────────

  _bindEvents() {
    const { toggleBtn, textBlock, brightSlider, ctSlider, hueSlider, iconBtn } = this._el;

    toggleBtn.addEventListener('click', e => { e.stopPropagation(); this._toggle(); });

    textBlock.addEventListener('click', () => {
      const state = this._hass?.states[this._cfg.entity];
      if (!state) return;
      const hasAny = this._supports(state,'brightness') || this._supports(state,'color_temp') || this._supports(state,'color');
      if (!hasAny) return;
      this._expanded = !this._expanded;
      this._el.controls.classList.toggle('hidden', !this._expanded);
    });

    // Brightness — real-time visual + HA call on release
    brightSlider.addEventListener('input',  e => this._setBrightnessProgress(+e.target.value));
    brightSlider.addEventListener('change', e => {
      e.stopPropagation();
      this._call('turn_on', { brightness: +e.target.value });
    });

    ctSlider.addEventListener('change', e => {
      e.stopPropagation();
      this._call('turn_on', { color_temp: +e.target.value });
    });

    hueSlider.addEventListener('change', e => {
      e.stopPropagation();
      const sat = this._hass.states[this._cfg.entity]?.attributes.hs_color?.[1] ?? 100;
      this._call('turn_on', { hs_color: [+e.target.value, sat] });
    });

    this._bindHoldTap(iconBtn);
  }

  // ── Hold/tap on icon tile ──────────────────────────────────

  _bindHoldTap(btn) {
    let timer = null;
    let held  = false;

    const start = () => {
      held  = false;
      timer = setTimeout(() => { held = true; timer = null; this._moreInfo(); }, this._cfg.hold_ms);
    };
    const cancel = () => { if (timer) { clearTimeout(timer); timer = null; } };

    btn.addEventListener('mousedown',   start);
    btn.addEventListener('touchstart',  start, { passive: true });
    btn.addEventListener('mouseup',     cancel);
    btn.addEventListener('mouseleave',  cancel);
    btn.addEventListener('touchend',    cancel);
    btn.addEventListener('touchcancel', cancel);
    btn.addEventListener('click', () => { if (held) { held = false; return; } this._toggle(); });
  }

  // ── HA service helpers ─────────────────────────────────────

  _toggle() {
    this._call('toggle');
  }

  _call(service, data = {}) {
    this._hass.callService('light', service, { entity_id: this._cfg.entity, ...data });
  }

  _moreInfo() {
    this.dispatchEvent(new CustomEvent('hass-more-info', {
      bubbles: true, composed: true, detail: { entityId: this._cfg.entity },
    }));
  }

  // ── State label (HA-localized) ─────────────────────────────

  _stateLabel(state, isOn) {
    // Show brightness percentage when on and available
    if (isOn && typeof state.attributes.brightness === 'number') {
      return `${Math.round((state.attributes.brightness / 255) * 100)}%`;
    }
    // Use HA's built-in entity state formatter (handles translations)
    if (this._hass.formatEntityState) {
      return this._hass.formatEntityState(state);
    }
    // Fallback: manual localize
    const key = `component.light.entity_component._.state.${state.state}`;
    return this._hass.localize?.(key) || state.state;
  }
}

// ─── Registration ─────────────────────────────────────────────

if (!customElements.get('dados-card')) customElements.define('dados-card', DadosCard);

window.customCards ??= [];
if (!window.customCards.some(c => c.type === 'dados-card')) {
  window.customCards.push({
    type: 'custom:dados-card',
    name: 'Dados Card',
    description: 'Light card with dynamic glow, adaptive height, and smart sliders.',
    preview: true,
  });
}
