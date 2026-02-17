const CARD_VERSION = '1.3.0';

// ─── Defaults ────────────────────────────────────────────────

const DEFAULTS = {
  icon_on: 'mdi:lightbulb',
  icon_off: 'mdi:lightbulb-outline',
  toggle_icon_on: 'mdi:toggle-switch',
  toggle_icon_off: 'mdi:toggle-switch-off-outline',
  hold_ms: 500,
  glow: true,
};

const FALLBACK_RGB = [245, 178, 63];

// ─── Color helpers ───────────────────────────────────────────

function rgba(rgb, a) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function rgbCss(rgb) {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

/** Parse hex or rgb() string → [r,g,b] array, or null for CSS vars / unknowns. */
function parseColorToRgb(color) {
  if (!color || typeof color !== 'string') return null;
  const hex = color.match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i)?.[1];
  if (hex) {
    return hex.length === 3
      ? hex.split('').map((c) => parseInt(c + c, 16))
      : [parseInt(hex.slice(0, 2), 16), parseInt(hex.slice(2, 4), 16), parseInt(hex.slice(4, 6), 16)];
  }
  const m = color.match(/rgb\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*\)/i);
  if (m) return [+m[1], +m[2], +m[3]];
  return null; // e.g. var(--yellow) — pass through as CSS string
}

/**
 * Resolve a color config value to an [r,g,b] array.
 * Falls back to `fallback` (already an array) if the value can't be parsed.
 */
function resolveRgb(configValue, fallback) {
  if (!configValue) return fallback;
  return parseColorToRgb(configValue) ?? fallback;
}

// ─── Static stylesheet (parsed once, uses CSS custom props) ──
// Base: 1rem = 16px
// Card height: 2×1.25rem padding + 2.8125rem icon = 5.3125rem ≈ 85px
// → equal spacing on all four sides (1.25rem = 20px)

const STYLES = /* css */ `
  :host { display: block; }

  ha-card {
    border-radius: 2.25rem;
    padding: 1.25rem;
    min-height: calc(2.8125rem + 2.5rem);
    box-sizing: border-box;
    overflow: hidden;
    backdrop-filter: blur(20px);
    background: var(--dados-card-bg, var(--ha-card-background, var(--card-background-color)));
  }

  .row {
    display: grid;
    grid-template-columns: 2.8125rem 1fr auto;
    align-items: center;
    gap: 0.625rem;
    min-height: 2.8125rem;
  }

  .icon-tile {
    width: 2.8125rem;
    height: 2.8125rem;
    border-radius: 1.125rem;
    background: var(--dados-cell-bg);
    box-shadow: var(--dados-icon-glow, none);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: none;
    padding: 0;
    overflow: visible;
    transition: background 0.3s, box-shadow 0.3s;
    flex-shrink: 0;
  }

  .icon-tile ha-icon {
    --mdc-icon-size: 2rem;
    color: var(--dados-icon-color);
    transition: color 0.3s;
  }

  .text {
    min-width: 0;
    cursor: pointer;
  }

  .name {
    font-size: var(--dados-name-fs, 1rem);
    font-weight: 500;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--contrast16);
    letter-spacing: 0.025rem;
    padding-left: 0.1875rem;
  }

  .state {
    font-size: var(--dados-state-fs, 0.875rem);
    font-weight: 400;
    color: var(--contrast12, var(--secondary-text-color));
    letter-spacing: 0.0375rem;
    padding-left: 0.1875rem;
  }

  .toggle-btn {
    width: 2.9375rem;
    height: 2.9375rem;
    border: none;
    border-radius: 0.9375rem;
    background: var(--contrast3, rgba(127, 127, 127, 0.15));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    flex-shrink: 0;
    transition: background 0.2s;
  }

  .toggle-btn ha-icon {
    --mdc-icon-size: 1.875rem;
    color: var(--dados-toggle-color);
    transition: color 0.2s;
  }

  .controls {
    margin-top: 0.75rem;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 0.75rem;
    align-items: center;
  }

  .hidden { display: none; }

  input[type='range'] {
    width: 100%;
    accent-color: var(--dados-slider-accent);
  }

  .collapse-btn {
    width: 2.9375rem;
    height: 2.9375rem;
    border: none;
    border-radius: 0.9375rem;
    background: var(--contrast3, rgba(127, 127, 127, 0.15));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
  }

  .collapse-btn ha-icon {
    --mdc-icon-size: 1.5rem;
    color: var(--contrast12, var(--secondary-text-color));
  }

  .missing {
    padding: 0.875rem;
    color: var(--error-color);
  }
`;

