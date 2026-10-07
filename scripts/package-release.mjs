import { existsSync, readFileSync, readdirSync, writeFileSync, renameSync, rmSync } from "node:fs";
import { dirname, resolve, join } from "node:path";
import { fileURLToPath } from "node:url";
import { zipSync } from "fflate";

export function packageRelease(distDir, outputPath, version) {
  if (!existsSync(distDir)) throw new Error("dist/ does not exist. Run `npm run build` first.");
  const entries = {};
  const collect = (directory, prefix = "") => {
    for (const entry of readdirSync(directory, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
      const name = `${prefix}${entry.name}`;
      const path = join(directory, entry.name);
      if (entry.isDirectory()) collect(path, `${name}/`);
      else if (entry.isFile()) entries[name] = new Uint8Array(readFileSync(path));
      else throw new Error(`Cannot package non-regular file: ${name}`);
    }
  };
  collect(distDir);
  if (!entries["manifest.json"]) throw new Error("dist/ is missing manifest.json.");
  const manifest = JSON.parse(new TextDecoder().decode(entries["manifest.json"]));
  if (manifest.version !== version) throw new Error("Package and manifest versions do not match.");
  for (const name of [manifest.action?.default_popup, manifest.background?.service_worker, manifest.options_ui?.page,
    ...Object.values(manifest.icons ?? {})].filter(Boolean)) {
    if (!entries[name]) throw new Error(`dist/ is missing manifest entry: ${name}`);
  }
  const temporaryPath = `${outputPath}.tmp`;
  try {
    writeFileSync(temporaryPath, zipSync(entries, { level: 9 }));
    renameSync(temporaryPath, outputPath);
  } finally { rmSync(temporaryPath, { force: true }); }
  return Object.keys(entries);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
  const { version } = JSON.parse(readFileSync(resolve(repoRoot, "package.json"), "utf8"));
  const name = `quick-bookmark-${version}.zip`;
  packageRelease(resolve(repoRoot, "dist"), resolve(repoRoot, name), version);
  console.log(`Created ${name}`);
}
