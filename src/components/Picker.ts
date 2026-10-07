import { createIcon, type IconName } from "../popup/icons";

export interface ViewController { destroy(): void; }
export interface PickerRow {
  title: string;
  subtitle: string;
  icon: IconName;
  actionLabel?: string;
  disabled?: boolean;
}
interface PickerOptions<T> {
  placeholder: string;
  emptyLabel: string;
  itemLabel?: string;
  selectLabel?: string;
  newTabHint?: boolean;
  filter: (items: T[], query: string) => T[];
  describe: (item: T) => PickerRow;
  onSelect: (item: T, event: MouseEvent | KeyboardEvent) => Promise<void>;
  secondaryAction?: {
    label: string;
    icon: IconName;
    run: (item: T, anchor: HTMLButtonElement) => void | Promise<void>;
  };
  onVisible?: (items: T[]) => void;
  onEscape?: () => boolean;
}

interface RenderedRow<T> {
  item: T;
  li: HTMLLIElement;
  button: HTMLButtonElement;
  icon: HTMLElement;
  iconName: IconName | null;
  title: HTMLElement;
  subtitle: HTMLElement;
  actionLabel: HTMLElement;
  secondary?: HTMLButtonElement;
}

function setText(element: HTMLElement, text: string) {
  if (element.textContent !== text) element.textContent = text;
}

