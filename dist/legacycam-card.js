class LegacyCamCard extends HTMLElement {

  setConfig(config) {
    this.config = {
      rotation: 0,
      ...config
    };
  }

  set hass(hass) {
    this._hass = hass;

    if (!this.content) {
      this.innerHTML = `
        <ha-card>
          <div class="lc-wrapper">

            <img id="preview" class="lc-preview" />

            <button class="lc-flash" id="flashBtn">⚡</button>

          </div>

          <div class="lc-overlay hidden" id="overlay">
            <div class="lc-overlay-content">

              <button class="lc-close" id="closeBtn">✕</button>

              <img id="stream" class="lc-stream" />

              <button class="lc-flash-overlay" id="flashBtn2">⚡</button>

            </div>
          </div>

        </ha-card>
      `;

      this.content = true;

      this._updatePreview();

      // OPEN STREAM
      this.querySelector("#preview").onclick = () => {
        const overlay = this.querySelector("#overlay");
        const stream = this.querySelector("#stream");

        stream.src = this.config.stream;
        overlay.classList.remove("hidden");
      };

      // CLOSE
      this.querySelector("#closeBtn").onclick = () => {
        this.querySelector("#overlay").classList.add("hidden");
        this.querySelector("#stream").src = "";
      };

      // FLASH toggle
      const toggleFlash = () => {
        const entity = this.config.flash_entity;
        const state = this._hass.states[entity]?.state;

        this._hass.callService(
          "switch",
          state === "on" ? "turn_off" : "turn_on",
          { entity_id: entity }
        );
      };

      this.querySelector("#flashBtn").onclick = toggleFlash;
      this.querySelector("#flashBtn2").onclick = toggleFlash;
    }
  }

  _updatePreview() {
    const img = this.querySelector("#preview");
    if (!img) return;

    const cam = this._hass.states[this.config.entity];
    if (!cam) return;

    img.src = cam.attributes.entity_picture || this.config.snapshot;

    const rot = this.config.rotation || 0;
    img.style.transform = `rotate(${rot}deg)`;
  }

  getCardSize() {
    return 3;
  }

  // 👉 Lovelace editor
  static getConfigElement() {
    return document.createElement("legacycam-card-editor");
  }

  static getStubConfig() {
    return {
      entity: "",
      flash_entity: "",
      stream: "",
      rotation: 0
    };
  }
}

customElements.define("legacycam-card", LegacyCamCard);


class LegacyCamCardEditor extends HTMLElement {

  setConfig(config) {
    this.config = config;
  }

  set hass(hass) {
    this._hass = hass;
    if (!this._rendered) this._render();
  }

  _render() {
    this.innerHTML = `
      <div class="lc-editor">

        <label>Camera entity</label>
        <select id="entity"></select>

        <label>Flash entity</label>
        <select id="flash"></select>

        <label>Stream URL</label>
        <input id="stream" type="text" placeholder="http://IP:8080/stream" />

        <label>Snapshot URL</label>
        <input id="snapshot" type="text" placeholder="http://IP:8080/snapshot.jpg" />

        <label>Rotation</label>
        <select id="rotation">
          <option value="0">0°</option>
          <option value="90">90°</option>
          <option value="180">180°</option>
          <option value="270">270°</option>
        </select>

      </div>
    `;

    this._fillEntities();

    this.querySelector("#entity").value = this.config.entity || "";
    this.querySelector("#flash").value = this.config.flash_entity || "";
    this.querySelector("#stream").value = this.config.stream || "";
    this.querySelector("#snapshot").value = this.config.snapshot || "";
    this.querySelector("#rotation").value = this.config.rotation || 0;

    this.querySelectorAll("input, select").forEach(el => {
      el.onchange = () => this._updateConfig();
    });

    this._rendered = true;
  }

  _fillEntities() {
    const entities = Object.keys(this._hass.states);

    const camSelect = this.querySelector("#entity");
    const flashSelect = this.querySelector("#flash");

    entities.forEach(e => {
      const opt1 = document.createElement("option");
      opt1.value = e;
      opt1.textContent = e;

      const opt2 = document.createElement("option");
      opt2.value = e;
      opt2.textContent = e;

      camSelect.appendChild(opt1);
      flashSelect.appendChild(opt2);
    });
  }

  _updateConfig() {
    this.dispatchEvent(new CustomEvent("config-changed", {
      detail: {
        config: {
          ...this.config,
          entity: this.querySelector("#entity").value,
          flash_entity: this.querySelector("#flash").value,
          stream: this.querySelector("#stream").value,
          snapshot: this.querySelector("#snapshot").value,
          rotation: parseInt(this.querySelector("#rotation").value)
        }
      },
      bubbles: true,
      composed: true
    }));
  }
}

customElements.define("legacycam-card-editor", LegacyCamCardEditor);
