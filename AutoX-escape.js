(async () => {
  "use strict";

  if (window.__autoXEscapeExtensionLoaded) return;
  window.__autoXEscapeExtensionLoaded = true;

  const deadline = Date.now() + 120000;
  let G;
  while (Date.now() < deadline) {
    if (window.Gargonem?.Addons?.Storage && window.Gargonem?.Core?.Event) {
      G = window.Gargonem;
      break;
    }
    await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!G) return;

  const storage = new G.Addons.Storage("gargonem-auto-x", {
    enabled: false, minLevel: 0, maxLevel: 500, maxDistance: 15,
    follow: false, autof: false, attackStrangers: true, attackEnemies: false,
    attackClan: false, attackAllies: false, attackFriends: false,
    showMore: false, whitelist: [], blacklist: [], currentTargetID: 0,
    targetPrevPos: { x: -1, y: -1 }, walkAttemptCount: 0,
    targetLostCount: 0, escapeQueued: false
  }, true);

  let wasInFight = false;
  let escapeInProgress = false;
  let enabledBeforeQueue = false;

  function getTeleportScroll() {
    const items = G.Core.Item?.getAll?.() || window.g?.item || {};
    return Object.values(items).find(item => String(item?.name || "")
      .normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase() ===
      "zwoj teleportacji na kwieciste przejscie");
  }

  function showMessage(text) {
    if (G.Core.System?.message) G.Core.System.message(text);
    else console.info(`[AutoX] ${text}`);
  }

  function updateButton() {
    const button = document.querySelector(".autox-escape-button");
    if (!button) return;
    const queued = Boolean(storage.get("escapeQueued"));
    button.classList.toggle("active", queued || escapeInProgress);
    button.textContent = queued ? "Ucieczka: po walce" : "Ucieczka";
  }

  function useTeleportScroll() {
    const teleport = getTeleportScroll();
    if (!teleport) {
      showMessage("AutoX: brak Zwoju teleportacji na Kwieciste Przejście.");
      return false;
    }
    G.Core.Communication.send(`moveitem&id=${teleport.id}&st=1`);
    return true;
  }

  function restoreAutoX() {
    if (enabledBeforeQueue) storage.set("enabled", true);
    enabledBeforeQueue = false;
  }

  function cancelQueuedEscape() {
    storage.set("escapeQueued", false);
    escapeInProgress = false;
    restoreAutoX();
    updateButton();
  }

  function queueOrEscape() {
    if (!getTeleportScroll()) {
      cancelQueuedEscape();
      showMessage("AutoX: brak Zwoju teleportacji na Kwieciste Przejście.");
      return;
    }
    if (storage.get("escapeQueued")) {
      cancelQueuedEscape();
      return;
    }
    if (G.Core.Fight.get()) {
      enabledBeforeQueue = Boolean(storage.get("enabled"));
      storage.set("enabled", false);
      storage.set("escapeQueued", true);
      updateButton();
      return;
    }
    escapeInProgress = true;
    updateButton();
    useTeleportScroll();
    setTimeout(() => {
      escapeInProgress = false;
      updateButton();
    }, 1000);
  }

  function onGameEvent() {
    const inFight = Boolean(G.Core.Fight.get());
    if (inFight) wasInFight = true;
    if (!inFight && wasInFight) {
      wasInFight = false;
      if (storage.get("escapeQueued")) {
        storage.set("escapeQueued", false);
        escapeInProgress = true;
        updateButton();
        useTeleportScroll();
        setTimeout(() => {
          escapeInProgress = false;
          restoreAutoX();
          updateButton();
        }, 1000);
      }
    }
  }

  function findAutoXWindow() {
    const direct = document.querySelector(
      '[data-name="gargonem-autox"], .gargonem-autox, #gargonem-autox'
    );
    if (direct) return direct;
    const candidates = [...document.querySelectorAll("div")].filter(element =>
      element.textContent?.includes("Włącz AutoX") || element.textContent?.includes("WĹ‚Ä…cz AutoX")
    );
    return candidates.sort((a, b) => a.childElementCount - b.childElementCount)[0] || null;
  }

  function installButton() {
    if (document.querySelector(".autox-escape-button")) return;
    const windowElement = findAutoXWindow();
    if (!windowElement) return;
    const button = document.createElement("button");
    button.type = "button";
    button.className = "autox-escape-button";
    button.addEventListener("click", event => {
      event.preventDefault();
      event.stopPropagation();
      queueOrEscape();
    });
    windowElement.appendChild(button);
    updateButton();
  }

  const style = document.createElement("style");
  style.textContent = `
    .autox-escape-button { display:block; width:calc(100% - 8px); margin:5px 4px 1px;
      padding:3px 6px; border:1px solid #777; border-radius:3px; background:#181818;
      color:#fff; cursor:pointer; font-weight:bold; }
    .autox-escape-button.active { border-color:#7cff85;
      box-shadow:0 0 5px #4cff5a,inset 0 0 5px #173d1b; color:#9cff9c; }
  `;
  document.head.appendChild(style);

  G.Core.Event.addAny(onGameEvent);
  setInterval(installButton, 500);
  installButton();
})();
