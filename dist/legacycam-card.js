class LegacyCamCard extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
    this._viewerOpen = false;
  }

  setConfig(config) {
    if (!config.camera_entity) {
      throw new Error("camera_entity is required");
    }

    this.config = {
      flash_entity: "",
      motion_entity: "",
      recording_entity: "",
      rotation: 0,
      ...config
    };

    if (this._rendered) {
      this._update();
    }
  }

  set hass(hass) {
    this._hass = hass;

    if (!this._rendered) {
      this._render();
    }

    this._update();
  }

  _render() {
    this.shadowRoot.innerHTML = `
      <style>
        :host {
          display: block;
        }

        ha-card {
          overflow: hidden;
          background: var(--ha-card-background, var(--card-background-color));
          color: var(--primary-text-color);
        }

        .frame {
          position: relative;
          width: 100%;
          aspect-ratio: 4 / 3;
          background: var(--secondary-background-color);
          overflow: hidden;
          cursor: pointer;
        }

        .preview,
        .stream {
          width: 100%;
          height: 100%;
          object-fit: contain;
          display: block;
          transform-origin: center;
          background: #000;
        }

        .flash {
          position: absolute;
          left: 12px;
          bottom: 12px;
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: var(--primary-text-color);
          background: var(--ha-card-background, var(--card-background-color));
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.28));
          cursor: pointer;
          opacity: 0.92;
        }

        .flash[disabled] {
          opacity: 0.45;
          cursor: default;
        }

        .flash.on {
          color: var(--warning-color, #f9c74f);
        }

        .tools {
          position: absolute;
          right: 12px;
          bottom: 12px;
          display: flex;
          gap: 8px;
        }

        .tool {
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 50%;
          display: none;
          place-items: center;
          color: var(--primary-text-color);
          background: var(--ha-card-background, var(--card-background-color));
          box-shadow: var(--ha-card-box-shadow, 0 2px 8px rgba(0, 0, 0, 0.28));
          cursor: pointer;
          opacity: 0.92;
        }

        .tool.visible {
          display: grid;
        }

        .tool[disabled] {
          opacity: 0.45;
          cursor: default;
        }

        .tool.on {
          color: var(--accent-color, #03a9f4);
        }

        .tool.recording.on {
          color: var(--error-color, #db4437);
        }

        .viewer {
          position: fixed;
          inset: 0;
          z-index: 999;
          display: none;
          background: rgba(0, 0, 0, 0.92);
        }

        .viewer.open {
          display: grid;
          place-items: center;
        }

        .viewer-inner {
          position: relative;
          width: 100vw;
          height: 100vh;
        }

        .close {
          position: absolute;
          top: 12px;
          right: 12px;
          width: 44px;
          height: 44px;
          border: 0;
          border-radius: 50%;
          display: grid;
          place-items: center;
          color: var(--primary-text-color);
          background: var(--ha-card-background, var(--card-background-color));
          cursor: pointer;
          z-index: 1;
        }
      </style>

      <ha-card>
        <div class="frame" id="previewFrame">
          <img class="preview" id="preview" alt="" />
          <button class="flash" id="flash" type="button">
            <ha-icon icon="mdi:flash"></ha-icon>
          </button>
          <div class="tools">
            <button class="tool motion" id="motion" type="button" title="Motion detection">
              <ha-icon icon="mdi:motion-sensor"></ha-icon>
            </button>
            <button class="tool recording" id="recording" type="button" title="Recording">
              <ha-icon icon="mdi:record-rec"></ha-icon>
            </button>
          </div>
        </div>
      </ha-card>

      <div class="viewer" id="viewer">
        <div class="viewer-inner">
          <button class="close" id="close" type="button">
            <ha-icon icon="mdi:close"></ha-icon>
          </button>
          <img class="stream" id="stream" alt="" />
          <button class="flash" id="viewerFlash" type="button">
            <ha-icon icon="mdi:flash"></ha-icon>
          </button>
        </div>
      </div>
    `;

    this.shadowRoot.getElementById("previewFrame").addEventListener("click", () => this._openViewer());
    this.shadowRoot.getElementById("close").addEventListener("click", () => this._closeViewer());
    this.shadowRoot.getElementById("flash").addEventListener("click", (event) => this._toggleFlash(event));
    this.shadowRoot.getElementById("viewerFlash").addEventListener("click", (event) => this._toggleFlash(event));
    this.shadowRoot.getElementById("motion").addEventListener("click", (event) => this._toggleConfiguredSwitch(event, "motion_entity"));
    this.shadowRoot.getElementById("recording").addEventListener("click", (event) => this._toggleConfiguredSwitch(event, "recording_entity"));

    this._rendered = true;
  }

  _update() {
    if (!this._hass || !this.config) return;

    const camera = this._cameraState();
    const preview = this.shadowRoot.getElementById("preview");
    const rotation = this._rotation();

    if (preview && camera) {
      const source = this._cameraProxyUrl(true);
      if (preview.dataset.source !== source) {
        preview.src = source;
        preview.dataset.source = source;
      }
      preview.style.transform = `rotate(${rotation}deg)`;
    }

    const stream = this.shadowRoot.getElementById("stream");
    if (stream) {
      stream.style.transform = `rotate(${rotation}deg)`;
    }

    this._updateFlashButton(this.shadowRoot.getElementById("flash"));
    this._updateFlashButton(this.shadowRoot.getElementById("viewerFlash"));
    this._updateConfiguredSwitchButton(this.shadowRoot.getElementById("motion"), "motion_entity");
    this._updateConfiguredSwitchButton(this.shadowRoot.getElementById("recording"), "recording_entity");
  }

  _cameraState() {
    return this._hass?.states?.[this.config.camera_entity];
  }

  _flashState() {
    return this.config.flash_entity ? this._hass?.states?.[this.config.flash_entity] : null;
  }

  _configuredSwitchState(key) {
    const entity = this.config[key];
    return entity ? this._hass?.states?.[entity] : null;
  }

  _rotation() {
    const value = Number(this.config.rotation || 0);
    return [0, 90, 180, 270].includes(value) ? value : 0;
  }

  _cameraProxyUrl(stream) {
    const entityId = this.config.camera_entity;
    const token = this._cameraState()?.attributes?.access_token;
    const path = stream ? "camera_proxy_stream" : "camera_proxy";
    const query = token ? `?token=${encodeURIComponent(token)}` : "";

    return `/api/${path}/${entityId}${query}`;
  }

  _openViewer() {
    const viewer = this.shadowRoot.getElementById("viewer");
    const stream = this.shadowRoot.getElementById("stream");
    const preview = this.shadowRoot.getElementById("preview");

    preview.removeAttribute("src");
    preview.dataset.source = "";
    stream.src = this._cameraProxyUrl(true);
    viewer.classList.add("open");
    this._viewerOpen = true;
  }

  _closeViewer() {
    const viewer = this.shadowRoot.getElementById("viewer");
    const stream = this.shadowRoot.getElementById("stream");

    viewer.classList.remove("open");
    stream.removeAttribute("src");
    this._viewerOpen = false;
    this._update();
  }

  _updateFlashButton(button) {
    if (!button) return;

    const flash = this._flashState();
    const enabled = Boolean(flash);
    const on = flash?.state === "on";

    button.disabled = !enabled;
    button.classList.toggle("on", on);
  }

  _updateConfiguredSwitchButton(button, key) {
    if (!button) return;

    const entity = this.config[key];
    const state = this._configuredSwitchState(key);
    const enabled = Boolean(entity && state);

    button.classList.toggle("visible", Boolean(entity));
    button.disabled = !enabled;
    button.classList.toggle("on", state?.state === "on");
  }

  _toggleFlash(event) {
    event.stopPropagation();

    const entity = this.config.flash_entity;
    const state = this._flashState()?.state;

    if (!entity || !state) return;

    this._hass.callService(
      "switch",
      state === "on" ? "turn_off" : "turn_on",
      { entity_id: entity }
    );
  }

  _toggleConfiguredSwitch(event, key) {
    event.stopPropagation();

    const entity = this.config[key];
    const state = this._configuredSwitchState(key)?.state;

    if (!entity || !state) return;

    this._hass.callService(
      "switch",
      state === "on" ? "turn_off" : "turn_on",
      { entity_id: entity }
    );
  }

  getCardSize() {
    return 3;
  }

  static getConfigElement() {
    return document.createElement("legacycam-card-editor");
  }

  static getStubConfig(hass) {
    const camera = Object.keys(hass?.states || {}).find((entityId) => entityId.startsWith("camera."));
    const flash = Object.keys(hass?.states || {}).find((entityId) => entityId.startsWith("switch."));
    const motion = Object.keys(hass?.states || {}).find((entityId) => entityId.includes("motion_detection"));
    const recording = Object.keys(hass?.states || {}).find((entityId) => entityId.includes("recording"));

    return {
      type: "custom:legacycam-card",
      camera_entity: camera || "",
      flash_entity: flash || "",
      motion_entity: motion || "",
      recording_entity: recording || "",
      rotation: 0
    };
  }
}

