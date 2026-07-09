import { existsSync, readdirSync } from "node:fs";
import path from "node:path";

/** Finds all `prds/<feature-slug>/*.md` files, returned as root-relative paths, sorted for determinism. */
export function discoverFeatureFiles(root: string): string[] {
  const prdsRoot = path.join(root, "prds");
  if (!existsSync(prdsRoot)) return [];

  const results: string[] = [];
  for (const dirEntry of readdirSync(prdsRoot, { withFileTypes: true })) {
    if (!dirEntry.isDirectory()) continue;
    const featureDir = path.join(prdsRoot, dirEntry.name);
    for (const fileEntry of readdirSync(featureDir, { withFileTypes: true })) {
      if (fileEntry.isFile() && fileEntry.name.endsWith(".md")) {
        results.push(path.relative(root, path.join(featureDir, fileEntry.name)));
      }
    }
  }
  return results.sort();
}

/** Finds all `<dirName>/*.md` registry files, returned as root-relative paths, sorted for determinism. */
export function discoverRegistryFiles(root: string, dirName: "goals" | "metrics"): string[] {
  const dir = path.join(root, dirName);
  if (!existsSync(dir)) return [];

  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
    .map((entry) => path.relative(root, path.join(dir, entry.name)))
    .sort();
}
