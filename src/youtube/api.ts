import { getYouTubeAccessToken, invalidateYouTubeAccessToken } from "./auth";
import type {
  TogglePlaylistVideoResult,
  YouTubePlaylist,
  YouTubePlaylistMembership,
} from "./types";
import type { YouTubeVideoContext } from "./videoContext";

const YOUTUBE_API_BASE_URL = "https://www.googleapis.com/youtube/v3";

interface YouTubeApiErrorPayload {
  error?: {
    code?: number;
    message?: string;
  };
}

interface PlaylistListResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      title?: string;
      description?: string;
      thumbnails?: {
        default?: { url?: string };
        medium?: { url?: string };
        high?: { url?: string };
      };
    };
    contentDetails?: {
      itemCount?: number;
    };
  }>;
  nextPageToken?: string;
}

interface PlaylistItemsListResponse {
  items?: Array<{
    id?: string;
    snippet?: {
      playlistId?: string;
      resourceId?: {
        videoId?: string;
      };
    };
  }>;
  nextPageToken?: string;
}

interface PlaylistItemInsertResponse {
  id?: string;
}

function createYouTubeApiError(message: string): Error {
  return new Error(`YouTube API: ${message}`);
}

async function requestYouTubeApi<T>(
  path: string,
  init?: RequestInit,
  options?: { interactive?: boolean },
  allowRetry = true,
): Promise<T> {
  const token = await getYouTubeAccessToken({ interactive: options?.interactive });
  const response = await fetch(`${YOUTUBE_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...init?.headers,
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      await invalidateYouTubeAccessToken(token);

      if (allowRetry) {
        return requestYouTubeApi(path, init, options, false);
      }
    }

    const payload = (await response.json().catch(() => null)) as
      | YouTubeApiErrorPayload
      | null;
    throw createYouTubeApiError(
      payload?.error?.message ?? `request failed with status ${response.status}`,
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}

export async function listYouTubePlaylists(options?: {
  interactive?: boolean;
}): Promise<YouTubePlaylist[]> {
  const playlists: YouTubePlaylist[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      maxResults: "50",
      mine: "true",
      part: "snippet,contentDetails",
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await requestYouTubeApi<PlaylistListResponse>(
      `/playlists?${params.toString()}`,
      undefined,
      options,
    );

    response.items?.forEach((item) => {
      if (!item.id || !item.snippet?.title) {
        return;
      }

      playlists.push({
        id: item.id,
        title: item.snippet.title,
        description: item.snippet.description,
        itemCount: item.contentDetails?.itemCount ?? 0,
        thumbnailUrl:
          item.snippet.thumbnails?.medium?.url ??
          item.snippet.thumbnails?.default?.url ??
          item.snippet.thumbnails?.high?.url,
      });
    });

    pageToken = response.nextPageToken;
  } while (pageToken);

  return playlists;
}

export async function getPlaylistMembership(
  playlistId: string,
  videoId: string,
  options?: { interactive?: boolean },
): Promise<YouTubePlaylistMembership | null> {
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      maxResults: "50",
      part: "snippet",
      playlistId,
    });

    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const response = await requestYouTubeApi<PlaylistItemsListResponse>(
      `/playlistItems?${params.toString()}`,
      undefined,
      options,
    );

    const membership = response.items?.find(
      (item) => item.snippet?.resourceId?.videoId === videoId && item.id,
    );

    if (membership?.id) {
      return {
        playlistId,
        playlistItemId: membership.id,
        videoId,
      };
    }

    pageToken = response.nextPageToken;
  } while (pageToken);

  return null;
}

export async function toggleVideoInPlaylist(
  playlist: YouTubePlaylist,
  video: YouTubeVideoContext,
  options?: { interactive?: boolean },
): Promise<TogglePlaylistVideoResult> {
  const membership = await getPlaylistMembership(playlist.id, video.videoId, options);

  if (membership) {
    const deleteParams = new URLSearchParams({ id: membership.playlistItemId });
    await requestYouTubeApi<void>(
      `/playlistItems?${deleteParams.toString()}`,
      { method: "DELETE" },
      options,
    );

    return {
      action: "removed",
      playlist,
      membership,
    };
  }

  const createdPlaylistItem = await requestYouTubeApi<PlaylistItemInsertResponse>(
    "/playlistItems?part=snippet",
    {
      method: "POST",
      body: JSON.stringify({
        snippet: {
          playlistId: playlist.id,
          resourceId: {
            kind: "youtube#video",
            videoId: video.videoId,
          },
        },
      }),
    },
    options,
  );

  return {
    action: "added",
    playlist,
    membership: createdPlaylistItem.id
      ? {
          playlistId: playlist.id,
          playlistItemId: createdPlaylistItem.id,
          videoId: video.videoId,
        }
      : null,
  };
}