customElements.define("legacycam-card", LegacyCamCard);


class LegacyCamCardEditor extends HTMLElement {

  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }

  setConfig(config) {
    this.config = {
      camera_entity: "",
      flash_entity: "",
      motion_entity: "",
      recording_entity: "",
      rotation: 0,
      ...config
    };

    this._render();
  }

  set hass(hass) {
    this._hass = hass;
    this._render();
  }

  _render() {
    if (!this._hass || !this.config) return;

    this.shadowRoot.innerHTML = `
      <style>
        .editor {
          display: grid;
          gap: 16px;
        }
      </style>
      <div class="editor">
        <ha-selector id="camera"></ha-selector>
        <ha-selector id="flash"></ha-selector>
        <ha-selector id="motion"></ha-selector>
        <ha-selector id="recording"></ha-selector>
        <ha-selector id="rotation"></ha-selector>
      </div>
    `;

    this._setupSelector("camera", "Camera entity", { entity: { domain: "camera" } }, this.config.camera_entity);
    this._setupSelector("flash", "Flash entity", { entity: { domain: "switch" } }, this.config.flash_entity);
    this._setupSelector("motion", "Motion entity", { entity: { domain: "switch" } }, this.config.motion_entity);
    this._setupSelector("recording", "Recording entity", { entity: { domain: "switch" } }, this.config.recording_entity);
    this._setupSelector("rotation", "Rotation", {
      select: {
        options: [
          { value: "0", label: "0" },
          { value: "90", label: "90" },
          { value: "180", label: "180" },
          { value: "270", label: "270" }
        ],
        mode: "dropdown"
      }
    }, String(this.config.rotation || 0));
  }

  _setupSelector(id, label, selector, value) {
    const element = this.shadowRoot.getElementById(id);

    element.hass = this._hass;
    element.label = label;
    element.selector = selector;
    element.value = value || "";
    element.addEventListener("value-changed", (event) => this._valueChanged(id, event.detail.value));
  }

  _valueChanged(id, value) {
    const keyMap = {
      camera: "camera_entity",
      flash: "flash_entity",
      motion: "motion_entity",
      recording: "recording_entity",
      rotation: "rotation"
    };
    const config = {
      ...this.config,
      [keyMap[id]]:
        id === "rotation" ? Number(value) : value
    };

    this.config = config;

    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: { config },
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define("legacycam-card-editor", LegacyCamCardEditor);

window.customCards = window.customCards || [];
window.customCards.push({
  type: "legacycam-card",
  name: "LegacyCam Card",
  description: "LegacyCam camera preview with flash control",
  preview: true
});
