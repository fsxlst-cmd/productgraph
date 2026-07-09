import path from "node:path";
import { IndexError } from "./errors.js";
import { parseFrontmatter } from "./frontmatter.js";
import { featureFrontmatterSchema, goalFrontmatterSchema, metricFrontmatterSchema } from "./schema.js";
import type { LoadedFeatureVersion, LoadedGoal, LoadedMetric } from "./types.js";

/**
 * Parses a feature PRD file's already-read content. `filePath` is expected
 * to look like "prds/<feature-slug>/<file-base-name>.md" — the feature slug
 * and file base name are derived from it, not from the frontmatter, so they
 * can be cross-checked against what the frontmatter claims.
 */
export function parseFeatureVersion(filePath: string, raw: string): LoadedFeatureVersion {
  const { data } = parseFrontmatter(filePath, raw, featureFrontmatterSchema);
  const featureSlug = path.basename(path.dirname(filePath));
  const fileBaseName = path.basename(filePath, ".md");

  if (data.feature !== featureSlug) {
    throw new IndexError(
      filePath,
      `frontmatter "feature: ${data.feature}" does not match its directory "prds/${featureSlug}/"`,
    );
  }

  return { filePath, featureSlug, fileBaseName, frontmatter: data };
}

export function parseGoalRegistry(filePath: string, raw: string): LoadedGoal {
  const { data } = parseFrontmatter(filePath, raw, goalFrontmatterSchema);
  const slug = path.basename(filePath, ".md");

  if (data.goal !== slug) {
    throw new IndexError(
      filePath,
      `frontmatter "goal: ${data.goal}" does not match its filename "${slug}.md"`,
    );
  }

  return { filePath, slug, frontmatter: data };
}

export function parseMetricRegistry(filePath: string, raw: string): LoadedMetric {
  const { data } = parseFrontmatter(filePath, raw, metricFrontmatterSchema);
  const slug = path.basename(filePath, ".md");

  if (data.metric !== slug) {
    throw new IndexError(
      filePath,
      `frontmatter "metric: ${data.metric}" does not match its filename "${slug}.md"`,
    );
  }

  return { filePath, slug, frontmatter: data };
}
