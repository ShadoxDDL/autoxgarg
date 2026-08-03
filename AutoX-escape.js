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

  function findControlBlock(scope, label) {
    const matches = [...scope.querySelectorAll("div, span, label")].filter(element =>
      element.textContent?.trim() === label
    );
    let block = matches.sort((a, b) => a.childElementCount - b.childElementCount)[0];
    if (!block) return null;
    while (
      block.parentElement &&
      block.parentElement !== scope &&
      block.parentElement.textContent?.trim() === label
    ) {
      block = block.parentElement;
    }
    return block;
  }

  function setCollapsed(scope, collapsed) {
    scope.querySelectorAll(".autox-hidden").forEach(element =>
      element.classList.remove("autox-hidden")
    );
    if (!collapsed) return;
    for (const label of ["AutoF", "Follow", "Pokaż więcej", "PokaĹĽ wiÄ™cej"]) {
      const block = findControlBlock(scope, label);
      if (block) block.classList.add("autox-hidden");
    }
  }

  function findAutoXWindowParts(startElement) {
    let ancestor = startElement;
    while (ancestor) {
      const title = [...ancestor.querySelectorAll("div, span")].find(element =>
        element.textContent?.trim() === "AutoX"
      );
      if (title?.parentElement) {
        const header = title.parentElement;
        let root = header;
        while (root && !root.contains(startElement)) root = root.parentElement;
        if (root) return { header, root };
      }
      ancestor = ancestor.parentElement;
    }
    return null;
  }

  function installButton() {
    const enabledRow = findAutoXEnabledRow();
    if (!enabledRow?.parentElement) return;
    let escapeButton = document.querySelector(".autox-escape-button");
    if (!escapeButton) {
      escapeButton = document.createElement("button");
      escapeButton.type = "button";
      escapeButton.className = "autox-escape-button";
      escapeButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        queueOrEscape();
      });
      enabledRow.insertAdjacentElement("afterend", escapeButton);
    }

    const parts = findAutoXWindowParts(enabledRow.parentElement);
    if (!parts) return;
    const { header, root } = parts;
    const collapsed = localStorage.getItem(COLLAPSED_KEY) === "1";
    setCollapsed(root, collapsed);

    if (!document.querySelector(".autox-collapse-button")) {
      const collapseButton = document.createElement("button");
      collapseButton.type = "button";
      collapseButton.className = "autox-collapse-button";
      collapseButton.textContent = collapsed ? "+" : "−";
      collapseButton.title = collapsed ? "Rozwiń AutoX" : "Zwiń AutoX";
      collapseButton.addEventListener("click", event => {
        event.preventDefault();
        event.stopPropagation();
        const next = localStorage.getItem(COLLAPSED_KEY) !== "1";
        setCollapsed(root, next);
        localStorage.setItem(COLLAPSED_KEY, next ? "1" : "0");
        collapseButton.textContent = next ? "+" : "−";
        collapseButton.title = next ? "Rozwiń AutoX" : "Zwiń AutoX";
      });
      header.appendChild(collapseButton);
    }
    updateButton();
  }

  const style = document.createElement("style");
  style.textContent = `
    .autox-escape-button { display:block !important; box-sizing:border-box !important;
      width:100% !important; height:24px !important; min-height:24px !important;
      max-height:24px !important; margin:4px 0 !important; padding:3px 6px !important;
      border:1px solid #777 !important; border-radius:3px !important;
      background:#181818; color:#fff; cursor:pointer;
      font-family:Arial,sans-serif !important; font-size:11px !important;
      font-weight:bold !important; line-height:16px !important; }
    .autox-escape-button.active { border-color:#7cff85;
      box-shadow:0 0 5px #4cff5a,inset 0 0 5px #173d1b; color:#9cff9c; }
    .autox-hidden { display:none !important; }
    .autox-collapse-button { position:absolute; top:3px; right:25px; z-index:30;
      width:18px; height:18px; padding:0; border:0; background:transparent;
      color:#ddd; font:bold 16px/18px Arial; cursor:pointer; }
  `;
  document.head.appendChild(style);

  G.Core.Event.addAny(onGameEvent);
  setInterval(installButton, 500);
  installButton();
})();
