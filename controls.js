
/* FORTNIGHT - Customizable Controls
   Shared keybind settings for the whole game.
*/

export const DEFAULT_BINDS = {
  moveForward: "KeyW",
  moveBackward: "KeyS",
  moveLeft: "KeyA",
  moveRight: "KeyD",
  jump: "Space",
  sprint: "ShiftLeft",
  crouch: "ControlLeft",
  walk: "AltLeft",
  aim: "Mouse2",
  shoot: "Mouse0",
  reload: "KeyR",
  interact: "KeyE",
  inventory: "KeyI",
  map: "KeyM",
  pause: "Escape",
  slot1: "Digit1",
  slot2: "Digit2",
  slot3: "Digit3",
  slot4: "Digit4",
  slot5: "Digit5",
  previousWeapon: "WheelDown",
  nextWeapon: "WheelUp",
  heal: "KeyH",
  shield: "KeyJ",
  building: "KeyB",
  wall: "KeyZ",
  floor: "KeyX",
  ramp: "KeyC",
  roof: "KeyV",
  placeBuilding: "Mouse0",
  rotateBuilding: "KeyR",
  editBuilding: "KeyG",
  confirmEdit: "Enter",
  cancelEdit: "Escape"
};

export const ACTION_NAMES = {
  moveForward: "Move Forward",
  moveBackward: "Move Backward",
  moveLeft: "Move Left",
  moveRight: "Move Right",
  jump: "Jump",
  sprint: "Sprint",
  crouch: "Crouch",
  walk: "Walk",
  aim: "Aim",
  shoot: "Shoot",
  reload: "Reload",
  interact: "Interact",
  inventory: "Open Inventory",
  map: "Open Map",
  pause: "Pause Game",
  slot1: "Weapon Slot 1",
  slot2: "Weapon Slot 2",
  slot3: "Weapon Slot 3",
  slot4: "Weapon Slot 4",
  slot5: "Weapon Slot 5",
  previousWeapon: "Previous Weapon",
  nextWeapon: "Next Weapon",
  heal: "Use Healing Item",
  shield: "Use Shield Item",
  building: "Toggle Building Mode",
  wall: "Select Wall",
  floor: "Select Floor",
  ramp: "Select Ramp",
  roof: "Select Roof",
  placeBuilding: "Place Building",
  rotateBuilding: "Rotate Building",
  editBuilding: "Edit Building",
  confirmEdit: "Confirm Building Edit",
  cancelEdit: "Cancel Building Edit"
};

const STORAGE_KEY = "fortnight-controls-v1";

export class Controls {
  constructor() {
    this.binds = this.load();
    this.pressed = new Set();
    this.mouseButtons = new Set();
    this.wheel = null;
    this.waitingFor = null;
    this.conflict = null;

    this.onKeyDown = (event) => {
      if (this.waitingFor) return;
      this.pressed.add(event.code);
    };

    this.onKeyUp = (event) => {
      this.pressed.delete(event.code);
    };

    this.onMouseDown = (event) => {
      if (this.waitingFor) return;
      this.mouseButtons.add(`Mouse${event.button}`);
    };

    this.onMouseUp = (event) => {
      this.mouseButtons.delete(`Mouse${event.button}`);
    };

    this.onWheel = (event) => {
      this.wheel = event.deltaY > 0 ? "WheelDown" : "WheelUp";
    };

    window.addEventListener("keydown", this.onKeyDown);
    window.addEventListener("keyup", this.onKeyUp);
    window.addEventListener("mousedown", this.onMouseDown);
    window.addEventListener("mouseup", this.onMouseUp);
    window.addEventListener("wheel", this.onWheel, {
      passive: true
    });
  }

  load() {
    try {
      const saved = JSON.parse(
        localStorage.getItem(STORAGE_KEY) || "{}"
      );
      return { ...DEFAULT_BINDS, ...saved };
    } catch {
      return { ...DEFAULT_BINDS };
    }
  }

  save() {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify(this.binds)
    );
  }

  reset() {
    this.binds = { ...DEFAULT_BINDS };
    this.save();
  }

  isDown(action) {
    const bind = this.binds[action];
    if (!bind) return false;

    if (bind.startsWith("Mouse")) {
      return this.mouseButtons.has(bind);
    }

    if (bind === "WheelUp" || bind === "WheelDown") {
      return this.wheel === bind;
    }

    return this.pressed.has(bind);
  }

  consumeWheel() {
    const value = this.wheel;
    this.wheel = null;
    return value;
  }

  getLabel(action) {
    const bind = this.binds[action] || "Unassigned";

    const labels = {
      Space: "Space",
      Escape: "Esc",
      Enter: "Enter",
      ShiftLeft: "Left Shift",
      ShiftRight: "Right Shift",
      ControlLeft: "Left Ctrl",
      ControlRight: "Right Ctrl",
      AltLeft: "Left Alt",
      AltRight: "Right Alt",
      Mouse0: "Left Mouse",
      Mouse1: "Middle Mouse",
      Mouse2: "Right Mouse",
      WheelUp: "Wheel Up",
      WheelDown: "Wheel Down"
    };

    if (labels[bind]) return labels[bind];

    return bind
      .replace(/^Key/, "")
      .replace(/^Digit/, "");
  }

  beginRebind(action) {
    if (!(action in DEFAULT_BINDS)) {
      throw new Error("Unknown FORTNIGHT control: " + action);
    }

    this.waitingFor = action;
    this.conflict = null;
  }

  cancelRebind() {
    this.waitingFor = null;
    this.conflict = null;
  }

  assign(action, bind, replaceConflict = false) {
    const conflictingAction = Object.keys(this.binds).find(
      key => key !== action && this.binds[key] === bind
    );

    if (conflictingAction && !replaceConflict) {
      this.conflict = {
        action,
        bind,
        conflictingAction
      };
      return {
        success: false,
        conflict: conflictingAction
      };
    }

    if (conflictingAction && replaceConflict) {
      this.binds[conflictingAction] = "";
    }

    this.binds[action] = bind;
    this.waitingFor = null;
    this.conflict = null;
    this.save();

    return { success: true };
  }

  destroy() {
    window.removeEventListener("keydown", this.onKeyDown);
    window.removeEventListener("keyup", this.onKeyUp);
    window.removeEventListener("mousedown", this.onMouseDown);
    window.removeEventListener("mouseup", this.onMouseUp);
    window.removeEventListener("wheel", this.onWheel);
  }
}
