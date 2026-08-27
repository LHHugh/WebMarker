const SETTINGS_KEY = "softMarkerSettings";
const DEFAULT_SETTINGS = Object.freeze({ mode: "background", color: "yellow" });
const COLOR_NAMES = Object.freeze({
  yellow: "柔黄",
  green: "柔绿",
  blue: "柔蓝",
  pink: "柔粉",
  purple: "柔紫",
  orange: "柔橙"
});

const elements = {
  statusPill: document.querySelector("#status-pill"),
  unavailableNote: document.querySelector("#unavailable-note"),
  styleCard: document.querySelector("#style-card"),
  modeSwitch: document.querySelector("#mode-switch"),
  palette: document.querySelector("#palette"),
  selectedColor: document.querySelector("#selected-color"),
  pageCount: document.querySelector("#page-count"),
  undo: document.querySelector("#undo"),
  clear: document.querySelector("#clear")
};

let activeTabId = null;
let available = false;
let supported = true;
let count = 0;
let settings = { ...DEFAULT_SETTINGS };

initialize();

async function initialize() {
  bindEvents();

  const stored = await chrome.storage.local.get(SETTINGS_KEY);
  settings = normalizeSettings(stored[SETTINGS_KEY]);

  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  activeTabId = tab?.id ?? null;

  const response = await connectToPage();
  if (response?.ok) {
    available = true;
    supported = response.supported !== false;
    count = Number(response.count) || 0;
    settings = normalizeSettings(response.settings ?? settings);
  }
  render();
}

function bindEvents() {
  elements.modeSwitch.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-mode]");
    if (!button) return;
    await updateSettings({ mode: button.dataset.mode });
  });

  elements.palette.addEventListener("click", async (event) => {
    const button = event.target.closest("[data-color]");
    if (!button) return;
    await updateSettings({ color: button.dataset.color });
  });

  elements.undo.addEventListener("click", async () => {
    const response = await sendToPage({ type: "SM_UNDO" });
    if (!response?.ok) return;
    count = Number(response.count) || 0;
    render();
  });

  elements.clear.addEventListener("click", async () => {
    if (!count || !window.confirm("清空当前页面的全部文字标记？此操作无法撤销。")) return;
    const response = await sendToPage({ type: "SM_CLEAR_PAGE" });
    if (!response?.ok) return;
    count = Number(response.count) || 0;
    render();
  });
}

async function connectToPage() {
  if (activeTabId === null) return null;

  const existing = await sendToPage({ type: "SM_GET_STATE" }, false);
  if (existing?.ok) return existing;

  try {
    await chrome.scripting.insertCSS({
      target: { tabId: activeTabId },
      files: ["content.css"]
    });
    await chrome.scripting.executeScript({
      target: { tabId: activeTabId },
      files: ["content.js"]
    });
  } catch {
    return null;
  }

  for (let attempt = 0; attempt < 4; attempt += 1) {
    await wait(90 + (attempt * 70));
    const response = await sendToPage({ type: "SM_GET_STATE" }, false);
    if (response?.ok) return response;
  }
  return null;
}

async function updateSettings(patch) {
  settings = normalizeSettings({ ...settings, ...patch });
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
  if (available) await sendToPage({ type: "SM_SET_SETTINGS", settings });
  render();
}

async function sendToPage(message, markUnavailable = true) {
  if (activeTabId === null) return null;
  try {
    return await chrome.tabs.sendMessage(activeTabId, message);
  } catch {
    if (markUnavailable) {
      available = false;
      render();
    }
    return null;
  }
}

function render() {
  const ready = available && supported;
  elements.statusPill.classList.toggle("ready", ready);
  elements.statusPill.classList.toggle("error", !ready);
  elements.statusPill.textContent = ready ? "已就绪" : available ? "请更新 Chrome" : "不可用";
  elements.unavailableNote.hidden = ready;
  if (available && !supported) {
    elements.unavailableNote.textContent = "当前 Chrome 版本不支持文本高亮 API，请升级到 Chrome 105 或更高版本。";
  }
  elements.styleCard.classList.toggle("disabled", !ready);

  for (const button of elements.modeSwitch.querySelectorAll("[data-mode]")) {
    button.setAttribute("aria-pressed", String(button.dataset.mode === settings.mode));
  }
  for (const button of elements.palette.querySelectorAll("[data-color]")) {
    const selected = button.dataset.color === settings.color;
    button.setAttribute("aria-checked", String(selected));
    button.tabIndex = selected ? 0 : -1;
  }

  elements.selectedColor.textContent = `${COLOR_NAMES[settings.color]} · 低饱和`;
  elements.pageCount.textContent = String(count);
  elements.undo.disabled = !ready || count === 0;
  elements.clear.disabled = !ready || count === 0;
}

function normalizeSettings(value) {
  return {
    mode: value?.mode === "underline" ? "underline" : "background",
    color: COLOR_NAMES[value?.color] ? value.color : DEFAULT_SETTINGS.color
  };
}

function wait(milliseconds) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}
