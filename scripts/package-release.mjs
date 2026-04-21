import { spawnSync } from "child_process";
import { existsSync, readFileSync, readdirSync, rmSync } from "fs";
import { dirname, resolve } from "path";
import { fileURLToPath } from "url";

const currentDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(currentDir, "..");
const distDir = resolve(repoRoot, "dist");
const packageJsonPath = resolve(repoRoot, "package.json");

if (!existsSync(distDir)) {
  throw new Error("dist/ does not exist. Run `npm run build` first.");
}

const packageJson = JSON.parse(readFileSync(packageJsonPath, "utf8"));
const version = packageJson.version;
const outputName = `quick-bookmark-${version}.zip`;
const outputPath = resolve(repoRoot, outputName);
const archiveEntries = readdirSync(distDir).sort();

if (archiveEntries.length === 0) {
  throw new Error("dist/ is empty. Run `npm run build` first.");
}

if (existsSync(outputPath)) {
  rmSync(outputPath, { force: true });
}

const result = spawnSync("tar", ["-a", "-cf", outputPath, "-C", distDir, ...archiveEntries], {
  cwd: repoRoot,
  stdio: "inherit",
});

if (result.error) {
  if (result.error.code === "ENOENT") {
    throw new Error("`tar` is required to create the release zip, but it was not found on PATH.");
  }

  throw result.error;
}

if (result.status !== 0) {
  throw new Error(`tar exited with status ${result.status ?? "unknown"}`);
}

console.log(`Created ${outputName}`);
