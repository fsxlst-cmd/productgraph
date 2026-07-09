import { existsSync, mkdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import path from "node:path";
import { GraphAccess } from "../db/access.js";
import { openWritableDb } from "../db/schema.js";
import { IndexError } from "../parse/errors.js";
import { parseFeatureVersion, parseGoalRegistry, parseMetricRegistry } from "../parse/entities.js";
import type { LoadedFeatureVersion, LoadedGoal, LoadedMetric } from "../parse/types.js";
import {
  validateFeatureReferences,
  validateGoalReferences,
  validateMetricReferences,
  validateSupersedes,
} from "../parse/validation.js";
import { buildGraph } from "./build-graph.js";
import { discoverFeatureFiles, discoverRegistryFiles } from "./discover.js";
import { IndexValidationError } from "./errors.js";

export interface IndexResult {
  counts: { nodes: Record<string, number>; edges: Record<string, number> };
  indexedAt: string;
}

export interface LastIndexSidecar {
  indexedAt: string;
  warnings: string[];
}

function dbPaths(root: string) {
  const dir = path.join(root, ".productgraph");
  return {
    dir,
    db: path.join(dir, "productgraph.db"),
    tmp: path.join(dir, "productgraph.db.tmp"),
    sidecar: path.join(dir, "last-index.json"),
  };
}

function groupVersionsByFeature(versions: LoadedFeatureVersion[]): Map<string, LoadedFeatureVersion[]> {
  const groups = new Map<string, LoadedFeatureVersion[]>();
  for (const version of versions) {
    const list = groups.get(version.featureSlug) ?? [];
    list.push(version);
    groups.set(version.featureSlug, list);
  }
  for (const list of groups.values()) {
    // Stable sort; versions sharing a date fall back to discoverFeatureFiles'
    // alphabetical file order, which is itself deterministic.
    list.sort((a, b) => a.frontmatter.date.localeCompare(b.frontmatter.date));
  }
  return groups;
}

interface ParsedSources {
  goals: LoadedGoal[];
  metrics: LoadedMetric[];
  versionsByFeature: Map<string, LoadedFeatureVersion[]>;
}

function parseAllSources(root: string): ParsedSources {
  const goals = discoverRegistryFiles(root, "goals").map((relPath) =>
    parseGoalRegistry(relPath, readFileSync(path.join(root, relPath), "utf-8")),
  );
  const metrics = discoverRegistryFiles(root, "metrics").map((relPath) =>
    parseMetricRegistry(relPath, readFileSync(path.join(root, relPath), "utf-8")),
  );
  const versions = discoverFeatureFiles(root).map((relPath) =>
    parseFeatureVersion(relPath, readFileSync(path.join(root, relPath), "utf-8")),
  );
  return { goals, metrics, versionsByFeature: groupVersionsByFeature(versions) };
}

function validateAllReferences(sources: ParsedSources): IndexError[] {
  const knownGoalSlugs = new Set(sources.goals.map((g) => g.slug));
  const knownMetricSlugs = new Set(sources.metrics.map((m) => m.slug));
  const knownFeatureSlugs = new Set(sources.versionsByFeature.keys());

  const errors: IndexError[] = [];
  for (const versions of sources.versionsByFeature.values()) {
    for (const version of versions) {
      errors.push(...validateGoalReferences(version, knownGoalSlugs));
      errors.push(...validateMetricReferences(version, knownMetricSlugs));
      errors.push(...validateFeatureReferences(version, "related_features", knownFeatureSlugs));
      errors.push(...validateFeatureReferences(version, "depends_on", knownFeatureSlugs));

      const siblings = new Map(versions.map((v) => [v.fileBaseName, v] as const));
      errors.push(...validateSupersedes(version, siblings));
    }
  }
  return errors;
}

/**
 * Full rebuild: parses every source file under prds/, goals/, and metrics/,
 * validates referential integrity across the whole set, and only then
 * atomically replaces the committed productgraph.db. Nothing is written to
 * the committed db if any validation error is found.
 */
export function runFullIndex(root: string, now: () => Date = () => new Date()): IndexResult {
  const paths = dbPaths(root);
  mkdirSync(paths.dir, { recursive: true });

  const sources = parseAllSources(root);
  const errors = validateAllReferences(sources);
  if (errors.length > 0) {
    throw new IndexValidationError(errors);
  }

  if (existsSync(paths.tmp)) rmSync(paths.tmp);

  const db = openWritableDb(paths.tmp);
  let counts: IndexResult["counts"];
  try {
    const access = new GraphAccess(db);
    db.transaction(() => {
      buildGraph(access, sources);
    })();
    counts = access.countsByType();
  } catch (err) {
    db.close();
    rmSync(paths.tmp, { force: true });
    throw err;
  }
  db.close();

  renameSync(paths.tmp, paths.db);

  const indexedAt = now().toISOString();
  const sidecar: LastIndexSidecar = { indexedAt, warnings: [] };
  writeFileSync(paths.sidecar, JSON.stringify(sidecar, null, 2));

  return { counts, indexedAt };
}

export function readLastIndexSidecar(root: string): LastIndexSidecar | undefined {
  const { sidecar } = dbPaths(root);
  if (!existsSync(sidecar)) return undefined;
  return JSON.parse(readFileSync(sidecar, "utf-8"));
}

export function productgraphDbPath(root: string): string {
  return dbPaths(root).db;
}
