import { describe, it, expect } from "vitest";
import { validateUrl } from "../runtime-discovery/src/urlValidator.js";

describe("validateUrl", () => {
  it("accepts http and https targets", () => {
    expect(validateUrl("https://example.com")).toBe("https://example.com/");
    expect(validateUrl("http://localhost:3000")).toBe("http://localhost:3000/");
  });

  it("rejects non-http protocols", () => {
    expect(() => validateUrl("file:///etc/passwd")).toThrow();
    expect(() => validateUrl("javascript:alert(1)")).toThrow();
  });

  it("blocks cloud metadata endpoints", () => {
    expect(() => validateUrl("http://169.254.169.254/latest/meta-data")).toThrow();
    expect(() => validateUrl("http://metadata.google.internal/")).toThrow();
  });

  it("blocks sensitive ports", () => {
    expect(() => validateUrl("http://example.com:22")).toThrow();
    expect(() => validateUrl("http://example.com:445")).toThrow();
  });

  it("rejects malformed input", () => {
    expect(() => validateUrl("not a url")).toThrow();
    expect(() => validateUrl("")).toThrow();
  });
});
