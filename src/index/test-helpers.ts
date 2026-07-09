import { cpSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

/** Creates a fresh temp directory for a single test; caller must clean it up. */
export function makeTempProjectDir(): string {
  return mkdtempSync(path.join(tmpdir(), "productgraph-test-"));
}

/**
 * Copies the shared `test/fixtures/sample-product` PRDs into a fresh temp
 * directory, so indexing it never mutates the checked-in fixture.
 */
export function copySampleProductFixture(): string {
  const root = makeTempProjectDir();
  const fixtureSource = path.join(process.cwd(), "test", "fixtures", "sample-product");
  cpSync(fixtureSource, root, { recursive: true });
  return root;
}

export function cleanupTempProjectDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export function writeFixtureFile(root: string, relPath: string, content: string): void {
  const fullPath = path.join(root, relPath);
  mkdirSync(path.dirname(fullPath), { recursive: true });
  writeFileSync(fullPath, content);
}
