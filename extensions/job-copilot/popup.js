const profileIdInput = document.getElementById("profileId");
const apiBaseUrlInput = document.getElementById("apiBaseUrl");
const saveBtn = document.getElementById("saveBtn");
const openSidepanelBtn = document.getElementById("openSidepanelBtn");
const statusEl = document.getElementById("status");

function setStatus(text, isError) {
  statusEl.textContent = text;
  statusEl.style.color = isError ? "#b91c1c" : "#166534";
}

function loadSettings() {
  chrome.storage.sync.get(
    {
      profileId: "",
      apiBaseUrl: "http://localhost:3000",
    },
    (items) => {
      profileIdInput.value = items.profileId || "";
      apiBaseUrlInput.value = items.apiBaseUrl || "http://localhost:3000";
    },
  );
}

saveBtn.addEventListener("click", () => {
  const profileId = profileIdInput.value.trim();
  const apiBaseUrl = apiBaseUrlInput.value.trim().replace(/\/+$/, "");

  if (!profileId) {
    setStatus("Profile ID is required.", true);
    return;
  }
  if (!/^https?:\/\//i.test(apiBaseUrl)) {
    setStatus("API Base URL must start with http:// or https://.", true);
    return;
  }

  chrome.storage.sync.set({ profileId, apiBaseUrl }, () => {
    if (chrome.runtime.lastError) {
      setStatus(chrome.runtime.lastError.message || "Failed to save settings.", true);
      return;
    }
    setStatus("Saved.", false);
  });
});

loadSettings();

openSidepanelBtn.addEventListener("click", async () => {
  try {
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const tab = tabs && tabs[0] ? tabs[0] : null;
    if (!tab || typeof tab.id !== "number") {
      setStatus("No active tab found.", true);
      return;
    }
    await chrome.sidePanel.setOptions({
      tabId: tab.id,
      path: "sidepanel/sidepanel.html",
      enabled: true,
    });
    await chrome.sidePanel.open({ tabId: tab.id });
    window.close();
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Failed to open side panel.", true);
  }
});

