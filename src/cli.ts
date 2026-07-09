#!/usr/bin/env node
import { Command } from "commander";
import { runInit } from "./commands/init.js";
import { runIndex } from "./commands/index-cmd.js";
import { runStatus } from "./commands/status.js";
import { runServe } from "./commands/serve.js";

const program = new Command();

program
  .name("productgraph")
  .description("Deterministic PRD-to-graph indexer and read-only MCP query server for product context");

program
  .command("init")
  .description("Initialize productgraph in a project directory (scaffolds prds/, goals/, metrics/, .productgraph/)")
  .argument("[path]", "target directory", ".")
  .action(async (path: string) => {
    await runInit(path);
  });

program
  .command("index")
  .description("Rebuild the graph from scratch by parsing all PRD, goal, and metric files")
  .argument("[path]", "project root", ".")
  .action(async (path: string) => {
    await runIndex(path);
  });

program
  .command("status")
  .description("Show graph node/edge counts, last index time, and warnings")
  .argument("[path]", "project root", ".")
  .action(async (path: string) => {
    await runStatus(path);
  });

program
  .command("serve")
  .description("Start the productgraph MCP server (read-only)")
  .option("--mcp", "run as an MCP server over stdio")
  .argument("[path]", "project root", ".")
  .action(async (path: string, options: { mcp?: boolean }) => {
    await runServe(path, options);
  });

program.parseAsync(process.argv).catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
