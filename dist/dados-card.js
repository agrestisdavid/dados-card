class DadosCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: 'custom:dados-card',
      entity: 'light.example',
      compact: true,
      name: 'Dados Light',
    };
  }

  setConfig(config) {
    if (!config?.entity) {
      throw new Error('You need to define an entity');
    }

    this._config = {
      compact: true,
      ...config,
    };

    this._expanded = !this._config.compact;

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return this._expanded ? 4 : 2;
  }

  _render() {
    if (!this._config || !this._hass || !this.shadowRoot) {
      return;
    }

    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) {
      this.shadowRoot.innerHTML = `
        <ha-card>
          <div class="missing">Entity not found: ${this._config.entity}</div>
        </ha-card>
      `;
      return;
    }

    const isOn = stateObj.state === 'on';
    const friendlyName =
      this._config.name || stateObj.attributes.friendly_name || this._config.entity;

    // State-based icon (matches dados_light template icon_on / icon_off)
    const icon = this._config.icon || (isOn ? 'mdi:lightbulb' : 'mdi:lightbulb-outline');

    const stateLabel = this._stateLabel(stateObj);
    const brightness =
      typeof stateObj.attributes.brightness === 'number' ? stateObj.attributes.brightness : 0;

    // Dynamic RGB color from entity (like dados_base / dados_light templates)
    const rgb = stateObj.attributes.rgb_color; // [r, g, b] or undefined

    // Icon tile background: rgb tint when on, neutral when off (matches dados_light img_cell style)
    const iconBg = isOn
      ? rgb
        ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.7)`
        : 'var(--yellow, #f5b23f)'
      : 'var(--contrast3, rgba(127, 127, 127, 0.15))';

    // Glow effect (matches dados_base box-shadow template logic)
    const glowColor1 = rgb
      ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.7)`
      : 'rgba(245, 178, 63, 0.7)';
    const glowColor2 = rgb
      ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.8)`
      : 'rgba(245, 178, 63, 0.8)';
    const iconGlow = isOn
      ? `-55px -50px 70px 20px ${glowColor1}, -35px -35px 70px 10px ${glowColor2}`
      : 'none';

    // Icon color: white on colored tile when on, muted when off (matches template)
    const iconColor = isOn ? 'var(--contrast2, #fff)' : 'var(--contrast16, #888)';

    // Toggle icon color: uses rgb_color when on (matches dados_toggle template)
    const toggleColor = isOn
      ? rgb
        ? `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.7)`
        : 'var(--yellow, #f5b23f)'
      : 'var(--secondary-text-color)';

    // Slider accent color
    const sliderAccent =
      isOn && rgb ? `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})` : 'var(--yellow, #f5b23f)';

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        ha-card {
          /* Matches dados_base: 36px radius, 12px padding, glass blur */
          border-radius: 36px;
          padding: 12px;
          box-sizing: border-box;
          overflow: hidden;
          backdrop-filter: blur(20px);
        }

        .row {
          /* Matches dados_light grid: 55px icon | 1fr text | 55px toggle */
          display: grid;
          grid-template-columns: 55px 1fr 55px;
          align-items: start;
          height: 56px;
        }

        /* Icon tile — matches dados_base img_cell */
        .icon-tile {
          width: 45px;
          height: 45px;
          border-radius: 18px;
          background: ${iconBg};
          box-shadow: ${iconGlow};
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          border: none;
          padding: 0;
          margin-top: 5px;
          flex-shrink: 0;
          overflow: visible;
          transition: background 0.3s, box-shadow 0.3s;
        }

        .icon-tile ha-icon {
          --mdc-icon-size: 32px;
          color: ${iconColor};
          transition: color 0.3s;
        }

        /* Name + state text area */
        .text {
          min-width: 0;
          cursor: pointer;
          margin-top: 9px;
        }

        /* Matches dados_base name style */
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

        /* Matches dados_base state style */
        .state {
          font-size: 14px;
          font-weight: 400;
          color: var(--contrast12, var(--secondary-text-color));
          letter-spacing: 0.6px;
          margin-top: 0;
          padding-left: 3px;
        }

        /* Toggle button — matches dados_toggle: 47x47, 15px radius, contrast3 bg */
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
          flex-shrink: 0;
          transition: background 0.2s;
        }

        .toggle-btn ha-icon {
          --mdc-icon-size: 30px;
          color: ${toggleColor};
          transition: color 0.2s;
        }

        /* Expanded brightness controls */
        .controls {
          margin-top: 12px;
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 12px;
          align-items: center;
        }

        .hidden {
          display: none;
        }

        input[type='range'] {
          width: 100%;
          accent-color: ${sliderAccent};
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
      </style>

      <ha-card>
        <div class="row">
          <!-- Icon tile: tap = toggle, hold = more-info (matches dados_light icon_tap_action) -->
          <button class="icon-tile" id="iconBtn" aria-label="Toggle light">
            <ha-icon icon="${icon}"></ha-icon>
          </button>

          <!-- Text: tap to expand / collapse brightness controls -->
          <div class="text" id="textBlock" aria-label="Toggle card expansion">
            <div class="name">${friendlyName}</div>
            <div class="state">${stateLabel}</div>
          </div>

          <!-- Toggle button (matches dados_toggle template) -->
          <button class="toggle-btn" id="toggleBtn" aria-label="Toggle light">
            <ha-icon icon="mdi:toggle-switch${isOn ? '' : '-off-outline'}"></ha-icon>
          </button>
        </div>

        <!-- Brightness slider (only visible when expanded) -->
        <div class="controls ${this._expanded ? '' : 'hidden'}" id="controls">
          <input
            id="brightnessSlider"
            type="range"
            min="1"
            max="255"
            step="1"
            value="${Math.max(1, brightness)}"
            aria-label="Brightness"
          />
          <button class="collapse-btn" id="collapseBtn" aria-label="Collapse">
            <ha-icon icon="mdi:chevron-up"></ha-icon>
          </button>
        </div>
      </ha-card>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    // Toggle button: tap to toggle light
    this.shadowRoot.getElementById('toggleBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._callLightToggle();
    });

    // Text area: tap to expand / collapse (compact mode only)
    this.shadowRoot.getElementById('textBlock')?.addEventListener('click', () => {
      if (!this._config.compact) {
        return;
      }
      this._expanded = !this._expanded;
      this._render();
    });

    // Collapse button
    this.shadowRoot.getElementById('collapseBtn')?.addEventListener('click', (e) => {
      e.stopPropagation();
      this._expanded = false;
      this._render();
    });

    // Brightness slider: call light.turn_on with new brightness value
    this.shadowRoot.getElementById('brightnessSlider')?.addEventListener('change', (e) => {
      e.stopPropagation();
      this._hass.callService('light', 'turn_on', {
        entity_id: this._config.entity,
        brightness: Number(e.target.value),
      });
    });

    // Icon tile: tap = toggle, hold (500 ms) = more-info
    this._bindIconButton(this.shadowRoot.getElementById('iconBtn'));
  }

  _callLightToggle() {
    this._hass.callService('light', 'toggle', { entity_id: this._config.entity });
  }

  /**
   * Binds the icon tile button:
   *  - Short tap  → toggle light  (matches dados_light icon_tap_action: toggle)
   *  - Hold 500ms → open more-info dialog
   */
  _bindIconButton(button) {
    if (!button) {
      return;
    }

    let holdTimer = null;
    let holdTriggered = false;

    const onStart = () => {
      holdTriggered = false;
      holdTimer = window.setTimeout(() => {
        holdTriggered = true;
        holdTimer = null;
        this._fireMoreInfo();
      }, 500);
    };

    const onEnd = () => {
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
    };

    button.addEventListener('mousedown', onStart);
    button.addEventListener('touchstart', onStart, { passive: true });
    button.addEventListener('mouseup', onEnd);
    button.addEventListener('mouseleave', onEnd);
    button.addEventListener('touchend', onEnd);
    button.addEventListener('touchcancel', onEnd);

    button.addEventListener('click', () => {
      if (holdTriggered) {
        // Hold already fired more-info — don't also toggle
        holdTriggered = false;
        return;
      }
      this._callLightToggle();
    });
  }

  /** Fires the HA more-info dialog for this card's entity */
  _fireMoreInfo() {
    // Use CustomEvent so .detail is properly set (plain Event does not support detail)
    const event = new CustomEvent('hass-more-info', {
      bubbles: true,
      composed: true,
      detail: { entityId: this._config.entity },
    });
    this.dispatchEvent(event);
  }

  _stateLabel(stateObj) {
    if (stateObj.state !== 'on') {
      return 'Off';
    }
    if (typeof stateObj.attributes.brightness === 'number') {
      return `${Math.round((stateObj.attributes.brightness / 255) * 100)}%`;
    }
    return 'On';
  }
}

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
