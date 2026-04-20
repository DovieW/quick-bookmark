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

export type TogglePlaylistVideoAction = "added" | "removed";

export interface TogglePlaylistVideoResult {
	action: TogglePlaylistVideoAction;
	playlist: YouTubePlaylist;
	membership: YouTubePlaylistMembership | null;
}

export interface YouTubePlaylistCache {
	version: 1;
	updatedAt: number;
	playlists: YouTubePlaylist[];
}
