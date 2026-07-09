import { existsSync } from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { cleanupTempProjectDir, makeTempProjectDir, writeFixtureFile } from "../index/test-helpers.js";
import { runIndex } from "./index-cmd.js";
import { runInit } from "./init.js";
import { runStatus } from "./status.js";

describe("CLI: init -> index -> status", () => {
  let root: string;

  afterEach(() => {
    if (root) cleanupTempProjectDir(root);
  });

  it("init scaffolds directories and does not create productgraph.db yet", async () => {
    root = makeTempProjectDir();

    const result = await runInit(root);

    expect(result.createdDirs.sort()).toEqual([".productgraph", "goals", "metrics", "prds"]);
    for (const dir of ["prds", "goals", "metrics", ".productgraph"]) {
      expect(existsSync(path.join(root, dir))).toBe(true);
    }
    expect(existsSync(path.join(root, ".productgraph", "productgraph.db"))).toBe(false);
  });

  it("index builds the db after PRDs are authored", async () => {
    root = makeTempProjectDir();
    await runInit(root);

    writeFixtureFile(
      root,
      "goals/reduce-churn.md",
      "---\ngoal: reduce-churn\ntitle: Reduce churn\n---\n",
    );
    writeFixtureFile(
      root,
      "prds/checkout-flow/2026-07-09-refactor.md",
      `---
feature: checkout-flow
title: Checkout Flow
date: "2026-07-09"
status: active
goals: [reduce-churn]
---
`,
    );

    const result = await runIndex(root);

    expect(result?.counts.nodes).toEqual({ Feature: 1, Goal: 1, PRDVersion: 1 });
    expect(existsSync(path.join(root, ".productgraph", "productgraph.db"))).toBe(true);
  });

  it("status reports counts and last index time after a successful index", async () => {
    root = makeTempProjectDir();
    await runInit(root);
    writeFixtureFile(
      root,
      "prds/checkout-flow/2026-07-09-refactor.md",
      `---
feature: checkout-flow
title: Checkout Flow
date: "2026-07-09"
status: active
---
`,
    );
    await runIndex(root);

    const status = await runStatus(root);

    expect(status?.counts.nodes).toEqual({ Feature: 1, PRDVersion: 1 });
    expect(status?.indexedAt).toBeDefined();
  });

  it("status reports failure when no db exists yet", async () => {
    root = makeTempProjectDir();
    await runInit(root);

    const status = await runStatus(root);

    expect(status).toBeUndefined();
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });

  it("index fails and leaves no db when a PRD has an unresolved reference", async () => {
    root = makeTempProjectDir();
    await runInit(root);
    writeFixtureFile(
      root,
      "prds/checkout-flow/2026-07-09-refactor.md",
      `---
feature: checkout-flow
title: Checkout Flow
date: "2026-07-09"
status: active
goals: [unknown-goal]
---
`,
    );

    const result = await runIndex(root);

    expect(result).toBeUndefined();
    expect(existsSync(path.join(root, ".productgraph", "productgraph.db"))).toBe(false);
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
  });
});
