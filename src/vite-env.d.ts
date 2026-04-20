/* eslint-disable @typescript-eslint/no-unused-vars */
/// <reference types="vite/client" />

declare global {
	interface ImportMetaEnv {
		readonly VITE_YOUTUBE_CLIENT_ID?: string;
		readonly VITE_EXTENSION_KEY?: string;
	}

	interface ImportMeta {
		readonly env: ImportMetaEnv;
	}
}

export {};
