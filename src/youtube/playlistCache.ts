import { listYouTubePlaylists } from "./api";
import type { YouTubePlaylist, YouTubePlaylistCache } from "./types";

const YOUTUBE_PLAYLIST_CACHE_KEY = "youtubePlaylistCache";
const YOUTUBE_LAST_PLAYLIST_KEY = "youtubeLastPlaylistId";
const YOUTUBE_PLAYLIST_CACHE_VERSION = 1 as const;
export const YOUTUBE_PLAYLIST_CACHE_TTL_MS = 1000 * 60 * 60;

function isYouTubePlaylist(value: unknown): value is YouTubePlaylist {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<YouTubePlaylist>;
	return (
		typeof candidate.id === "string" &&
		typeof candidate.title === "string" &&
		typeof candidate.itemCount === "number"
	);
}

function isYouTubePlaylistCache(value: unknown): value is YouTubePlaylistCache {
	if (!value || typeof value !== "object") {
		return false;
	}

	const candidate = value as Partial<YouTubePlaylistCache>;
	return (
		candidate.version === YOUTUBE_PLAYLIST_CACHE_VERSION &&
		typeof candidate.updatedAt === "number" &&
		Array.isArray(candidate.playlists) &&
		candidate.playlists.every(isYouTubePlaylist)
	);
}

async function readPlaylistCacheFrom(
	area?: chrome.storage.StorageArea,
): Promise<YouTubePlaylistCache | null> {
	if (!area) {
		return null;
	}

	const result = await area.get([YOUTUBE_PLAYLIST_CACHE_KEY]);
	const cache = result[YOUTUBE_PLAYLIST_CACHE_KEY];
	return isYouTubePlaylistCache(cache) ? cache : null;
}

function writePlaylistCacheTo(
	area: chrome.storage.StorageArea | undefined,
	cache: YouTubePlaylistCache,
): Promise<void> {
	if (!area) {
		return Promise.resolve();
	}

	return area.set({ [YOUTUBE_PLAYLIST_CACHE_KEY]: cache });
}

export async function readYouTubePlaylistCache(): Promise<YouTubePlaylistCache | null> {
	const sessionCache = await readPlaylistCacheFrom(chrome.storage.session);
	if (sessionCache) {
		return sessionCache;
	}

	const localCache = await readPlaylistCacheFrom(chrome.storage.local);
	if (localCache) {
		void writePlaylistCacheTo(chrome.storage.session, localCache);
		return localCache;
	}

	return null;
}

export async function readCachedYouTubePlaylists(): Promise<YouTubePlaylist[] | null> {
	const cache = await readYouTubePlaylistCache();
	return cache?.playlists ?? null;
}

export async function refreshYouTubePlaylistCache(options?: {
	interactive?: boolean;
}): Promise<YouTubePlaylistCache> {
	const playlists = await listYouTubePlaylists(options);
	const cache: YouTubePlaylistCache = {
		version: YOUTUBE_PLAYLIST_CACHE_VERSION,
		updatedAt: Date.now(),
		playlists,
	};

	await Promise.all([
		writePlaylistCacheTo(chrome.storage.session, cache),
		writePlaylistCacheTo(chrome.storage.local, cache),
	]);

	return cache;
}

export async function adjustCachedYouTubePlaylistItemCount(
	playlistId: string,
	delta: number,
): Promise<void> {
	const cache = await readYouTubePlaylistCache();

	if (!cache) {
		return;
	}

	const nextCache: YouTubePlaylistCache = {
		...cache,
		updatedAt: Date.now(),
		playlists: cache.playlists.map((playlist) =>
			playlist.id === playlistId
				? {
					...playlist,
					itemCount: Math.max(0, playlist.itemCount + delta),
				}
				: playlist,
		),
	};

	await Promise.all([
		writePlaylistCacheTo(chrome.storage.session, nextCache),
		writePlaylistCacheTo(chrome.storage.local, nextCache),
	]);
}

export async function ensureYouTubePlaylistCache(options?: {
	interactive?: boolean;
	maxAgeMs?: number;
}): Promise<YouTubePlaylistCache> {
	const maxAgeMs = options?.maxAgeMs ?? YOUTUBE_PLAYLIST_CACHE_TTL_MS;
	const cache = await readYouTubePlaylistCache();

	if (cache && Date.now() - cache.updatedAt < maxAgeMs) {
		return cache;
	}

	return refreshYouTubePlaylistCache({ interactive: options?.interactive });
}

export async function readLastUsedYouTubePlaylistId(): Promise<string | null> {
	const result = await chrome.storage.local.get([YOUTUBE_LAST_PLAYLIST_KEY]);
	const playlistId = result[YOUTUBE_LAST_PLAYLIST_KEY];
	return typeof playlistId === "string" && playlistId.length > 0
		? playlistId
		: null;
}

export async function writeLastUsedYouTubePlaylistId(
	playlistId: string,
): Promise<void> {
	await chrome.storage.local.set({ [YOUTUBE_LAST_PLAYLIST_KEY]: playlistId });
}
