import { mountBookmarkOpen } from "./components/BookmarkOpen";
import { createIcon } from "./popup/icons";
import "./popup/popup.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Open popup root element was not found.");
}

const wrapper = document.createElement("div");
wrapper.className = "open-standalone";

const heading = document.createElement("div");
heading.className = "open-standalone__header";

const icon = document.createElement("div");
icon.className = "header-icon";
icon.append(createIcon("search", 20));

const copy = document.createElement("div");
copy.className = "header-copy";

const title = document.createElement("h1");
title.className = "header-title";
title.textContent = "Quick Open";

const subtitle = document.createElement("p");
subtitle.className = "header-subtitle";
subtitle.textContent = "Search and open bookmarks";

copy.append(title, subtitle);
heading.append(icon, copy);

const content = document.createElement("div");
content.className = "open-standalone__content";

wrapper.append(heading, content);
rootElement.replaceChildren(wrapper);

mountBookmarkOpen(content);
