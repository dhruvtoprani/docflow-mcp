const DEFAULT_ENDPOINT = "https://docflow-mcp.vercel.app/api/clip";

const urlInput = document.getElementById("url");
const goalInput = document.getElementById("goal");
const modeInput = document.getElementById("mode");
const output = document.getElementById("output");
const statusEl = document.getElementById("status");

const clipButton = document.getElementById("clip");
const useTabButton = document.getElementById("useTab");
const copyButton = document.getElementById("copy");
const openOptionsButton = document.getElementById("openOptions");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#a11" : "#3b5a7c";
}

async function getEndpoint() {
  const stored = await chrome.storage.sync.get(["docflowClipEndpoint"]);
  return stored.docflowClipEndpoint || DEFAULT_ENDPOINT;
}

async function useCurrentTabUrl() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (tab && tab.url) {
    urlInput.value = tab.url;
    setStatus("Using current tab URL.");
  }
}

async function runClip() {
  const url = urlInput.value.trim();
  const goal = goalInput.value.trim();
  const mode = modeInput.value;

  if (!url) {
    setStatus("Enter a URL first.", true);
    return;
  }

  const endpoint = await getEndpoint();
  setStatus("Clipping...");

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        url,
        goal: goal || undefined,
        mode,
        maxChars: 12000
      })
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || "Clip request failed.");
    }

    output.value = data.copyReadyText || "";
    setStatus(`Done. ${output.value.length.toLocaleString()} chars ready.`);
  } catch (error) {
    setStatus(error instanceof Error ? error.message : "Clip failed.", true);
  }
}

async function copyOutput() {
  if (!output.value) {
    setStatus("Nothing to copy.", true);
    return;
  }

  await navigator.clipboard.writeText(output.value);
  setStatus("Copied.");
}

clipButton.addEventListener("click", runClip);
useTabButton.addEventListener("click", useCurrentTabUrl);
copyButton.addEventListener("click", copyOutput);
openOptionsButton.addEventListener("click", () => chrome.runtime.openOptionsPage());

useCurrentTabUrl();
