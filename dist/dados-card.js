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
    this._attachShadowRoot();
    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  getCardSize() {
    return this._expanded ? 4 : 2;
  }

  _attachShadowRoot() {
    if (!this.shadowRoot) {
      this.attachShadow({ mode: 'open' });
    }
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

    const friendlyName = this._config.name || stateObj.attributes.friendly_name || this._config.entity;
    const icon = this._config.icon || stateObj.attributes.icon || 'mdi:lightbulb';
    const isOn = stateObj.state === 'on';
    const stateLabel = this._stateLabel(stateObj);
    const brightness = typeof stateObj.attributes.brightness === 'number' ? stateObj.attributes.brightness : 0;

    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        ha-card {
          border-radius: 20px;
          padding: 14px;
          box-sizing: border-box;
        }

        .row {
          display: grid;
          grid-template-columns: 56px 1fr 56px;
          gap: 12px;
          align-items: center;
        }

        .icon-btn,
        .toggle-btn,
        .expand-btn {
          width: 56px;
          height: 56px;
          border: none;
          border-radius: 16px;
          background: rgba(127, 127, 127, 0.12);
          color: var(--primary-text-color);
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .icon-btn.on {
          color: #f5b23f;
        }

        .text {
          min-width: 0;
          cursor: pointer;
        }

        .name {
          font-size: 1rem;
          font-weight: 700;
          line-height: 1.2;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .state {
          font-size: 0.9rem;
          color: var(--secondary-text-color);
        }

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
        }

        .missing {
          padding: 14px;
          color: var(--error-color);
        }
      </style>

      <ha-card>
        <div class="row" id="mainRow">
          <button class="icon-btn ${isOn ? 'on' : ''}" id="iconBtn" aria-label="Show more info">
            <ha-icon icon="${icon}"></ha-icon>
          </button>

          <div class="text" id="textBlock" aria-label="Toggle card expansion">
            <div class="name">${friendlyName}</div>
            <div class="state">${stateLabel}</div>
          </div>

          <button class="toggle-btn" id="toggleBtn" aria-label="Toggle light">
            <ha-icon icon="mdi:toggle-switch${isOn ? '' : '-off-outline'}"></ha-icon>
          </button>
        </div>

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
          <button class="expand-btn" id="collapseBtn" aria-label="Collapse card">
            <ha-icon icon="mdi:chevron-up"></ha-icon>
          </button>
        </div>
      </ha-card>
    `;

    this._bindEvents();
  }

  _bindEvents() {
    this.shadowRoot.getElementById('toggleBtn')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this._hass.callService('light', 'toggle', {
        entity_id: this._config.entity,
      });
    });

    this.shadowRoot.getElementById('textBlock')?.addEventListener('click', () => {
      if (!this._config.compact) {
        return;
      }
      this._expanded = !this._expanded;
      this._render();
    });

    this.shadowRoot.getElementById('collapseBtn')?.addEventListener('click', (event) => {
      event.stopPropagation();
      this._expanded = false;
      this._render();
    });

    this.shadowRoot.getElementById('brightnessSlider')?.addEventListener('change', (event) => {
      event.stopPropagation();
      const value = Number(event.target.value);
      this._hass.callService('light', 'turn_on', {
        entity_id: this._config.entity,
        brightness: value,
      });
    });

    this._bindHoldForMoreInfo(this.shadowRoot.getElementById('iconBtn'));
  }

  _bindHoldForMoreInfo(button) {
    if (!button) {
      return;
    }

    let holdTimer = null;
    let holdTriggered = false;

    const start = () => {
      holdTriggered = false;
      holdTimer = window.setTimeout(() => {
        holdTriggered = true;
        this._fireEvent('hass-more-info', {
          entityId: this._config.entity,
        });
      }, 500);
    };

    const end = () => {
      if (holdTimer !== null) {
        window.clearTimeout(holdTimer);
        holdTimer = null;
      }
    };

    button.addEventListener('mousedown', start);
    button.addEventListener('touchstart', start, { passive: true });
    button.addEventListener('mouseup', end);
    button.addEventListener('mouseleave', end);
    button.addEventListener('touchend', end);
    button.addEventListener('touchcancel', end);
    button.addEventListener('click', (event) => {
      if (holdTriggered) {
        event.preventDefault();
      }
    });
  }

  _stateLabel(stateObj) {
    if (stateObj.state !== 'on') {
      return 'Off';
    }

    if (typeof stateObj.attributes.brightness === 'number') {
      const percent = Math.round((stateObj.attributes.brightness / 255) * 100);
      return `${percent}%`;
    }

    return 'On';
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

if (!customElements.get('dados-card')) {
  customElements.define('dados-card', DadosCard);
}

window.customCards = window.customCards || [];
const cardAlreadyRegistered = window.customCards.some((card) => card.type === 'dados-card');
if (!cardAlreadyRegistered) {
  window.customCards.push({
    type: 'dados-card',
    name: 'Dados Card',
    description: 'Stable first version of a light-focused Dados-style Home Assistant card.',
  });
}
