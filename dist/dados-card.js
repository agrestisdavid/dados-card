class DadosCard extends HTMLElement {
  static getStubConfig() {
    return {
      type: 'custom:dados-card',
      entity: 'light.example',
      compact: true,
      name: 'Dados Licht',
    };
  }

  static getConfigElement() {
    return document.createElement('hui-generic-entity-row');
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  setConfig(config) {
    if (!config.entity) {
      throw new Error('You need to define an entity');
    }
    this._config = {
      compact: true,
      ...config,
    };
    this._expanded = !this._config.compact;
    this._controlMode = 'brightness';
    this._render();
  }

  getCardSize() {
    return this._expanded ? 4 : 2;
  }

  _render() {
    if (!this._config || !this._hass) return;

    const stateObj = this._hass.states[this._config.entity];
    if (!stateObj) {
      this.innerHTML = `<ha-card><div class="missing">Entity not found: ${this._config.entity}</div></ha-card>`;
      return;
    }

    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }

    const name = this._config.name || stateObj.attributes.friendly_name || this._config.entity;
    const stateText = this._stateLabel(stateObj);
    const icon = this._config.icon || stateObj.attributes.icon || 'mdi:lightbulb';
    const isOn = stateObj.state === 'on';

    const value = this._modeValue(stateObj);
    const min = this._modeMin();
    const max = this._modeMax(stateObj);
    const modeIcon = this._modeIcon();

    this.shadowRoot.innerHTML = `
      <style>
        :host { display:block; }
        ha-card {
          border-radius: 28px;
          background: linear-gradient(110deg, rgba(34,20,0,0.8) 0%, rgba(7,14,31,0.95) 25%, rgba(3,8,20,1) 100%);
          color: #e8e8ef;
          padding: 14px;
          box-sizing: border-box;
        }
        .row {
          display:grid;
          grid-template-columns: 64px 1fr 58px;
          gap:12px;
          align-items:center;
        }
        .main {
          cursor:pointer;
        }
        .icon-btn, .toggle-btn, .mode-btn {
          width:56px;
          height:56px;
          border-radius: 20px;
          border: none;
          display:flex;
          align-items:center;
          justify-content:center;
          color:#f6b057;
          background: rgba(24,33,58,0.7);
        }
        .icon-btn.on {
          background: #c37927;
          color:#101217;
        }
        .title { font-size: 33px; }
        .name { font-size: 33px; font-weight:700; line-height: 1.05; color:#d8d8de; }
        .state { font-size: 27px; color:#b7bcc8; }

        .compact-controls {
          margin-top:10px;
          display:grid;
          grid-template-columns: 1fr auto;
          gap:10px;
          align-items:center;
        }

        .slider-shell { position:relative; }
        .slider {
          width: 100%;
          -webkit-appearance: none;
          appearance: none;
          height: 44px;
          border-radius: 22px;
          outline:none;
          background: ${this._sliderBackground()};
        }
        .slider::-webkit-slider-thumb {
          -webkit-appearance:none;
          appearance:none;
          width: 10px;
          height: 38px;
          border-radius:8px;
          background: #fff;
          border: 0;
        }
        .slider::-moz-range-thumb {
          width: 10px;
          height: 38px;
          border-radius:8px;
          background: #fff;
          border: 0;
        }
        .stack { display:flex; flex-direction:column; gap:10px; margin-top:12px; }
        .hidden { display:none; }
      </style>
      <ha-card>
        <div class="row main" id="mainRow">
          <button class="icon-btn ${isOn ? 'on' : ''}" id="iconHold" aria-label="icon">
            <ha-icon icon="${icon}"></ha-icon>
          </button>
          <div>
            <div class="name">${name}</div>
            <div class="state">${stateText}</div>
          </div>
          <button class="toggle-btn" id="toggleBtn" aria-label="toggle">
            <ha-icon icon="mdi:toggle-switch${isOn ? '' : '-off-outline'}"></ha-icon>
          </button>
        </div>

        <div class="compact-controls ${this._expanded ? '' : 'hidden'}" id="controls">
          <div class="slider-shell">
            <input class="slider" id="slider" type="range" min="${min}" max="${max}" step="1" value="${value}" />
          </div>
          <button class="mode-btn" id="modeBtn" aria-label="mode">
            <ha-icon icon="${modeIcon}"></ha-icon>
          </button>
        </div>
      </ha-card>
    `;

    this.shadowRoot.getElementById('mainRow')?.addEventListener('click', (ev) => {
      if (ev.target.closest('#toggleBtn') || ev.target.closest('#iconHold')) return;
      if (this._config.compact) {
        this._expanded = !this._expanded;
        this._render();
      }
    });

    this.shadowRoot.getElementById('toggleBtn')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this._hass.callService('light', 'toggle', { entity_id: this._config.entity });
    });

    const iconBtn = this.shadowRoot.getElementById('iconHold');
    if (iconBtn) {
      let holdTimer;
      let holdTriggered = false;
      const holdStart = () => {
        holdTriggered = false;
        holdTimer = window.setTimeout(() => {
          holdTriggered = true;
          this._fireEvent('hass-more-info', { entityId: this._config.entity });
        }, 500);
      };
      const holdEnd = () => {
        if (holdTimer) window.clearTimeout(holdTimer);
      };
      iconBtn.addEventListener('mousedown', holdStart);
      iconBtn.addEventListener('touchstart', holdStart, { passive: true });
      iconBtn.addEventListener('mouseup', holdEnd);
      iconBtn.addEventListener('mouseleave', holdEnd);
      iconBtn.addEventListener('touchend', holdEnd);
      iconBtn.addEventListener('click', (ev) => {
        if (holdTriggered) ev.preventDefault();
      });
    }

    this.shadowRoot.getElementById('modeBtn')?.addEventListener('click', (ev) => {
      ev.stopPropagation();
      const modes = this._supportedModes(stateObj);
      const idx = modes.indexOf(this._controlMode);
      this._controlMode = modes[(idx + 1) % modes.length];
      this._render();
    });

    this.shadowRoot.getElementById('slider')?.addEventListener('change', (ev) => {
      ev.stopPropagation();
      this._applySliderValue(Number(ev.target.value), stateObj);
    });
  }

  _stateLabel(stateObj) {
    if (stateObj.state !== 'on') return 'Aus';
    if (typeof stateObj.attributes.brightness === 'number') {
      return `${Math.round((stateObj.attributes.brightness / 255) * 100)}%`;
    }
    return 'An';
  }

  _supportedModes(stateObj) {
    const modes = ['brightness'];
    if (stateObj.attributes.color_mode || stateObj.attributes.hs_color) modes.push('hue');
    if (typeof stateObj.attributes.color_temp_kelvin === 'number' || typeof stateObj.attributes.color_temp === 'number') {
      modes.push('temp');
    }
    return modes;
  }

  _modeIcon() {
    if (this._controlMode === 'hue') return 'mdi:palette';
    if (this._controlMode === 'temp') return 'mdi:thermometer';
    return 'mdi:brightness-6';
  }

  _modeValue(stateObj) {
    if (this._controlMode === 'hue') {
      return Math.round(stateObj.attributes.hs_color?.[0] ?? 0);
    }
    if (this._controlMode === 'temp') {
      if (typeof stateObj.attributes.color_temp_kelvin === 'number') {
        return stateObj.attributes.color_temp_kelvin;
      }
      if (typeof stateObj.attributes.color_temp === 'number') {
        const mired = stateObj.attributes.color_temp;
        return Math.round(1000000 / mired);
      }
      return 2700;
    }
    return stateObj.attributes.brightness ?? 0;
  }

  _modeMin() {
    if (this._controlMode === 'hue') return 0;
    if (this._controlMode === 'temp') return 2000;
    return 1;
  }

  _modeMax(stateObj) {
    if (this._controlMode === 'hue') return 360;
    if (this._controlMode === 'temp') {
      return stateObj.attributes.max_color_temp_kelvin ?? 6500;
    }
    return 255;
  }

  _sliderBackground() {
    if (this._controlMode === 'hue') {
      return 'linear-gradient(90deg, #ff0000 0%, #ffee00 16%, #00ff33 33%, #00c6ff 50%, #0033ff 66%, #8b00ff 83%, #ff008c 100%)';
    }
    if (this._controlMode === 'temp') {
      return 'linear-gradient(90deg, #b8c8ff 0%, #ffd6ba 100%)';
    }
    return '#c37927';
  }

  _applySliderValue(value, stateObj) {
    const entity_id = this._config.entity;
    if (this._controlMode === 'hue') {
      const sat = stateObj.attributes.hs_color?.[1] ?? 100;
      this._hass.callService('light', 'turn_on', { entity_id, hs_color: [value, sat] });
      return;
    }
    if (this._controlMode === 'temp') {
      this._hass.callService('light', 'turn_on', { entity_id, color_temp_kelvin: value });
      return;
    }
    this._hass.callService('light', 'turn_on', { entity_id, brightness: value });
  }

  _fireEvent(type, detail = {}, options = {}) {
    const event = new Event(type, {
      bubbles: options.bubbles ?? true,
      cancelable: Boolean(options.cancelable),
      composed: options.composed ?? true,
    });
    event.detail = detail;
    this.dispatchEvent(event);
    return event;
  }
}

customElements.define('dados-card', DadosCard);

window.customCards = window.customCards || [];
window.customCards.push({
  type: 'dados-card',
  name: 'Dados Card',
  description: 'Dados style card with compact/expanded light controls.',
});
