const BADGE_COLOR = "#738a9a";

async function setAnnotationBadge(tabId, count) {
  if (!Number.isInteger(tabId)) return;

  await chrome.action.setBadgeBackgroundColor({ tabId, color: BADGE_COLOR });
  const value = Number(count) || 0;
  await chrome.action.setBadgeText({ tabId, text: value ? String(Math.min(value, 99)) : "" });
}

chrome.runtime.onMessage.addListener((message, sender) => {
  if (message?.type !== "SM_STATE_CHANGED" || !sender.tab?.id) return;
  setAnnotationBadge(sender.tab.id, message.count).catch(() => {});
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
  if (changeInfo.status === "loading") {
    setAnnotationBadge(tabId, 0).catch(() => {});
  }
});
