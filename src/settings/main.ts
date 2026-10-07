import { readSettings, writeSettings, subscribeToSettings } from "../settings";
import "../popup/popup.css";
import "./settings.css";

const checkbox = document.querySelector<HTMLInputElement>("#search-urls")!;
const status = document.querySelector<HTMLElement>("#save-status")!;
let saved = false;
let saving = false;
let revision = 0;
subscribeToSettings(settings => {
  revision++;
  saved = settings.searchUrlsAndDomains;
  if (!saving) checkbox.checked = saved;
});
void readSettings().then(settings => {
  if (revision === 0) saved = settings.searchUrlsAndDomains;
  checkbox.checked = saved;
  checkbox.disabled = false;
  status.textContent = "Changes save automatically.";
}).catch(() => { status.textContent = "Could not load settings. Reload this page to try again."; });

checkbox.addEventListener("change", async () => {
  saving = true;
  checkbox.disabled = true;
  const next = checkbox.checked;
  status.textContent = "Saving…";
  try {
    await writeSettings({ searchUrlsAndDomains: next });
    saved = next;
    status.textContent = "Settings saved.";
  } catch {
    checkbox.checked = saved;
    status.textContent = "Could not save. Please try again.";
  } finally { saving = false; checkbox.disabled = false; }
});
