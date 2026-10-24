
/* FORTNIGHT - Settings and Keybinds Menu */

import {
  Controls,
  DEFAULT_BINDS,
  ACTION_NAMES
} from "./controls.js";

export const controls = new Controls();

const defaults = {
  mouseSensitivity: 0.002,
  aimSensitivity: 0.001,
  invertY: false,
  holdSprint: true,
  holdCrouch: true,
  holdAim: true,
  wheelSwitch: true,
  soundVolume: 0.6,
  graphics: "medium"
};

export const settings = loadSettings();

function loadSettings() {
  try {
    const saved = JSON.parse(
      localStorage.getItem("fortnight-settings-v1") || "{}"
    );
    return { ...defaults, ...saved };
  } catch {
    return { ...defaults };
  }
}

function saveSettings() {
  localStorage.setItem(
    "fortnight-settings-v1",
    JSON.stringify(settings)
  );
}

function element(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export function openSettings() {
  if (document.getElementById("fortnight-settings")) return;

  const overlay = element("div", "fn-settings-overlay");
  overlay.id = "fortnight-settings";

  const panel = element("section", "fn-settings-panel");
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-modal", "true");
  panel.setAttribute("aria-label", "Game settings");

  const header = element("header", "fn-settings-header");
  header.append(
    element("h2", "", "FORTNIGHT SETTINGS")
  );

  const close = element("button", "fn-settings-close", "✕");
  close.type = "button";
  close.setAttribute("aria-label", "Close settings");
  close.onclick = closeSettings;
  header.append(close);
  panel.append(header);

  const tabs = element("nav", "fn-settings-tabs");
  const content = element("div", "fn-settings-content");

  const tabNames = ["Keybinds", "Gameplay", "Graphics", "Audio"];
  const tabButtons = {};

  function selectTab(name) {
    content.replaceChildren();
    Object.values(tabButtons).forEach(button => {
      button.classList.toggle(
        "active",
        button.textContent === name
      );
    });

    if (name === "Keybinds") renderKeybinds(content);
    if (name === "Gameplay") renderGameplay(content);
    if (name === "Graphics") renderGraphics(content);
    if (name === "Audio") renderAudio(content);
  }

  for (const name of tabNames) {
    const button = element("button", "fn-settings-tab", name);
    button.type = "button";
    button.onclick = () => selectTab(name);
    tabButtons[name] = button;
    tabs.append(button);
  }

  const footer = element("footer", "fn-settings-footer");
  const status = element("span", "fn-settings-status", "Settings save automatically.");

  const reset = element("button", "fn-settings-button", "Reset Settings");
  reset.type = "button";
  reset.onclick = () => {
    if (!confirm("Reset all keybinds and settings to defaults?")) return;
    controls.reset();
    Object.assign(settings, defaults);
    saveSettings();
    selectTab("Keybinds");
    status.textContent = "Settings reset to defaults.";
  };

  const done = element("button", "fn-settings-button primary", "DONE");
  done.type = "button";
  done.onclick = closeSettings;

  footer.append(status, reset, done);
  panel.append(tabs, content, footer);
  overlay.append(panel);
  document.body.append(overlay);

  overlay.addEventListener("click", event => {
    if (event.target === overlay) closeSettings();
  });

  selectTab("Keybinds");

  function handleEscape(event) {
    if (event.key === "Escape") {
      const current = controls.waitingFor;
      if (current) {
        controls.cancelRebind();
        selectTab("Keybinds");
        status.textContent = "Rebinding cancelled.";
        event.stopPropagation();
      } else {
        closeSettings();
      }
    }
  }

  overlay.addEventListener("keydown", handleEscape);
}

export function closeSettings() {
  controls.cancelRebind();
  document.getElementById("fortnight-settings")?.remove();
}

function renderKeybinds(container) {
  container.append(
    element("p", "fn-settings-description",
      "Select CHANGE, then press a key or mouse button. Changes save automatically.")
  );

  const list = element("div", "fn-keybind-list");
  container.append(list);

  const message = element("div", "fn-settings-message");
  message.setAttribute("aria-live", "polite");
  container.append(message);

  function drawRows() {
    list.replaceChildren();

    for (const [action, label] of Object.entries(ACTION_NAMES)) {
      const row = element("div", "fn-keybind-row");
      row.append(element("span", "fn-keybind-name", label));

      const key = element("span", "fn-keybind-value",
        controls.getLabel(action) || "Unassigned");

      const change = element("button", "fn-settings-button small", "CHANGE");
      change.type = "button";

      change.onclick = () => {
        controls.beginRebind(action);
        key.textContent = "Press a key...";
        message.textContent = "Press a key or mouse button for " + label + ". Press Escape to cancel.";

        function onKey(event) {
          if (!controls.waitingFor) {
            window.removeEventListener("keydown", onKey, true);
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();

          if (event.code === "Escape") {
            controls.cancelRebind();
            key.textContent = controls.getLabel(action);
            message.textContent = "Rebinding cancelled.";
            window.removeEventListener("keydown", onKey, true);
            return;
          }

          if (["F5", "F11", "F12", "Tab"].includes(event.code)) {
            message.textContent = "That key is reserved. Choose another key.";
            return;
          }

          const result = controls.assign(action, event.code);

          if (!result.success) {
            const otherName = ACTION_NAMES[result.conflict] || result.conflict;
            const replace = confirm(
              event.code + " is already assigned to " + otherName +
              ". Replace that binding?"
            );

            if (replace) {
              controls.assign(action, event.code, true);
              message.textContent = "Control updated.";
            } else {
              controls.cancelRebind();
              message.textContent = "Binding unchanged.";
            }
          } else {
            message.textContent = label + " updated.";
          }

          window.removeEventListener("keydown", onKey, true);
          drawRows();
        }

        window.addEventListener("keydown", onKey, true);
      };

      row.append(key, change);
      list.append(row);
    }
  }

  drawRows();
}

function makeRange(container, label, key, min, max, step) {
  const row = element("label", "fn-setting-row");
  row.append(element("span", "", label));

  const input = element("input");
  input.type = "range";
  input.min = min;
  input.max = max;
  input.step = step;
  input.value = settings[key];

  const value = element("span", "fn-setting-value", String(settings[key]));

  input.oninput = () => {
    settings[key] = Number(input.value);
    value.textContent = input.value;
    saveSettings();
  };

  row.append(input, value);
  container.append(row);
}

function makeToggle(container, label, key) {
  const row = element("label", "fn-setting-row");
  const text = element("span", "", label);
  const input = element("input");
  input.type = "checkbox";
  input.checked = Boolean(settings[key]);

  input.onchange = () => {
    settings[key] = input.checked;
    saveSettings();
  };

  row.append(text, input);
  container.append(row);
}

function renderGameplay(container) {
  container.append(element("h3", "", "Gameplay and Camera"));
  makeRange(container, "Mouse sensitivity", "mouseSensitivity", 0.0005, 0.01, 0.0005);
  makeRange(container, "Aim sensitivity", "aimSensitivity", 0.0002, 0.005, 0.0002);
  makeToggle(container, "Invert vertical mouse", "invertY");
  makeToggle(container, "Hold to sprint", "holdSprint");
  makeToggle(container, "Hold to crouch", "holdCrouch");
  makeToggle(container, "Hold to aim", "holdAim");
  makeToggle(container, "Mouse wheel switches weapons", "wheelSwitch");
}

function renderGraphics(container) {
  container.append(element("h3", "", "Graphics Quality"));

  const row = element("label", "fn-setting-row");
  row.append(element("span", "", "Graphics preset"));

  const select = element("select", "fn-settings-select");
  for (const preset of ["low", "medium", "high"]) {
    const option = element("option", "", preset.toUpperCase());
    option.value = preset;
    option.selected = settings.graphics === preset;
    select.append(option);
  }

  select.onchange = () => {
    settings.graphics = select.value;
    saveSettings();
  };

  row.append(select);
  container.append(row);
  container.append(element("p", "fn-settings-description",
    "The graphics preset is saved here. Rendering changes require the game renderer to read this setting."));
}

function renderAudio(container) {
  container.append(element("h3", "", "Audio"));
  makeRange(container, "Sound volume", "soundVolume", 0, 1, 0.05);
}
