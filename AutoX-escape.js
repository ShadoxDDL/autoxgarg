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
  const COLLAPSED_KEY = "shadoxddl-autox-collapsed";

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

  function findAutoXEnabledRow() {
    const candidates = [...document.querySelectorAll("div")].filter(element =>
      element.textContent?.includes("Włącz AutoX") || element.textContent?.includes("WĹ‚Ä…cz AutoX")
    );
    return candidates.sort((a, b) => a.childElementCount - b.childElementCount)[0] || null;
  }

  function installButton() {
    const enabledRow = findAutoXEnabledRow();
    if (!enabledRow?.parentElement) return;
    const controlsContainer = enabledRow.parentElement;
    controlsContainer.classList.add("autox-escape-container");

    let button = document.querySelector(".autox-escape-button");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "autox-escape-button";
      button.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        queueOrEscape();
      });
      enabledRow.insertAdjacentElement("afterend", button);
    }

    const collapsed = localStorage.getItem(COLLAPSED_KEY) === "1";
    controlsContainer.classList.toggle("autox-is-collapsed", collapsed);

    if (!document.querySelector(".autox-collapse-button")) {
      const windowRoot = [...function* () {
        let element = controlsContainer;
        while (element) {
          yield element;
          element = element.parentElement;
        }
      }()].find(element => element.textContent?.includes("AutoX") &&
        element.querySelector?.(".autox-escape-button"));

      if (windowRoot) {
        windowRoot.classList.add("autox-window-root");
        const collapseButton = document.createElement("button");
        collapseButton.type = "button";
        collapseButton.className = "autox-collapse-button";
        collapseButton.title = collapsed ? "Rozwiń AutoX" : "Zwiń AutoX";
        collapseButton.textContent = collapsed ? "+" : "−";
        collapseButton.addEventListener("click", event => {
          event.preventDefault();
          event.stopPropagation();
          const next = !controlsContainer.classList.contains("autox-is-collapsed");
          controlsContainer.classList.toggle("autox-is-collapsed", next);
          localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
          collapseButton.textContent = next ? "+" : "−";
          collapseButton.title = next ? "Rozwiń AutoX" : "Zwiń AutoX";
        });
        windowRoot.appendChild(collapseButton);
      }
    }
    updateButton();
  }

  const style = document.createElement("style");
  style.textContent = `
    .autox-escape-button { display:block; box-sizing:border-box; width:100%; margin:4px 0;
      padding:3px 6px; border:1px solid #777; border-radius:3px; background:#181818;
      color:#fff; cursor:pointer; font-weight:bold; }
    .autox-escape-button.active { border-color:#7cff85;
      box-shadow:0 0 5px #4cff5a,inset 0 0 5px #173d1b; color:#9cff9c; }
    .autox-escape-container.autox-is-collapsed > .autox-escape-button ~ * {
      display:none !important;
    }
    .autox-window-root { position:relative; }
    .autox-collapse-button { position:absolute; top:3px; right:25px; z-index:20;
      width:18px; height:18px; padding:0; border:0; background:transparent;
      color:#ddd; font:bold 16px/18px Arial; cursor:pointer; }
  `;
  document.head.appendChild(style);

  G.Core.Event.addAny(onGameEvent);
  setInterval(installButton, 500);
  installButton();
})();
