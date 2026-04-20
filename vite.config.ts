import { readFileSync, writeFileSync } from "fs";
import { defineConfig, loadEnv, type Plugin } from "vite";
import { resolve } from "path";

function buildManifestPlugin(env: Record<string, string>): Plugin {
  const youtubeClientId = env.VITE_YOUTUBE_CLIENT_ID?.trim();
  const extensionKey = env.VITE_EXTENSION_KEY?.trim();

  return {
    name: "quick-bookmark-manifest-config",
    apply: "build",
    closeBundle() {
      const manifestPath = resolve(__dirname, "dist/manifest.json");
      const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as {
        background?: {
          service_worker?: string;
          type?: string;
        };
        oauth2?: {
          client_id: string;
          scopes: string[];
        };
        key?: string;
      };

      if (manifest.background?.service_worker) {
        manifest.background.type = "module";
      }

      if (youtubeClientId && !youtubeClientId.startsWith("YOUR_")) {
        manifest.oauth2 = {
          client_id: youtubeClientId,
          scopes: ["https://www.googleapis.com/auth/youtube"],
        };
      } else {
        delete manifest.oauth2;
      }

      if (extensionKey && !extensionKey.startsWith("YOUR_")) {
        manifest.key = extensionKey;
      } else {
        delete manifest.key;
      }

      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    },
  };
}

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, __dirname, "");

  return {
    plugins: [buildManifestPlugin(env)],
    build: {
      rollupOptions: {
        input: {
          popup: resolve(__dirname, "popup.html"), // The original Quick Bookmark popup
          background: resolve(__dirname, "src/background.ts"),
        },
        output: {
          entryFileNames: "[name].js",
          chunkFileNames: "[name].js",
        },
      },
      outDir: "dist",
      emptyOutDir: true,
    },
  };
});
