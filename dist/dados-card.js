const CARD_VERSION = '1.1.0';

// ─── Defaults ────────────────────────────────────────────────

const DEFAULTS = {
  compact: true,
  icon_on: 'mdi:lightbulb',
  icon_off: 'mdi:lightbulb-outline',
  hold_ms: 500,
};

const FALLBACK_RGB = [245, 178, 63];

// ─── Color helpers ───────────────────────────────────────────

function rgba(rgb, a) {
  return `rgba(${rgb[0]},${rgb[1]},${rgb[2]},${a})`;
}

function rgbCss(rgb) {
  return `rgb(${rgb[0]},${rgb[1]},${rgb[2]})`;
}

// ─── Static stylesheet (parsed once, uses CSS custom props) ──

const STYLES = /* css */ `
  :host { display: block; }

  ha-card {
    border-radius: 36px;
    padding: 12px;
    box-sizing: border-box;
    overflow: hidden;
    backdrop-filter: blur(20px);
  }

  .row {
    display: grid;
    grid-template-columns: 55px 1fr 55px;
    align-items: start;
    height: 56px;
  }

  .icon-tile {
    width: 45px;
    height: 45px;
    border-radius: 18px;
    background: var(--dados-icon-bg);
    box-shadow: var(--dados-icon-glow, none);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    border: none;
    padding: 0;
    margin-top: 5px;
    overflow: visible;
    transition: background 0.3s, box-shadow 0.3s;
  }

  .icon-tile ha-icon {
    --mdc-icon-size: 32px;
    color: var(--dados-icon-color);
    transition: color 0.3s;
  }

  .text {
    min-width: 0;
    cursor: pointer;
    margin-top: 9px;
  }

  .name {
    font-size: 16px;
    font-weight: 500;
    line-height: 1.2;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    color: var(--contrast16);
    letter-spacing: 0.4px;
    padding-left: 3px;
  }

  .state {
    font-size: 14px;
    font-weight: 400;
    color: var(--contrast12, var(--secondary-text-color));
    letter-spacing: 0.6px;
    margin-top: 0;
    padding-left: 3px;
  }

  .toggle-btn {
    width: 47px;
    height: 47px;
    border: none;
    border-radius: 15px;
    background: var(--contrast3, rgba(127, 127, 127, 0.15));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
    margin-top: 5px;
    transition: background 0.2s;
  }

  .toggle-btn ha-icon {
    --mdc-icon-size: 30px;
    color: var(--dados-toggle-color);
    transition: color 0.2s;
  }

  .controls {
    margin-top: 12px;
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 12px;
    align-items: center;
  }

  .hidden { display: none; }

  input[type='range'] {
    width: 100%;
    accent-color: var(--dados-slider-accent);
  }

  .collapse-btn {
    width: 47px;
    height: 47px;
    border: none;
    border-radius: 15px;
    background: var(--contrast3, rgba(127, 127, 127, 0.15));
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    padding: 0;
  }

  .collapse-btn ha-icon {
    --mdc-icon-size: 24px;
    color: var(--contrast12, var(--secondary-text-color));
  }

  .missing {
    padding: 14px;
    color: var(--error-color);
  }
`;

// ─── Card ────────────────────────────────────────────────────

class DadosCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: 'custom:dados-card',
      entity: 'light.example',
      compact: true,
      name: 'Dados Light',
    };
  }

  /* ── HA lifecycle ──────────────────────────────────────────── */

  setConfig(config) {
    if (!config?.entity) {
      throw new Error('You need to define an entity');
    }

    this._config = { ...DEFAULTS, ...config };
    this._expanded = !this._config.compact;
    this._stateKey = null;

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

  /* ── Targeted DOM updates (no innerHTML, no rebind) ────────── */

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

    // Dirty check — skip if nothing display-relevant changed
    const key = `${stateObj.state}|${stateObj.attributes.brightness}|${stateObj.attributes.rgb_color}`;
    if (key === this._stateKey) return;
    this._stateKey = key;

    const isOn = stateObj.state === 'on';
    const rgb = stateObj.attributes.rgb_color;
    const color = rgb || FALLBACK_RGB;

    // Text content
    this._el.nameEl.textContent =
      this._config.name || stateObj.attributes.friendly_name || this._config.entity;
    this._el.stateEl.textContent = this._stateLabel(stateObj);

    // Icon attributes
    this._el.iconEl.setAttribute(
      'icon',
      this._config.icon || (isOn ? this._config.icon_on : this._config.icon_off),
    );
    this._el.toggleIconEl.setAttribute(
      'icon',
      isOn ? 'mdi:toggle-switch' : 'mdi:toggle-switch-off-outline',
    );

    // Slider value
    const brightness =
      typeof stateObj.attributes.brightness === 'number' ? stateObj.attributes.brightness : 0;
    this._el.slider.value = Math.max(1, brightness);

    // CSS custom properties (dynamic colors — no stylesheet re-parse)
    const s = this._el.card.style;

    s.setProperty(
      '--dados-icon-bg',
      isOn ? rgba(color, 0.7) : 'var(--contrast3, rgba(127,127,127,0.15))',
    );
    s.setProperty(
      '--dados-icon-glow',
      isOn
        ? `-55px -50px 70px 20px ${rgba(color, 0.7)}, -35px -35px 70px 10px ${rgba(color, 0.8)}`
        : 'none',
    );
    s.setProperty('--dados-icon-color', isOn ? 'var(--contrast2, #fff)' : 'var(--contrast16, #888)');
    s.setProperty('--dados-toggle-color', isOn ? rgba(color, 0.7) : 'var(--secondary-text-color)');
    s.setProperty('--dados-slider-accent', isOn ? rgbCss(color) : 'var(--yellow, #f5b23f)');

    // Expand / collapse (reflects current UI state)
    this._el.controls.classList.toggle('hidden', !this._expanded);
  }

  /* ── Event binding (once per _buildDom) ────────────────────── */

  _bindEvents() {
    this._el.toggleBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._toggleLight();
    });

    this._el.textBlock.addEventListener('click', () => {
      if (!this._config.compact) return;
      this._expanded = !this._expanded;
      this._el.controls.classList.toggle('hidden', !this._expanded);
    });

    this._el.collapseBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._expanded = false;
      this._el.controls.classList.toggle('hidden', true);
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
    type: 'dados-card',
    name: 'Dados Card',
    description: 'Light card with dynamic RGB color, glow effects, and brightness control.',
    preview: true,
  });
}
