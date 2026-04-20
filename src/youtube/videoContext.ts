export type YouTubePageKind = "watch" | "shorts";

export interface YouTubeVideoContext {
  pageKind: YouTubePageKind;
  videoId: string;
  url: string;
  canonicalUrl: string;
  title?: string;
  tabId?: number;
}

const VIDEO_ID_PATTERN = /^[A-Za-z0-9_-]{11}$/;
const YOUTUBE_HOSTS = new Set([
  "youtube.com",
  "m.youtube.com",
  "music.youtube.com",
  "youtu.be",
]);

function isYouTubeHost(hostname: string): boolean {
  const normalizedHost = hostname.toLowerCase();
  return (
    YOUTUBE_HOSTS.has(normalizedHost) ||
    normalizedHost === "www.youtube.com" ||
    normalizedHost.endsWith(".youtube.com")
  );
}

function normalizeVideoId(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  const trimmedValue = value.trim();
  return VIDEO_ID_PATTERN.test(trimmedValue) ? trimmedValue : null;
}

export function parseYouTubeVideoContext(
  urlValue: string | null | undefined,
  options?: { title?: string; tabId?: number },
): YouTubeVideoContext | null {
  if (!urlValue) {
    return null;
  }

  let url: URL;
  try {
    url = new URL(urlValue);
  } catch {
    return null;
  }

  if (!isYouTubeHost(url.hostname)) {
    return null;
  }

  const normalizedHost = url.hostname.toLowerCase();
  let videoId: string | null = null;
  let pageKind: YouTubePageKind | null = null;

  if (normalizedHost === "youtu.be") {
    videoId = normalizeVideoId(url.pathname.split("/").filter(Boolean)[0]);
    pageKind = videoId ? "watch" : null;
  } else if (url.pathname === "/watch") {
    videoId = normalizeVideoId(url.searchParams.get("v"));
    pageKind = videoId ? "watch" : null;
  } else if (url.pathname.startsWith("/shorts/")) {
    videoId = normalizeVideoId(url.pathname.split("/")[2]);
    pageKind = videoId ? "shorts" : null;
  }

  if (!videoId || !pageKind) {
    return null;
  }

  return {
    pageKind,
    videoId,
    url: url.toString(),
    canonicalUrl: `https://www.youtube.com/watch?v=${videoId}`,
    title: options?.title,
    tabId: options?.tabId,
  };
}
