
import { openSettings } from "./settings.js";

function connectSettingsButton() {
  const mainMenu = document.getElementById("main-menu");

  if (!mainMenu) {
    console.error("FORTNIGHT: Could not find #main-menu.");
    return;
  }

  let settingsButton = document.getElementById("settings-button");

  // Add a Settings button if the HTML does not already have one.
  if (!settingsButton) {
    settingsButton = document.createElement("button");
    settingsButton.id = "settings-button";
    settingsButton.type = "button";
    settingsButton.textContent = "SETTINGS";
    settingsButton.className = "menu-button";

    const playButton = document.getElementById("play-button");

    if (playButton && playButton.parentElement === mainMenu) {
      playButton.insertAdjacentElement("afterend", settingsButton);
    } else {
      mainMenu.appendChild(settingsButton);
    }
  }

  settingsButton.addEventListener("click", () => {
    openSettings();
  });

  console.log("FORTNIGHT: Settings button connected.");
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", connectSettingsButton, {
    once: true
  });
} else {
  connectSettingsButton();
}
