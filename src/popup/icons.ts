type IconName =
  | "bookmark-add"
  | "search"
  | "folder"
  | "folder-open"
  | "bookmark"
  | "copy"
  | "language"
  | "more-vertical";

const SVG_NAMESPACE = "http://www.w3.org/2000/svg";

const iconMarkup: Record<IconName, string> = {
  "bookmark-add": `
    <path d="M7 4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75V21l-5-3-5 3V4.75Z" />
    <path d="M12 7.5v5" />
    <path d="M9.5 10h5" />
  `,
  search: `
    <circle cx="11" cy="11" r="6" />
    <path d="m20 20-4.2-4.2" />
  `,
  folder: `
    <path d="M3.75 6.75A1.75 1.75 0 0 1 5.5 5h4.24a2 2 0 0 1 1.41.59l1.01 1.01a2 2 0 0 0 1.41.59h4.93a1.75 1.75 0 0 1 1.75 1.75v7.56a1.75 1.75 0 0 1-1.75 1.75H5.5a1.75 1.75 0 0 1-1.75-1.75V6.75Z" />
  `,
  "folder-open": `
    <path d="M3.75 7A1.75 1.75 0 0 1 5.5 5.25h4.08a2 2 0 0 1 1.42.59l.98.98a2 2 0 0 0 1.42.59h5.1A1.5 1.5 0 0 1 20 8.9l-1.55 7.6A1.75 1.75 0 0 1 16.74 18H6.26a1.75 1.75 0 0 1-1.71-1.38L3.1 9.02A1.75 1.75 0 0 1 4.82 7H3.75Z" />
  `,
  bookmark: `
    <path d="M7 4.75A1.75 1.75 0 0 1 8.75 3h6.5A1.75 1.75 0 0 1 17 4.75V21l-5-3-5 3V4.75Z" />
  `,
  copy: `
    <rect x="9" y="9" width="10" height="10" rx="2" />
    <path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" />
  `,
  language: `
    <path d="M4 5h8" />
    <path d="M8 5c0 5.2-1.7 9.15-4 11" />
    <path d="M12 19c-2.3-1.85-4-5.8-4-11" />
    <path d="M14 15h6" />
    <path d="m15.5 12 3.5 8" />
    <path d="m22.5 20-3.5-8" />
  `,
  "more-vertical": `
    <circle cx="12" cy="5" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none" />
    <circle cx="12" cy="19" r="1.5" fill="currentColor" stroke="none" />
  `,
};

export function createIcon(name: IconName, size = 20): SVGSVGElement {
  const svg = document.createElementNS(SVG_NAMESPACE, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("width", String(size));
  svg.setAttribute("height", String(size));
  svg.setAttribute("fill", "none");
  svg.setAttribute("stroke", "currentColor");
  svg.setAttribute("stroke-width", "1.8");
  svg.setAttribute("stroke-linecap", "round");
  svg.setAttribute("stroke-linejoin", "round");
  svg.setAttribute("aria-hidden", "true");
  svg.innerHTML = iconMarkup[name];
  return svg;
}