export function createPicker<T extends { id: string }>(container: HTMLElement, options: PickerOptions<T>) {
  let destroyed = false;
  let items: T[] = [];
  let filtered: T[] = [];
  let totalMatches = 0;
  let activeIndex = 0;
  let loading = true;
  let submitting = false;
  let filter = options.filter;
  let message = "";
  let filterDirty = true;
  const rows = new Map<string, RenderedRow<T>>();

  const root = document.createElement("section");
  root.className = "popup-view";
  const searchField = document.createElement("div");
  searchField.className = "search-field";
  const input = document.createElement("input");
  input.className = "search-input";
  input.type = "text";
  input.placeholder = options.placeholder;
  input.autocomplete = "off";
  input.spellcheck = false;
  input.setAttribute("aria-label", options.placeholder.replace(/\.+$/, ""));
  searchField.append(createIcon("search", 18), input);
  const alerts = document.createElement("div");
  alerts.className = "status-alerts";
  alerts.setAttribute("role", "status");
  const alert = document.createElement("div");
  alert.className = "status-alert status-alert--error";
  const scroller = document.createElement("div");
  scroller.className = "results-scroller";
  const list = document.createElement("ul");
  list.className = "result-list";
  const emptyState = document.createElement("li");
  emptyState.className = "empty-state";
  scroller.append(list);

  const footer = document.createElement("footer");
  footer.className = "picker-footer";
  const count = document.createElement("span");
  count.className = "result-count";
  const hints = document.createElement("span");
  hints.className = "picker-hints";
  for (const [key, label] of [
    ["↑↓", "Move"], ["↵", options.selectLabel ?? "Select"],
    ...(options.newTabHint ? [["Ctrl ↵", "New tab"]] : []),
  ]) {
    const hint = document.createElement("span");
    const shortcut = document.createElement("kbd");
    shortcut.textContent = key;
    hint.append(shortcut, document.createTextNode(label));
    hints.append(hint);
  }
  footer.append(count, hints);
  root.append(searchField, alerts, scroller, footer);
  container.replaceChildren(root);

  const focus = () => { if (!destroyed && !input.disabled) input.focus(); };
  const updateSelection = (scroll: boolean) => {
    filtered.forEach((item, index) => {
      const entry = rows.get(item.id)!;
      const selected = index === activeIndex;
      entry.li.classList.toggle("is-selected", selected);
      entry.button.classList.toggle("is-selected", selected);
    });
    if (!scroll || !filtered[activeIndex]) return;
    const li = rows.get(filtered[activeIndex].id)!.li;
    const top = list.offsetTop + li.offsetTop;
    const bottom = top + li.offsetHeight;
    if (top < scroller.scrollTop) scroller.scrollTop = top;
    else if (bottom > scroller.scrollTop + scroller.clientHeight) scroller.scrollTop = bottom - scroller.clientHeight;
  };
  const run = async (action: () => void | Promise<void>) => {
    if (destroyed || loading || submitting) return;
    submitting = true;
    message = "";
    render();
    try { await action(); }
    catch (error) { message = error instanceof Error ? error.message : String(error); }
    finally {
      submitting = false;
      if (!destroyed) { render(); focus(); }
    }
  };
  const select = (item: T, event: MouseEvent | KeyboardEvent) => {
    if (!options.describe(item).disabled) void run(() => options.onSelect(item, event));
  };
  const createRow = (item: T): RenderedRow<T> => {
    const li = document.createElement("li");
    li.className = "result-item";
    const button = document.createElement("button");
    button.type = "button";
    button.className = "result-button";
    const icon = document.createElement("span");
    icon.className = "row-icon";
    const copy = document.createElement("span");
    copy.className = "row-text";
    const title = document.createElement("span");
    title.className = "row-title";
    const subtitle = document.createElement("span");
    subtitle.className = "row-subtitle";
    const actionLabel = document.createElement("span");
    actionLabel.className = "row-action-label";
    copy.append(title, subtitle);
    button.append(icon, copy, actionLabel);
    li.append(button);
    const entry: RenderedRow<T> = { item, li, button, icon, iconName: null, title, subtitle, actionLabel };
    button.addEventListener("click", event => select(entry.item, event));
    if (options.secondaryAction) {
      const action = options.secondaryAction;
      const secondary = document.createElement("button");
      secondary.type = "button";
      secondary.className = "row-action";
      secondary.append(createIcon(action.icon, 18));
      secondary.addEventListener("click", () => {
        if (loading || submitting) return;
        try {
          Promise.resolve(action.run(entry.item, secondary)).catch(error => {
            message = error instanceof Error ? error.message : String(error);
            render();
          });
        } catch (error) { message = String(error); render(); }
      });
      entry.secondary = secondary;
      li.append(secondary);
    }
    return entry;
  };
  const render = (scroll = false) => {
    if (destroyed) return;
    if (filterDirty) {
      const matches = filter(items, input.value);
      totalMatches = matches.length;
      filtered = matches.slice(0, 20);
      activeIndex = Math.max(0, Math.min(activeIndex, filtered.length - 1));
      filterDirty = false;
    }
    input.disabled = loading || submitting;
    root.setAttribute("aria-busy", String(loading || submitting));
    setText(alert, message);
    if (message && !alert.isConnected) alerts.append(alert);
    else if (!message && alert.isConnected) alert.remove();
    const noun = options.itemLabel ?? "results";
    setText(count, loading ? "Loading…" : totalMatches > 20 ? `20 of ${totalMatches} ${noun}`
      : `${totalMatches} ${totalMatches === 1 ? noun.replace(/s$/, "") : noun}`);

    const visibleIds = new Set(filtered.map(item => item.id));
    for (const id of rows.keys()) { if (!visibleIds.has(id)) rows.delete(id); }
    if (!filtered.length) {
      setText(emptyState, loading ? "Loading…" : options.emptyLabel);
      if (list.firstChild !== emptyState) list.replaceChildren(emptyState);
      return;
    }
    const elements = filtered.map(item => {
      const entry = rows.get(item.id) ?? createRow(item);
      rows.set(item.id, entry);
      entry.item = item;
      const row = options.describe(item);
      setText(entry.title, row.title);
      setText(entry.subtitle, row.subtitle);
      setText(entry.actionLabel, row.actionLabel ?? "");
      entry.actionLabel.hidden = !row.actionLabel;
      if (entry.iconName !== row.icon) {
        entry.iconName = row.icon;
        entry.icon.replaceChildren(createIcon(row.icon, 18));
      }
      entry.button.disabled = loading || submitting || !!row.disabled;
      entry.button.title = `${row.title}\n${row.subtitle}`;
      entry.button.setAttribute("aria-label", row.actionLabel ? `${row.actionLabel}: ${row.title}` : row.title);
      if (entry.secondary && options.secondaryAction) {
        entry.secondary.disabled = loading || submitting;
        entry.secondary.title = options.secondaryAction.label;
        entry.secondary.setAttribute("aria-label", `${options.secondaryAction.label}: ${row.title}`);
      }
      return entry.li;
    });
    // Navigation and membership updates keep nodes, focus, and scroll intact.
    if (elements.length !== list.children.length || elements.some((li, index) => li !== list.children[index])) {
      list.replaceChildren(...elements);
    }
    updateSelection(scroll);
    options.onVisible?.(filtered);
  };
  const handleInput = () => { activeIndex = 0; filterDirty = true; render(true); };
  const handleKey = (event: KeyboardEvent) => {
    if (event.key === "Escape" && options.onEscape?.()) { event.preventDefault(); return; }
    if (loading || submitting) return;
    if (event.key === "Enter" && filtered[activeIndex]) {
      event.preventDefault();
      select(filtered[activeIndex], event);
    } else if (event.key === "ArrowDown" || (event.ctrlKey && event.key.toLowerCase() === "n")) {
      event.preventDefault();
      activeIndex = Math.min(activeIndex + 1, Math.max(0, filtered.length - 1));
      updateSelection(true);
    } else if (event.key === "ArrowUp" || (event.ctrlKey && event.key.toLowerCase() === "p")) {
      event.preventDefault();
      activeIndex = Math.max(activeIndex - 1, 0);
      updateSelection(true);
    }
  };
  input.addEventListener("input", handleInput);
  input.addEventListener("keydown", handleKey);
  render();
  return {
    root, input, scroller,
    get destroyed() { return destroyed; },
    get busy() { return loading || submitting; },
    setItems(next: T[]) { items = next; filterDirty = true; render(true); },
    setFilter(next: typeof filter) { filter = next; activeIndex = 0; filterDirty = true; render(true); },
    setLoading(next: boolean) { loading = next; render(); if (!next) focus(); },
    setError(error: unknown) { message = error instanceof Error ? error.message : String(error ?? ""); render(); },
    refresh: render,
    run,
    destroy() {
      destroyed = true;
      rows.clear();
      input.removeEventListener("input", handleInput);
      input.removeEventListener("keydown", handleKey);
      root.remove();
    },
  };
}
