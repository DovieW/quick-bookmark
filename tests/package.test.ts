import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, mkdirSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { unzipSync } from "fflate";
// The release script is an ES module, used directly to exercise the archive writer.
// @ts-expect-error JavaScript build utility has no declaration file.
import { packageRelease } from "../scripts/package-release.mjs";

test("release archive is a real ZIP with root manifest and portable nested paths", t => {
  const root = mkdtempSync(join(tmpdir(), "quick-bookmark-zip-"));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const dist = join(root, "dist");
  mkdirSync(join(dist, "assets"), { recursive: true });
  const manifest = { version: "3.0.1", action: { default_popup: "popup.html" },
    options_ui: { page: "options.html" }, background: { service_worker: "background.js" } };
  writeFileSync(join(dist, "manifest.json"), JSON.stringify(manifest));
  for (const name of ["popup.html", "options.html", "background.js", "assets/popup.css"]) writeFileSync(join(dist, name), name);
  const output = join(root, "release.zip");
  packageRelease(dist, output, "3.0.1");
  const archive = readFileSync(output);
  assert.equal(archive.subarray(0, 2).toString(), "PK");
  const files = unzipSync(archive);
  assert.deepEqual(Object.keys(files).sort(), ["assets/popup.css", "background.js", "manifest.json", "options.html", "popup.html"]);
  assert.equal(new TextDecoder().decode(files["assets/popup.css"]), "assets/popup.css");
  // Replacing an existing artifact is supported on every OS.
  packageRelease(dist, output, "3.0.1");
  assert.equal(Object.keys(unzipSync(readFileSync(output))).length, 5);
  assert.throws(() => packageRelease(dist, output, "3.0.2"), /versions do not match/);
  rmSync(join(dist, "options.html"));
  assert.throws(() => packageRelease(dist, output, "3.0.1"), /missing manifest entry: options.html/);
});