// ─── UI Editor ───────────────────────────────────────────────

const EDITOR_SCHEMA = [
  { name: 'entity', required: true, selector: { entity: { domain: 'light' } } },
  { name: 'name', label: 'Name', selector: { text: {} } },
  {
    type: 'expandable',
    title: 'Farben',
    schema: [
      {
        name: 'color',
        label: 'Farbe — Glow + Img Cell (Standard: HA Lichtfarbe)',
        selector: { text: {} },
      },
      {
        name: 'cell_color',
        label: 'Img Cell Farbe (überschreibt Farbe für Cell)',
        selector: { text: {} },
      },
      {
        name: 'glow_color',
        label: 'Glow Farbe (überschreibt Farbe für Glow)',
        selector: { text: {} },
      },
      { name: 'toggle_color', label: 'Toggle Color', selector: { text: {} } },
      { name: 'icon_color', label: 'Icon-Farbe wenn an', selector: { text: {} } },
      { name: 'card_background_color', label: 'Kartenhintergrund', selector: { text: {} } },
    ],
  },
  {
    type: 'expandable',
    title: 'Icons',
    schema: [
      { name: 'icon_on', label: 'Icon (An)', selector: { icon: {} } },
      { name: 'icon_off', label: 'Icon (Aus)', selector: { icon: {} } },
      { name: 'toggle_icon_on', label: 'Toggle Icon (An)', selector: { icon: {} } },
      { name: 'toggle_icon_off', label: 'Toggle Icon (Aus)', selector: { icon: {} } },
    ],
  },
  {
    type: 'expandable',
    title: 'Schrift & Effekte',
    schema: [
      {
        name: 'name_font_size',
        label: 'Name Schriftgröße (z.B. 1rem, 16px)',
        selector: { text: {} },
      },
      {
        name: 'state_font_size',
        label: 'State Schriftgröße (z.B. 0.875rem, 14px)',
        selector: { text: {} },
      },
      { name: 'glow', label: 'Glow-Effekt', selector: { boolean: {} } },
    ],
  },
];

class DadosCardEditor extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: 'open' });
  }

  setConfig(config) {
    this._config = { ...config };
    if (this._form) {
      this._form.data = this._config;
    } else {
      this._build();
    }
  }

  set hass(hass) {
    this._hass = hass;
    if (this._form) this._form.hass = hass;
  }

  _build() {
    const form = document.createElement('ha-form');
    form.schema = EDITOR_SCHEMA;
    form.data = this._config;
    form.hass = this._hass;
    form.computeLabel = (s) => s.label ?? s.name;
    form.addEventListener('value-changed', (e) => {
      this._config = e.detail.value;
      this.dispatchEvent(
        new CustomEvent('config-changed', {
          detail: { config: this._config },
          bubbles: true,
          composed: true,
        }),
      );
    });
    this._form = form;
    this.shadowRoot.appendChild(form);
  }
}

if (!customElements.get('dados-card-editor')) {
  customElements.define('dados-card-editor', DadosCardEditor);
}

// ─── Card ────────────────────────────────────────────────────

class DadosCard extends HTMLElement {
  static getConfigElement() {
    return document.createElement('dados-card-editor');
  }

  static getStubConfig() {
    return {
      type: 'custom:dados-card',
      entity: 'light.example',
      name: 'Dados Light',
    };
  }

  /* ── HA lifecycle ──────────────────────────────────────────── */

  setConfig(config) {
    if (!config?.entity) {
      throw new Error('You need to define an entity');
    }

    this._config = { ...DEFAULTS, ...config };
    this._expanded = false;
    this._stateKey = null; // reset so next _update() runs fully

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    this._buildDom();

    if (this._hass) {
      this._update();
    }
  }

  set hass(hass) {
    this._hass = hass;
    this._update();
  }

  getCardSize() {
    return this._expanded ? 4 : 2;
  }

  getLayoutOptions() {
    return {
      grid_rows: 1,
      grid_min_rows: 1,
      grid_max_rows: 2,
      grid_columns: 2,
      grid_min_columns: 1,
      grid_max_columns: 4,
    };
  }

