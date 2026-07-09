import { describe, expect, it } from "vitest";
import { z } from "zod";
import { IndexError } from "./errors.js";
import { parseFrontmatter } from "./frontmatter.js";

const schema = z.object({ name: z.string().min(1) });

describe("parseFrontmatter", () => {
  it("parses valid frontmatter and returns the body separately", () => {
    const raw = "---\nname: hello\n---\n\nSome body text.\n";
    const { data, body } = parseFrontmatter("test.md", raw, schema);
    expect(data).toEqual({ name: "hello" });
    expect(body.trim()).toBe("Some body text.");
  });

  it("throws an IndexError naming the file when frontmatter fails validation", () => {
    const raw = "---\nname: \"\"\n---\n";
    expect(() => parseFrontmatter("bad.md", raw, schema)).toThrowError(IndexError);
    try {
      parseFrontmatter("bad.md", raw, schema);
    } catch (err) {
      expect((err as IndexError).file).toBe("bad.md");
      expect((err as Error).message).toContain("bad.md");
    }
  });
});
