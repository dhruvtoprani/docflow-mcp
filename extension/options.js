const DEFAULT_ENDPOINT = "https://docflow-mcp.vercel.app/api/clip";

const endpointInput = document.getElementById("endpoint");
const statusEl = document.getElementById("status");
const saveButton = document.getElementById("save");
const resetButton = document.getElementById("reset");

function setStatus(message, isError = false) {
  statusEl.textContent = message;
  statusEl.style.color = isError ? "#a11" : "#365";
}

async function load() {
  const stored = await chrome.storage.sync.get(["docflowClipEndpoint"]);
  endpointInput.value = stored.docflowClipEndpoint || DEFAULT_ENDPOINT;
}

async function save() {
  const endpoint = endpointInput.value.trim();
  if (!endpoint) {
    setStatus("Endpoint cannot be empty.", true);
    return;
  }

  await chrome.storage.sync.set({ docflowClipEndpoint: endpoint });
  setStatus("Saved.");
}

async function reset() {
  endpointInput.value = DEFAULT_ENDPOINT;
  await chrome.storage.sync.set({ docflowClipEndpoint: DEFAULT_ENDPOINT });
  setStatus("Reset to default.");
}

saveButton.addEventListener("click", save);
resetButton.addEventListener("click", reset);

load();