  /* ── One-time DOM build ────────────────────────────────────── */

  _buildDom() {
    this.shadowRoot.innerHTML = `
      <style>${STYLES}</style>
      <ha-card>
        <div class="row">
          <button class="icon-tile" id="iconBtn" aria-label="Toggle light">
            <ha-icon id="iconEl"></ha-icon>
          </button>
          <div class="text" id="textBlock">
            <div class="name" id="nameEl"></div>
            <div class="state" id="stateEl"></div>
          </div>
          <button class="toggle-btn" id="toggleBtn" aria-label="Toggle light">
            <ha-icon id="toggleIconEl"></ha-icon>
          </button>
        </div>
        <div class="controls hidden" id="controls">
          <input id="slider" type="range" min="1" max="255" step="1" value="1" aria-label="Brightness" />
          <button class="collapse-btn" id="collapseBtn" aria-label="Collapse">
            <ha-icon icon="mdi:chevron-up"></ha-icon>
          </button>
        </div>
      </ha-card>
    `;

    const $ = (id) => this.shadowRoot.getElementById(id);

    this._el = {
      card: this.shadowRoot.querySelector('ha-card'),
      iconBtn: $('iconBtn'),
      iconEl: $('iconEl'),
      nameEl: $('nameEl'),
      stateEl: $('stateEl'),
      toggleBtn: $('toggleBtn'),
      toggleIconEl: $('toggleIconEl'),
      textBlock: $('textBlock'),
      controls: $('controls'),
      slider: $('slider'),
      collapseBtn: $('collapseBtn'),
    };

    this._bindEvents();
  }

  /* ── Targeted DOM updates ──────────────────────────────────── */

  _update() {
    if (!this._hass || !this._el) return;

    const stateObj = this._hass.states[this._config.entity];

    if (!stateObj) {
      if (this._stateKey !== '__missing__') {
        this._stateKey = '__missing__';
        this._el.nameEl.textContent = `Entity not found: ${this._config.entity}`;
        this._el.stateEl.textContent = '';
      }
      return;
    }

    // Dirty check — only state values, not config (config changes reset _stateKey via setConfig)
    const key = `${stateObj.state}|${stateObj.attributes.brightness}|${stateObj.attributes.rgb_color}`;
    if (key === this._stateKey) return;
    this._stateKey = key;

    const isOn = stateObj.state === 'on';

    // ── Color resolution ────────────────────────────────────────
    //
    // `color`      → base override for both glow & cell (beats HA rgb_color)
    // `cell_color` → further overrides cell only
    // `glow_color` → further overrides glow only
    // `toggle_color` → completely separate; never touches glow/cell
    //
    // Bug fix: color no longer bleeds into toggle — toggle has its own prop.

    const haRgb = stateObj.attributes.rgb_color || FALLBACK_RGB;

    // Base: config.color → HA rgb_color → FALLBACK_RGB
    const baseRgb = resolveRgb(this._config.color, haRgb);

    // Cell (img cell background)
    const cellRgb = resolveRgb(this._config.cell_color, baseRgb);

    // Glow
    const glowRgb = resolveRgb(this._config.glow_color, baseRgb);

    // Toggle color: config.toggle_color → base color as CSS string → HA rgb_color
    const toggleColorCss = this._config.toggle_color || this._config.color || rgbCss(haRgb);

    // Slider accent: follow base color
    const sliderAccentCss = this._config.color || rgbCss(haRgb);

    // Text
    this._el.nameEl.textContent =
      this._config.name || stateObj.attributes.friendly_name || this._config.entity;
    this._el.stateEl.textContent = this._stateLabel(stateObj);

    // Icons
    this._el.iconEl.setAttribute(
      'icon',
      this._config.icon || (isOn ? this._config.icon_on : this._config.icon_off),
    );
    this._el.toggleIconEl.setAttribute(
      'icon',
      isOn ? this._config.toggle_icon_on : this._config.toggle_icon_off,
    );

    // Slider value
    const brightness =
      typeof stateObj.attributes.brightness === 'number' ? stateObj.attributes.brightness : 0;
    this._el.slider.value = Math.max(1, brightness);

    // CSS custom properties
    const s = this._el.card.style;
    const glowOn = isOn && this._config.glow !== false;

    s.setProperty(
      '--dados-cell-bg',
      isOn ? rgba(cellRgb, 0.7) : 'var(--contrast3, rgba(127,127,127,0.15))',
    );
    s.setProperty(
      '--dados-icon-glow',
      glowOn
        ? `-55px -50px 70px 20px ${rgba(glowRgb, 0.7)}, -35px -35px 70px 10px ${rgba(glowRgb, 0.8)}`
        : 'none',
    );
    s.setProperty(
      '--dados-icon-color',
      isOn ? (this._config.icon_color || 'var(--contrast2, #fff)') : 'var(--contrast16, #888)',
    );
    s.setProperty('--dados-toggle-color', isOn ? toggleColorCss : 'var(--secondary-text-color)');
    s.setProperty('--dados-slider-accent', isOn ? sliderAccentCss : 'var(--yellow, #f5b23f)');

    // Font sizes
    if (this._config.name_font_size) {
      s.setProperty('--dados-name-fs', this._config.name_font_size);
    } else {
      s.removeProperty('--dados-name-fs');
    }
    if (this._config.state_font_size) {
      s.setProperty('--dados-state-fs', this._config.state_font_size);
    } else {
      s.removeProperty('--dados-state-fs');
    }

    // Card background
    if (this._config.card_background_color) {
      s.setProperty('--dados-card-bg', this._config.card_background_color);
    } else {
      s.removeProperty('--dados-card-bg');
    }

    // Expand / collapse
    this._el.controls.classList.toggle('hidden', !this._expanded);
  }

