import { z } from "zod";

/** Zero-padded ISO dates sort lexicographically in chronological order. */
export const dateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "date must be in YYYY-MM-DD format");

export const metricRefSchema = z.object({
  metric: z.string().min(1),
  target: z.union([z.string(), z.number()]).optional(),
  baseline: z.union([z.string(), z.number()]).optional(),
});

export const featureFrontmatterSchema = z.object({
  feature: z.string().min(1),
  title: z.string().min(1),
  date: dateSchema,
  status: z.enum(["draft", "active", "deprecated"]),
  goals: z.array(z.string()).default([]),
  metrics: z.array(metricRefSchema).default([]),
  related_features: z.array(z.string()).default([]),
  depends_on: z.array(z.string()).default([]),
  supersedes: z.string().optional(),
});

export const goalFrontmatterSchema = z.object({
  goal: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
});

export const metricFrontmatterSchema = z.object({
  metric: z.string().min(1),
  title: z.string().min(1),
  description: z.string().optional(),
  unit: z.string().optional(),
});

export type MetricRef = z.infer<typeof metricRefSchema>;
export type FeatureFrontmatter = z.infer<typeof featureFrontmatterSchema>;
export type GoalFrontmatter = z.infer<typeof goalFrontmatterSchema>;
export type MetricFrontmatter = z.infer<typeof metricFrontmatterSchema>;
