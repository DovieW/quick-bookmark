export interface YouTubePlaylist {
	id: string;
	title: string;
	itemCount: number;
	description?: string;
	thumbnailUrl?: string;
}

export interface YouTubePlaylistMembership {
	playlistId: string;
	playlistItemId: string;
	videoId: string;
}

export type PlaylistVideoAction = "add" | "remove";

export interface PlaylistVideoResult {
	action: "added" | "removed" | "unchanged";
	playlist: YouTubePlaylist;
	membership: YouTubePlaylistMembership | null;
}

export interface YouTubePlaylistCache {
	version: 1;
	updatedAt: number;
	playlists: YouTubePlaylist[];
}
