import { copyFileSync, readFileSync, writeFileSync, renameSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { unzipSync, zipSync } from "fflate";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const { version } = JSON.parse(readFileSync(resolve(root, "package.json"), "utf8"));
const folder = resolve(root, "release-files", version);
const packageName = `quick-bookmark-${version}.zip`;
const kitName = `quick-bookmark-${version}-publishing-kit.zip`;
const extension = readFileSync(resolve(root, packageName));
const archive = unzipSync(extension);
const manifest = JSON.parse(new TextDecoder().decode(archive["manifest.json"]));
assert.equal(manifest.version, version);
assert.equal(manifest.manifest_version, 3);
const id = createHash("sha256").update(Buffer.from(manifest.key, "base64"))
  .digest("hex").slice(0, 32).replace(/[0-9a-f]/g, c => String.fromCharCode(97 + parseInt(c, 16)));
assert.equal(id, "diadedbbnkkjdmldbnfiohjomifmghbi", "Package must keep the existing store ID");
assert.ok(manifest.oauth2?.client_id && !manifest.oauth2.client_id.startsWith("YOUR_"), "YouTube OAuth must be configured");
for (const name of Object.keys(archive)) {
  assert.ok(!name.includes("\\") && !name.split("/").includes(".."), "Portable archive paths are required");
  assert.ok(!/(^|\/)(\.env[^/]*|node_modules|tests|release-files)(\/|$)|\.(pem|key)$/i.test(name), "Development or private files must not be packaged");
  if (name.endsWith(".js")) assert.ok(!new TextDecoder().decode(archive[name]).includes("mock-screenshot-token"), "Screenshot fixtures must not ship in the extension");
}

const entries = {};
for (const name of ["PUBLISHING.md", "release-notes.md", "store-summary.txt", "store-description.txt",
  "whats-new.txt", "privacy-and-permissions.md", "reviewer-instructions.txt", "popup-preview.png",
  "promo-small.png", "icon128.png", "screenshots/01-save-folders.png", "screenshots/02-open-bookmarks.png",
  "screenshots/03-search-settings.png", "screenshots/04-youtube-playlists.png"]) {
  const bytes = readFileSync(resolve(folder, name));
  if (name.endsWith(".png")) {
    assert.equal(bytes.subarray(0, 8).toString("hex"), "89504e470d0a1a0a", `${name} must be PNG`);
    const dimensions = [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
    const expected = name.startsWith("screenshots/") ? [1280, 800]
      : name === "promo-small.png" ? [440, 280] : name === "icon128.png" ? [128, 128] : null;
    if (expected) assert.deepEqual(dimensions, expected, `${name} dimensions`);
  }
  entries[name] = new Uint8Array(bytes);
}
entries[packageName] = new Uint8Array(extension);
const hash = bytes => createHash("sha256").update(bytes).digest("hex");
entries["extension-SHA256SUM.txt"] = new TextEncoder().encode(`${hash(extension)}  ${packageName}\n`);
entries["PRIVACY.md"] = new Uint8Array(readFileSync(resolve(root, "PRIVACY.md")));
const kit = zipSync(entries, { level: 9 });
const temporary = resolve(root, `${kitName}.tmp`);
writeFileSync(temporary, kit);
renameSync(temporary, resolve(root, kitName));
copyFileSync(resolve(root, packageName), resolve(folder, packageName));
writeFileSync(resolve(root, "SHA256SUMS.txt"), `${hash(extension)}  ${packageName}\n${hash(kit)}  ${kitName}\n`);
console.log(`Validated ${version}, extension ID ${id}, and store image sizes.`);
console.log(`Created ${kitName} and SHA256SUMS.txt.`);
