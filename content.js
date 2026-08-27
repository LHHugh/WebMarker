(() => {
  if (globalThis.__softMarkerContentLoaded) return;
  globalThis.__softMarkerContentLoaded = true;

  const SETTINGS_KEY = "softMarkerSettings";
  const PAGE_KEY_PREFIX = "softMarkerPage:";
  const MAX_ANNOTATIONS_PER_PAGE = 1000;
  const MAX_SELECTION_LENGTH = 12000;
  const CONTEXT_LENGTH = 56;

  const COLORS = Object.freeze({
    yellow: { name: "柔黄", value: "#f1e2a1" },
    green: { name: "柔绿", value: "#c6ddc1" },
    blue: { name: "柔蓝", value: "#bdd6e6" },
    pink: { name: "柔粉", value: "#e7c6cf" },
    purple: { name: "柔紫", value: "#d4c7e1" },
    orange: { name: "柔橙", value: "#e8ccb3" }
  });
  const MODES = new Set(["background", "underline"]);
  const DEFAULT_SETTINGS = Object.freeze({ mode: "background", color: "yellow" });
  const FOCUS_HIGHLIGHT_NAME = "soft-marker-focus";
  const HIGHLIGHT_NAMES = [...MODES].flatMap((mode) =>
    Object.keys(COLORS).map((color) => highlightName(mode, color))
  );

  const supportsCustomHighlights = Boolean(
    globalThis.CSS?.highlights && typeof globalThis.Highlight === "function"
  );

  let settings = { ...DEFAULT_SETTINGS };
  let annotations = [];
  let resolvedAnnotations = new Map();
  let pendingSelection = null;
  let pageUrl = currentPageUrl();
  let pageSwitchInProgress = false;
  let pointerSelecting = false;
  let selectionTimer = null;
  let mutationTimer = null;
  let toastTimer = null;
  let focusTimer = null;
  let lastPointerActivation = 0;
  let storageWriteQueue = Promise.resolve();

  let host;
  let toolbar;
  let toolbarHint;
  let markerRail;
  let toast;
  let modeButtons = [];
  let colorButtons = [];

  initialize().catch((error) => {
    console.warn("柔光荧光笔初始化失败", error);
  });

  async function initialize() {
    document.getElementById("__khaki_line_extension_root__")?.remove();
    document.getElementById("__soft_marker_extension_root__")?.remove();

    const stored = await chrome.storage.local.get(SETTINGS_KEY);
    settings = normalizeSettings(stored[SETTINGS_KEY]);

    mountUi();
    bindEvents();
    observePageChanges();
    await loadPageAnnotations();
    rebuildHighlights();
    notifyState();

    if (!supportsCustomHighlights) {
      showToast("请升级 Chrome 后使用文本标记功能", 3200);
    }
  }

  function mountUi() {
    host = document.createElement("div");
    host.id = "__soft_marker_extension_root__";
    setImportantStyle(host, "all", "initial");
    setImportantStyle(host, "position", "fixed");
    setImportantStyle(host, "inset", "0");
    setImportantStyle(host, "width", "100vw");
    setImportantStyle(host, "height", "100vh");
    setImportantStyle(host, "overflow", "visible");
    setImportantStyle(host, "pointer-events", "none");
    setImportantStyle(host, "z-index", "2147483647");

    const shadow = host.attachShadow({ mode: "open" });
    const style = document.createElement("style");
    style.textContent = `
      :host { all: initial; }
      * { box-sizing: border-box; }
      .toolbar {
        position: fixed;
        width: max-content;
        max-width: calc(100vw - 16px);
        padding: 8px;
        color: #34404a;
        background: rgba(255, 255, 255, 0.97);
        border: 1px solid rgba(89, 104, 116, 0.17);
        border-radius: 13px;
        box-shadow: 0 12px 34px rgba(38, 49, 58, 0.2), 0 2px 8px rgba(38, 49, 58, 0.08);
        font: 500 12px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
        pointer-events: auto;
        user-select: none;
        -webkit-user-select: none;
        backdrop-filter: blur(10px);
      }
      .toolbar[hidden] { display: none !important; }
      .mode-row, .color-row {
        display: flex;
        align-items: center;
      }
      .mode-row { gap: 5px; }
      .color-row {
        gap: 8px;
        margin-top: 8px;
        padding: 7px 5px 1px;
        border-top: 1px solid #edf0f2;
      }
      button {
        appearance: none;
        margin: 0;
        font: inherit;
      }
      .mode-button, .remove-button {
        height: 30px;
        padding: 0 10px;
        color: #56636d;
        cursor: pointer;
        background: transparent;
        border: 0;
        border-radius: 8px;
        font-weight: 650;
      }
      .mode-button:hover, .remove-button:hover { background: #f0f3f4; }
      .mode-button.active {
        color: #31414c;
        background: #e7eef1;
        box-shadow: inset 0 0 0 1px rgba(92, 119, 133, 0.12);
      }
      .mode-icon {
        display: inline-block;
        min-width: 16px;
        margin-right: 4px;
        text-align: center;
        font-weight: 800;
      }
      .underline-icon {
        text-decoration: underline 2px #718796;
        text-underline-offset: 2px;
      }
      .divider {
        width: 1px;
        height: 20px;
        margin: 0 2px;
        background: #e2e7ea;
      }
      .remove-button {
        padding: 0 8px;
        color: #8a6066;
      }
      .hint {
        margin-right: 1px;
        color: #89949c;
        font-size: 10px;
        white-space: nowrap;
      }
      .swatch {
        position: relative;
        width: 25px;
        height: 25px;
        padding: 0;
        cursor: pointer;
        background: var(--swatch);
        border: 2px solid #fff;
        border-radius: 50%;
        box-shadow: 0 0 0 1px rgba(64, 76, 84, 0.17);
        transition: transform 100ms ease, box-shadow 100ms ease;
      }
      .swatch:hover { transform: translateY(-1px) scale(1.06); }
      .swatch.active {
        box-shadow: 0 0 0 2px #526671, 0 2px 6px rgba(45, 58, 65, 0.16);
      }
      button:focus-visible {
        outline: 3px solid rgba(103, 142, 164, 0.28);
        outline-offset: 2px;
      }
      .marker-rail {
        position: fixed;
        top: 56px;
        right: 0;
        bottom: 36px;
        width: 30px;
        pointer-events: none;
      }
      .marker-rail[hidden] { display: none !important; }
      .marker-tab {
        --marker-color: #f1e2a1;
        position: absolute;
        right: 0;
        width: 18px;
        height: 27px;
        padding: 0;
        color: #42515a;
        cursor: pointer;
        background: var(--marker-color);
        border: 1px solid rgba(62, 75, 84, 0.2);
        border-right: 0;
        border-radius: 8px 0 0 8px;
        box-shadow: 0 3px 8px rgba(38, 49, 58, 0.15);
        transform: translateY(-50%);
        transition: width 120ms ease, filter 120ms ease, box-shadow 120ms ease;
        pointer-events: auto;
      }
      .marker-tab::after {
        content: "";
        position: absolute;
        top: 4px;
        right: 2px;
        bottom: 4px;
        width: 2px;
        background: rgba(48, 62, 70, 0.18);
        border-radius: 2px;
      }
      .marker-tab.underline::before {
        content: "";
        position: absolute;
        right: 5px;
        bottom: 4px;
        left: 3px;
        height: 2px;
        background: rgba(49, 66, 76, 0.56);
        border-radius: 2px;
      }
      .marker-tab:hover,
      .marker-tab:focus-visible,
      .marker-tab.active {
        width: 24px;
        filter: saturate(1.08) brightness(0.99);
        box-shadow: 0 4px 12px rgba(38, 49, 58, 0.22);
      }
      .marker-index {
        display: block;
        width: 15px;
        overflow: hidden;
        font: 700 8px/25px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        text-align: center;
      }
      .marker-label {
        position: absolute;
        top: 50%;
        right: 28px;
        display: block;
        width: max-content;
        max-width: min(230px, calc(100vw - 58px));
        padding: 8px 10px;
        color: #43515a;
        text-align: left;
        white-space: nowrap;
        background: rgba(255, 255, 255, 0.98);
        border: 1px solid rgba(79, 94, 104, 0.16);
        border-radius: 9px;
        box-shadow: 0 8px 24px rgba(38, 49, 58, 0.18);
        opacity: 0;
        visibility: hidden;
        transform: translate(7px, -50%);
        transition: opacity 110ms ease, transform 110ms ease, visibility 110ms ease;
        pointer-events: none;
      }
      .marker-label strong,
      .marker-label span {
        display: block;
        overflow: hidden;
        text-overflow: ellipsis;
      }
      .marker-label strong {
        margin-bottom: 3px;
        color: #73818a;
        font: 650 10px/1.2 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
      }
      .marker-label span {
        max-width: 205px;
        font: 500 12px/1.35 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Microsoft YaHei", sans-serif;
      }
      .marker-tab:hover .marker-label,
      .marker-tab:focus-visible .marker-label {
        opacity: 1;
        visibility: visible;
        transform: translate(0, -50%);
      }
      .toast {
        position: fixed;
        left: 50vw;
        bottom: 24px;
        max-width: min(360px, calc(100vw - 32px));
        padding: 9px 14px;
        color: #f8fafb;
        background: rgba(48, 59, 67, 0.93);
        border-radius: 9px;
        box-shadow: 0 8px 24px rgba(29, 38, 44, 0.2);
        font: 500 12px/1.4 -apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", sans-serif;
        opacity: 0;
        transform: translate(-50%, 10px);
        transition: opacity 150ms ease, transform 150ms ease;
        pointer-events: none;
      }
      .toast.visible {
        opacity: 1;
        transform: translate(-50%, 0);
      }
    `;

    toolbar = document.createElement("div");
    toolbar.className = "toolbar";
    toolbar.hidden = true;
    toolbar.setAttribute("role", "toolbar");
    toolbar.setAttribute("aria-label", "文本标记工具");

    const modeRow = document.createElement("div");
    modeRow.className = "mode-row";
    modeRow.append(
      createModeButton("background", "▰", "背景色"),
      createModeButton("underline", "U", "下划线", "underline-icon")
    );

    const divider = document.createElement("span");
    divider.className = "divider";
    divider.setAttribute("aria-hidden", "true");
    modeRow.appendChild(divider);

    const removeButton = document.createElement("button");
    removeButton.type = "button";
    removeButton.className = "remove-button";
    removeButton.dataset.action = "remove";
    removeButton.textContent = "清除标记";
    removeButton.title = "清除选中文字范围内的标记";
    modeRow.appendChild(removeButton);

    const colorRow = document.createElement("div");
    colorRow.className = "color-row";
    toolbarHint = document.createElement("span");
    toolbarHint.className = "hint";
    toolbarHint.textContent = "选颜色应用";
    colorRow.appendChild(toolbarHint);

    for (const [key, color] of Object.entries(COLORS)) {
      const button = document.createElement("button");
      button.type = "button";
      button.className = "swatch";
      button.dataset.color = key;
      button.style.setProperty("--swatch", color.value);
      button.setAttribute("aria-label", color.name);
      button.title = `${color.name}，点击应用`;
      colorRow.appendChild(button);
      colorButtons.push(button);
    }

    toolbar.append(modeRow, colorRow);
    toolbar.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    toolbar.addEventListener("pointerup", (event) => {
      event.preventDefault();
      event.stopPropagation();
      lastPointerActivation = Date.now();
      onToolbarClick(event).catch((error) => console.warn("柔光荧光笔操作失败", error));
    });
    toolbar.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    toolbar.addEventListener("mouseup", (event) => {
      if (Date.now() - lastPointerActivation < 500) return;
      event.preventDefault();
      event.stopPropagation();
      lastPointerActivation = Date.now();
      onToolbarClick(event).catch((error) => console.warn("柔光荧光笔操作失败", error));
    });
    toolbar.addEventListener("click", (event) => {
      if (Date.now() - lastPointerActivation < 500) return;
      onToolbarClick(event).catch((error) => console.warn("柔光荧光笔操作失败", error));
    });
    toolbar.addEventListener("keydown", (event) => {
      if (event.key === "Escape") hideToolbar();
    });

    markerRail = document.createElement("nav");
    markerRail.className = "marker-rail";
    markerRail.hidden = true;
    markerRail.setAttribute("aria-label", "页面标记导航");
    markerRail.addEventListener("pointerdown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    markerRail.addEventListener("mousedown", (event) => {
      event.preventDefault();
      event.stopPropagation();
    });
    markerRail.addEventListener("click", (event) => {
      const button = event.target.closest("[data-annotation-id]");
      if (!button) return;
      event.preventDefault();
      event.stopPropagation();
      jumpToAnnotation(button.dataset.annotationId);
    });

    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");

    shadow.append(style, toolbar, markerRail, toast);
    host.addEventListener("pointerdown", () => hideToolbar());
    host.addEventListener("mousedown", () => hideToolbar());
    document.documentElement.appendChild(host);
    updateToolbarState();
  }

  function createModeButton(mode, iconText, label, iconClass = "") {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "mode-button";
    button.dataset.mode = mode;
    button.setAttribute("aria-pressed", "false");

    const icon = document.createElement("span");
    icon.className = `mode-icon ${iconClass}`.trim();
    icon.textContent = iconText;
    icon.setAttribute("aria-hidden", "true");

    const text = document.createElement("span");
    text.textContent = label;
    button.append(icon, text);
    modeButtons.push(button);
    return button;
  }

  function bindEvents() {
    document.addEventListener("pointerdown", (event) => {
      if (event.button !== 0 || event.composedPath().includes(host)) return;
      pointerSelecting = true;
      hideToolbar();
    }, true);

    document.addEventListener("pointerup", (event) => {
      if (event.button !== 0 || event.composedPath().includes(host)) return;
      pointerSelecting = false;
      scheduleSelectionToolbar(20);
    }, true);

    document.addEventListener("pointercancel", () => {
      pointerSelecting = false;
    }, true);

    document.addEventListener("selectionchange", () => {
      if (!pointerSelecting) scheduleSelectionToolbar(110);
    });

    document.addEventListener("keyup", (event) => {
      if (event.shiftKey || event.key === "Shift") scheduleSelectionToolbar(30);
    }, true);

    window.addEventListener("scroll", () => {
      if (!toolbar.hidden && pendingSelection) positionToolbar(pendingSelection.range);
    }, true);
    window.addEventListener("resize", () => {
      if (!toolbar.hidden && pendingSelection) positionToolbar(pendingSelection.range);
      renderMarkerRail();
    }, { passive: true });

    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== "local" || !changes[SETTINGS_KEY]) return;
      settings = normalizeSettings(changes[SETTINGS_KEY].newValue);
      updateToolbarState();
    });

    chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
      handleMessage(message)
        .then(sendResponse)
        .catch((error) => sendResponse({ ok: false, error: error.message }));
      return true;
    });

    window.setInterval(checkForPageChange, 600);
  }

  function observePageChanges() {
    const observer = new MutationObserver(() => {
      if (!annotations.length) return;
      window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(rebuildHighlights, 320);
    });
    observer.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  async function handleMessage(message) {
    switch (message?.type) {
      case "SM_GET_STATE":
        return stateResponse();
      case "SM_SET_SETTINGS":
        settings = normalizeSettings(message.settings);
        updateToolbarState();
        return stateResponse();
      case "SM_UNDO":
        await undoLastAnnotation();
        return stateResponse();
      case "SM_CLEAR_PAGE":
        await clearPageAnnotations();
        return stateResponse();
      default:
        return { ok: false, error: "未知操作" };
    }
  }

  function stateResponse() {
    return {
      ok: true,
      supported: supportsCustomHighlights,
      count: annotations.length,
      resolvedCount: resolvedAnnotations.size,
      settings: { ...settings }
    };
  }

  function scheduleSelectionToolbar(delay) {
    window.clearTimeout(selectionTimer);
    selectionTimer = window.setTimeout(showToolbarForSelection, delay);
  }

  function showToolbarForSelection() {
    if (!supportsCustomHighlights || pointerSelecting) return;
    const range = getSelectedRange();
    if (!range) {
      hideToolbar();
      return;
    }

    const quote = quoteFromRange(range);
    if (!quote) {
      hideToolbar();
      return;
    }
    if (quote.exact.length > MAX_SELECTION_LENGTH) {
      hideToolbar();
      showToast(`单次最多标记 ${MAX_SELECTION_LENGTH.toLocaleString()} 个字符`);
      return;
    }

    pendingSelection = { range, quote };
    updateToolbarState();
    toolbar.hidden = false;
    toolbar.style.visibility = "hidden";
    positionToolbar(range);
    toolbar.style.visibility = "visible";
    setImportantStyle(host, "pointer-events", "auto");
  }

  function getSelectedRange() {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.isCollapsed) return null;

    const range = selection.getRangeAt(0);
    if (!range.toString().trim() || isEditableNode(range.startContainer) || isEditableNode(range.endContainer)) {
      return null;
    }
    if (!document.documentElement.contains(range.commonAncestorContainer)) return null;
    return range.cloneRange();
  }

  function isEditableNode(node) {
    const element = node.nodeType === Node.ELEMENT_NODE ? node : node.parentElement;
    if (!element) return false;
    return Boolean(element.closest("input, textarea, select, [contenteditable=''], [contenteditable='true']")) || element.isContentEditable;
  }

  function positionToolbar(range) {
    const rects = [...range.getClientRects()].filter((rect) => rect.width || rect.height);
    const rect = rects.findLast?.((item) => item.bottom >= 0 && item.top <= window.innerHeight)
      ?? [...rects].reverse().find((item) => item.bottom >= 0 && item.top <= window.innerHeight)
      ?? range.getBoundingClientRect();
    if (!rect || (!rect.width && !rect.height)) {
      hideToolbar();
      return;
    }

    const margin = 8;
    const width = toolbar.offsetWidth;
    const height = toolbar.offsetHeight;
    const preferredLeft = rect.left + (rect.width / 2) - (width / 2);
    const left = Math.max(margin, Math.min(window.innerWidth - width - margin, preferredLeft));
    const top = rect.top >= height + 12
      ? rect.top - height - 9
      : Math.min(window.innerHeight - height - margin, rect.bottom + 9);

    toolbar.style.left = `${Math.round(left)}px`;
    toolbar.style.top = `${Math.max(margin, Math.min(window.innerHeight - height - margin, Math.round(top)))}px`;
  }

  function hideToolbar(clearPending = true) {
    if (!toolbar) return;
    toolbar.hidden = true;
    toolbar.style.visibility = "hidden";
    setImportantStyle(host, "pointer-events", "none");
    if (clearPending) pendingSelection = null;
  }

  async function onToolbarClick(event) {
    const modeButton = event.target.closest("[data-mode]");
    if (modeButton) {
      settings = normalizeSettings({ ...settings, mode: modeButton.dataset.mode });
      await saveSettings();
      updateToolbarState();
      return;
    }

    const colorButton = event.target.closest("[data-color]");
    if (colorButton) {
      settings = normalizeSettings({ ...settings, color: colorButton.dataset.color });
      await saveSettings();
      await applyPendingSelection();
      return;
    }

    if (event.target.closest("[data-action='remove']")) {
      await removeAnnotationsInPendingSelection();
    }
  }

  function updateToolbarState() {
    for (const button of modeButtons) {
      const active = button.dataset.mode === settings.mode;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    for (const button of colorButtons) {
      const active = button.dataset.color === settings.color;
      button.classList.toggle("active", active);
      button.setAttribute("aria-pressed", String(active));
    }
    if (toolbarHint) {
      toolbarHint.textContent = settings.mode === "background" ? "背景颜色" : "下划线颜色";
    }
  }

  async function applyPendingSelection() {
    if (!pendingSelection) return;
    const quote = quoteFromRange(pendingSelection.range) ?? pendingSelection.quote;
    if (!quote?.exact.trim()) return;

    annotations = annotations.filter((annotation) => {
      const resolved = resolvedAnnotations.get(annotation.id);
      return !resolved || resolved.start !== quote.startHint || resolved.end !== quote.startHint + quote.exact.length;
    });
    annotations.push({
      id: createId(),
      mode: settings.mode,
      color: settings.color,
      exact: quote.exact,
      prefix: quote.prefix,
      suffix: quote.suffix,
      startHint: quote.startHint,
      createdAt: new Date().toISOString()
    });
    annotations = annotations.slice(-MAX_ANNOTATIONS_PER_PAGE);

    await savePageAnnotations();
    rebuildHighlights();
    clearNativeSelection();
    hideToolbar();
    notifyState();
    showToast(settings.mode === "background" ? "已添加背景色" : "已添加下划线");
  }

  async function removeAnnotationsInPendingSelection() {
    if (!pendingSelection) return;
    const quote = quoteFromRange(pendingSelection.range) ?? pendingSelection.quote;
    if (!quote) return;

    rebuildHighlights();
    const selectionStart = quote.startHint;
    const selectionEnd = selectionStart + quote.exact.length;
    const previousCount = annotations.length;
    annotations = annotations.filter((annotation) => {
      const resolved = resolvedAnnotations.get(annotation.id);
      if (!resolved) return true;
      return resolved.end <= selectionStart || resolved.start >= selectionEnd;
    });

    if (annotations.length === previousCount) {
      showToast("选中文字中没有已有标记");
      return;
    }

    await savePageAnnotations();
    rebuildHighlights();
    clearNativeSelection();
    hideToolbar();
    notifyState();
    showToast("已清除选中文字中的标记");
  }

  async function undoLastAnnotation() {
    hideToolbar();
    if (!annotations.length) {
      showToast("本页还没有标记");
      return;
    }
    annotations.pop();
    await savePageAnnotations();
    rebuildHighlights();
    notifyState();
    showToast("已撤销上一处标记");
  }

  async function clearPageAnnotations() {
    hideToolbar();
    annotations = [];
    await savePageAnnotations();
    rebuildHighlights();
    notifyState();
    showToast("已清空当前页面的标记");
  }

  function rebuildHighlights() {
    if (!supportsCustomHighlights) return;
    clearManagedHighlights();
    resolvedAnnotations = new Map();

    const snapshot = buildTextSnapshot();
    const groups = new Map();

    for (const annotation of annotations) {
      const location = locateQuote(annotation, snapshot.text);
      if (!location) continue;
      const range = rangeFromOffsets(snapshot.segments, location.start, location.end);
      if (!range) continue;

      resolvedAnnotations.set(annotation.id, { ...location, range });
      const name = highlightName(annotation.mode, annotation.color);
      if (!groups.has(name)) groups.set(name, []);
      groups.get(name).push(range);
    }

    for (const [name, ranges] of groups) {
      CSS.highlights.set(name, new Highlight(...ranges));
    }
    renderMarkerRail();
  }

  function clearManagedHighlights() {
    if (!supportsCustomHighlights) return;
    window.clearTimeout(focusTimer);
    for (const name of HIGHLIGHT_NAMES) CSS.highlights.delete(name);
    CSS.highlights.delete(FOCUS_HIGHLIGHT_NAME);
  }

  function renderMarkerRail() {
    if (!markerRail) return;

    const items = annotations
      .map((annotation) => {
        const resolved = resolvedAnnotations.get(annotation.id);
        if (!resolved) return null;
        const rect = [...resolved.range.getClientRects()].find((item) => item.width || item.height)
          ?? resolved.range.getBoundingClientRect();
        return {
          annotation,
          documentTop: Math.max(0, rect.top + window.scrollY)
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.documentTop - right.documentTop);

    markerRail.replaceChildren();
    markerRail.hidden = items.length === 0;
    if (!items.length) return;

    const railHeight = Math.max(120, markerRail.getBoundingClientRect().height || window.innerHeight - 92);
    const edge = 15;
    const documentHeight = Math.max(
      window.innerHeight,
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0
    );
    const ideals = items.map((item) => {
      const ratio = Math.max(0, Math.min(1, item.documentTop / documentHeight));
      return edge + (ratio * (railHeight - (edge * 2)));
    });
    const gap = Math.max(4, Math.min(24, (railHeight - (edge * 2)) / Math.max(1, items.length - 1)));
    const positions = [...ideals];

    for (let index = 1; index < positions.length; index += 1) {
      positions[index] = Math.max(positions[index], positions[index - 1] + gap);
    }
    if (positions.at(-1) > railHeight - edge) {
      positions[positions.length - 1] = railHeight - edge;
      for (let index = positions.length - 2; index >= 0; index -= 1) {
        positions[index] = Math.min(positions[index], positions[index + 1] - gap);
      }
    }

    const fragment = document.createDocumentFragment();
    items.forEach(({ annotation }, index) => {
      const button = document.createElement("button");
      const snippet = annotation.exact.trim().replace(/\s+/g, " ").slice(0, 72) || "空白标记";
      const modeLabel = annotation.mode === "underline" ? "下划线" : "背景色";

      button.type = "button";
      button.className = `marker-tab${annotation.mode === "underline" ? " underline" : ""}`;
      button.dataset.annotationId = annotation.id;
      button.style.top = `${Math.round(positions[index])}px`;
      button.style.setProperty("--marker-color", COLORS[annotation.color]?.value ?? COLORS.yellow.value);
      button.setAttribute("aria-label", `跳转到标记 ${index + 1}：${snippet}`);
      button.title = `标记 ${index + 1}：${snippet}`;

      const number = document.createElement("span");
      number.className = "marker-index";
      number.textContent = String(index + 1);
      number.setAttribute("aria-hidden", "true");

      const label = document.createElement("span");
      label.className = "marker-label";
      label.setAttribute("aria-hidden", "true");

      const heading = document.createElement("strong");
      heading.textContent = `标记 ${index + 1} · ${modeLabel}`;
      const text = document.createElement("span");
      text.textContent = snippet;
      label.append(heading, text);
      button.append(number, label);
      fragment.appendChild(button);
    });
    markerRail.appendChild(fragment);
  }

  function jumpToAnnotation(annotationId) {
    const resolved = resolvedAnnotations.get(annotationId);
    if (!resolved) {
      showToast("暂时找不到这处标记");
      return;
    }

    const rect = resolved.range.getBoundingClientRect();
    const documentHeight = Math.max(
      document.documentElement.scrollHeight,
      document.body?.scrollHeight ?? 0
    );
    const targetTop = Math.max(0, Math.min(
      documentHeight - window.innerHeight,
      window.scrollY + rect.top - (window.innerHeight * 0.36)
    ));
    const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    window.scrollTo({ top: targetTop, behavior: reducedMotion ? "auto" : "smooth" });

    for (const button of markerRail.querySelectorAll(".marker-tab")) {
      button.classList.toggle("active", button.dataset.annotationId === annotationId);
    }
    window.setTimeout(() => {
      markerRail.querySelector(`[data-annotation-id="${CSS.escape(annotationId)}"]`)?.classList.remove("active");
    }, 1500);

    window.clearTimeout(focusTimer);
    CSS.highlights.delete(FOCUS_HIGHLIGHT_NAME);
    CSS.highlights.set(FOCUS_HIGHLIGHT_NAME, new Highlight(resolved.range));
    focusTimer = window.setTimeout(() => CSS.highlights.delete(FOCUS_HIGHLIGHT_NAME), 1500);
  }

  function buildTextSnapshot() {
    const root = document.body ?? document.documentElement;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (!node.data) return NodeFilter.FILTER_REJECT;
        const parent = node.parentElement;
        if (!parent) return NodeFilter.FILTER_REJECT;
        if (parent.closest("script, style, noscript, textarea, input, select, option, [hidden]")) {
          return NodeFilter.FILTER_REJECT;
        }
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const segments = [];
    const parts = [];
    let offset = 0;
    let node;
    while ((node = walker.nextNode())) {
      const text = node.data;
      segments.push({ node, start: offset, end: offset + text.length });
      parts.push(text);
      offset += text.length;
    }
    return { text: parts.join(""), segments };
  }

  function quoteFromRange(range) {
    const exact = range.toString();
    if (!exact) return null;

    const snapshot = buildTextSnapshot();
    let start = boundaryOffset(snapshot.segments, range.startContainer, range.startOffset);
    let end = boundaryOffset(snapshot.segments, range.endContainer, range.endOffset);

    if (start === null || end === null || snapshot.text.slice(start, end) !== exact) {
      const fallback = nearestOccurrence(snapshot.text, exact, start ?? 0);
      if (fallback === -1) return null;
      start = fallback;
      end = start + exact.length;
    }

    return {
      exact,
      prefix: snapshot.text.slice(Math.max(0, start - CONTEXT_LENGTH), start),
      suffix: snapshot.text.slice(end, end + CONTEXT_LENGTH),
      startHint: start
    };
  }

  function boundaryOffset(segments, container, localOffset) {
    if (container.nodeType !== Node.TEXT_NODE) return null;
    const segment = segments.find((item) => item.node === container);
    if (!segment) return null;
    return segment.start + Math.max(0, Math.min(container.data.length, localOffset));
  }

  function locateQuote(annotation, text) {
    if (!annotation.exact || !text.includes(annotation.exact)) return null;

    let best = null;
    let index = text.indexOf(annotation.exact);
    while (index !== -1) {
      const end = index + annotation.exact.length;
      const prefixScore = matchingSuffixLength(text.slice(Math.max(0, index - CONTEXT_LENGTH), index), annotation.prefix);
      const suffixScore = matchingPrefixLength(text.slice(end, end + CONTEXT_LENGTH), annotation.suffix);
      const distancePenalty = Math.min(Math.abs(index - annotation.startHint), 100000) / 100000;
      const score = (prefixScore * 2) + (suffixScore * 2) - distancePenalty;
      if (!best || score > best.score) best = { start: index, end, score };
      index = text.indexOf(annotation.exact, index + 1);
    }
    return best && { start: best.start, end: best.end };
  }

  function nearestOccurrence(text, exact, hint) {
    let bestIndex = -1;
    let bestDistance = Number.POSITIVE_INFINITY;
    let index = text.indexOf(exact);
    while (index !== -1) {
      const distance = Math.abs(index - hint);
      if (distance < bestDistance) {
        bestIndex = index;
        bestDistance = distance;
      }
      index = text.indexOf(exact, index + 1);
    }
    return bestIndex;
  }

  function matchingPrefixLength(left, right) {
    const limit = Math.min(left.length, right.length);
    let count = 0;
    while (count < limit && left[count] === right[count]) count += 1;
    return count;
  }

  function matchingSuffixLength(left, right) {
    const limit = Math.min(left.length, right.length);
    let count = 0;
    while (count < limit && left[left.length - 1 - count] === right[right.length - 1 - count]) count += 1;
    return count;
  }

  function rangeFromOffsets(segments, start, end) {
    const startPoint = pointForOffset(segments, start);
    const endPoint = pointForOffset(segments, end);
    if (!startPoint || !endPoint) return null;

    try {
      const range = document.createRange();
      range.setStart(startPoint.node, startPoint.offset);
      range.setEnd(endPoint.node, endPoint.offset);
      return range;
    } catch {
      return null;
    }
  }

  function pointForOffset(segments, offset) {
    for (const segment of segments) {
      if (offset >= segment.start && offset <= segment.end) {
        return { node: segment.node, offset: offset - segment.start };
      }
    }
    const last = segments.at(-1);
    return last && offset === last.end ? { node: last.node, offset: last.node.data.length } : null;
  }

  async function checkForPageChange() {
    const nextUrl = currentPageUrl();
    if (nextUrl === pageUrl || pageSwitchInProgress) return;

    pageSwitchInProgress = true;
    try {
      hideToolbar();
      clearManagedHighlights();
      pageUrl = nextUrl;
      annotations = [];
      resolvedAnnotations = new Map();
      renderMarkerRail();
      await loadPageAnnotations();
      rebuildHighlights();
      window.clearTimeout(mutationTimer);
      mutationTimer = window.setTimeout(rebuildHighlights, 450);
      notifyState();
    } finally {
      pageSwitchInProgress = false;
    }
  }

  async function loadPageAnnotations() {
    await storageWriteQueue.catch(() => {});
    const key = pageStorageKey(pageUrl);
    const stored = await chrome.storage.local.get(key);
    const record = stored[key];
    annotations = record?.url === pageUrl ? sanitizeAnnotations(record.annotations) : [];
  }

  function savePageAnnotations() {
    const key = pageStorageKey(pageUrl);
    const record = {
      version: 2,
      url: pageUrl,
      updatedAt: new Date().toISOString(),
      annotations: annotations.map((annotation) => ({ ...annotation }))
    };

    const write = async () => {
      try {
        if (record.annotations.length) {
          await chrome.storage.local.set({ [key]: record });
        } else {
          await chrome.storage.local.remove(key);
        }
      } catch (error) {
        console.warn("柔光荧光笔保存失败", error);
        showToast("保存失败：浏览器本地空间可能已满");
      }
    };

    storageWriteQueue = storageWriteQueue.then(write, write);
    return storageWriteQueue;
  }

  async function saveSettings() {
    try {
      await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
    } catch (error) {
      console.warn("柔光荧光笔设置保存失败", error);
    }
  }

  function sanitizeAnnotations(value) {
    if (!Array.isArray(value)) return [];
    return value
      .slice(-MAX_ANNOTATIONS_PER_PAGE)
      .filter((item) => item && MODES.has(item.mode) && COLORS[item.color] && typeof item.exact === "string" && item.exact.length > 0)
      .map((item) => ({
        id: typeof item.id === "string" ? item.id : createId(),
        mode: item.mode,
        color: item.color,
        exact: item.exact.slice(0, MAX_SELECTION_LENGTH),
        prefix: typeof item.prefix === "string" ? item.prefix.slice(-CONTEXT_LENGTH) : "",
        suffix: typeof item.suffix === "string" ? item.suffix.slice(0, CONTEXT_LENGTH) : "",
        startHint: Number.isFinite(Number(item.startHint)) ? Math.max(0, Number(item.startHint)) : 0,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : new Date().toISOString()
      }));
  }

  function normalizeSettings(value) {
    return {
      mode: MODES.has(value?.mode) ? value.mode : DEFAULT_SETTINGS.mode,
      color: COLORS[value?.color] ? value.color : DEFAULT_SETTINGS.color
    };
  }

  function currentPageUrl() {
    const url = new URL(window.location.href);
    url.hash = "";
    return url.href;
  }

  function pageStorageKey(url) {
    let hashA = 0x811c9dc5;
    let hashB = 0x9e3779b9;
    for (let index = 0; index < url.length; index += 1) {
      const code = url.charCodeAt(index);
      hashA = Math.imul(hashA ^ code, 0x01000193);
      hashB = Math.imul(hashB ^ code, 0x85ebca6b);
    }
    return `${PAGE_KEY_PREFIX}${(hashA >>> 0).toString(36)}-${(hashB >>> 0).toString(36)}`;
  }

  function highlightName(mode, color) {
    return `soft-marker-${mode}-${color}`;
  }

  function createId() {
    if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  function clearNativeSelection() {
    const selection = window.getSelection();
    if (selection) selection.removeAllRanges();
  }

  function setImportantStyle(element, property, value) {
    element.style.setProperty(property, value, "important");
  }

  function showToast(message, duration = 1900) {
    if (!toast) return;
    window.clearTimeout(toastTimer);
    toast.textContent = message;
    toast.classList.add("visible");
    toastTimer = window.setTimeout(() => toast.classList.remove("visible"), duration);
  }

  function notifyState() {
    try {
      const result = chrome.runtime.sendMessage({
        type: "SM_STATE_CHANGED",
        count: annotations.length
      });
      if (result?.catch) result.catch(() => {});
    } catch {
      // The extension may have been reloaded while this page was open.
    }
  }
})();
