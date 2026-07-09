import matter from "gray-matter";
import { ZodError, type ZodType } from "zod";
import { IndexError } from "./errors.js";

export interface ParsedFrontmatter<T> {
  data: T;
  body: string;
}

/** Parses raw markdown-with-frontmatter content and validates it against a schema. */
export function parseFrontmatter<T>(filePath: string, raw: string, schema: ZodType<T>): ParsedFrontmatter<T> {
  const parsed = matter(raw);
  try {
    const data = schema.parse(parsed.data);
    return { data, body: parsed.content };
  } catch (err) {
    if (err instanceof ZodError) {
      const issues = err.issues
        .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
        .join("; ");
      throw new IndexError(filePath, `invalid frontmatter — ${issues}`);
    }
    throw err;
  }
}
