import { afterEach, describe, expect, it } from "vitest";
import { discoverFeatureFiles, discoverRegistryFiles } from "./discover.js";
import { cleanupTempProjectDir, makeTempProjectDir, writeFixtureFile } from "./test-helpers.js";

describe("discoverFeatureFiles / discoverRegistryFiles", () => {
  let root: string;

  afterEach(() => {
    if (root) cleanupTempProjectDir(root);
  });

  it("returns an empty array when prds/ does not exist", () => {
    root = makeTempProjectDir();
    expect(discoverFeatureFiles(root)).toEqual([]);
  });

  it("finds all markdown files under prds/<feature>/, sorted, as root-relative paths", () => {
    root = makeTempProjectDir();
    writeFixtureFile(root, "prds/checkout-flow/2026-07-09-refactor.md", "---\n---\n");
    writeFixtureFile(root, "prds/checkout-flow/2026-03-01-initial.md", "---\n---\n");
    writeFixtureFile(root, "prds/paypal-support/2026-01-01-initial.md", "---\n---\n");
    writeFixtureFile(root, "prds/checkout-flow/notes.txt", "ignored, not markdown");

    const files = discoverFeatureFiles(root);
    expect(files).toEqual([
      "prds/checkout-flow/2026-03-01-initial.md",
      "prds/checkout-flow/2026-07-09-refactor.md",
      "prds/paypal-support/2026-01-01-initial.md",
    ]);
  });

  it("finds registry files under goals/ or metrics/, sorted", () => {
    root = makeTempProjectDir();
    writeFixtureFile(root, "goals/reduce-churn.md", "---\n---\n");
    writeFixtureFile(root, "goals/grow-revenue.md", "---\n---\n");

    expect(discoverRegistryFiles(root, "goals")).toEqual(["goals/grow-revenue.md", "goals/reduce-churn.md"]);
    expect(discoverRegistryFiles(root, "metrics")).toEqual([]);
  });
});
