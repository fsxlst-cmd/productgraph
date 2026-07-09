import type { FeatureFrontmatter, GoalFrontmatter, MetricFrontmatter } from "./schema.js";

export interface LoadedFeatureVersion {
  filePath: string;
  featureSlug: string;
  /** File name without the .md extension, e.g. "2026-07-09-refactor". */
  fileBaseName: string;
  frontmatter: FeatureFrontmatter;
}

export interface LoadedGoal {
  filePath: string;
  slug: string;
  frontmatter: GoalFrontmatter;
}

export interface LoadedMetric {
  filePath: string;
  slug: string;
  frontmatter: MetricFrontmatter;
}