  /* ── Event binding (once per _buildDom) ────────────────────── */

  _bindEvents() {
    this._el.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleLight();
    });

    this._el.textBlock.addEventListener('click', () => {
      this._expanded = !this._expanded;
      this._el.controls.classList.toggle('hidden', !this._expanded);
    });

    this._el.collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._expanded = false;
      this._el.controls.classList.add('hidden');
    });

    this._el.slider.addEventListener('change', (e) => {
      e.stopPropagation();
      this._hass.callService('light', 'turn_on', {
        entity_id: this._config.entity,
        brightness: Number(e.target.value),
      });
    });

    this._bindHoldTap(this._el.iconBtn);
  }

  /* ── Icon tile: tap = toggle, hold = more-info ─────────────── */

  _bindHoldTap(button) {
    let timer = null;
    let held = false;

    const start = () => {
      held = false;
      timer = setTimeout(() => {
        held = true;
        timer = null;
        this._fireMoreInfo();
      }, this._config.hold_ms);
    };

    const cancel = () => {
      if (timer !== null) {
        clearTimeout(timer);
        timer = null;
      }
    };

    button.addEventListener('mousedown', start);
    button.addEventListener('touchstart', start, { passive: true });
    button.addEventListener('mouseup', cancel);
    button.addEventListener('mouseleave', cancel);
    button.addEventListener('touchend', cancel);
    button.addEventListener('touchcancel', cancel);

    button.addEventListener('click', () => {
      if (held) {
        held = false;
        return;
      }
      this._toggleLight();
    });
  }

  /* ── Service calls ─────────────────────────────────────────── */

  _toggleLight() {
    this._hass.callService('light', 'toggle', { entity_id: this._config.entity });
  }

  _fireMoreInfo() {
    this.dispatchEvent(
      new CustomEvent('hass-more-info', {
        bubbles: true,
        composed: true,
        detail: { entityId: this._config.entity },
      }),
    );
  }

  /* ── Helpers ───────────────────────────────────────────────── */

  _stateLabel(stateObj) {
    if (stateObj.state !== 'on') return 'Off';
    if (typeof stateObj.attributes.brightness === 'number') {
      return `${Math.round((stateObj.attributes.brightness / 255) * 100)}%`;
    }
    return 'On';
  }
}

// ─── Registration ────────────────────────────────────────────

if (!customElements.get('dados-card')) {
  customElements.define('dados-card', DadosCard);
}

window.customCards = window.customCards || [];
if (!window.customCards.some((c) => c.type === 'dados-card')) {
  window.customCards.push({
    type: 'custom:dados-card',
    name: 'Dados Card',
    description: 'Light card with dynamic RGB color, glow effects, and brightness control.',
    preview: true,
  });
}
