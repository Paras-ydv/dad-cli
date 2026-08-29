import { describe, it, expect, beforeAll, afterAll } from "vitest";
import fs from "fs";
import os from "os";
import path from "path";

const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "testpilot-"));
const shotDir = path.join(tmpRoot, "screenshots");

beforeAll(() => {
  fs.mkdirSync(shotDir, { recursive: true });
  fs.writeFileSync(path.join(shotDir, "state_abc.png"), "png");
  fs.writeFileSync(path.join(tmpRoot, "secret.txt"), "top secret");
  process.env.TESTPILOT_SCREENSHOT_DIR = shotDir;
});

afterAll(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe("resolveScreenshotPath", () => {
  it("resolves a real screenshot", async () => {
    const { resolveScreenshotPath } = await import(
      "../azure-integration/src/utils/screenshots.js"
    );
    expect(resolveScreenshotPath("state_abc.png")).toBe(
      path.join(shotDir, "state_abc.png")
    );
  });

  it("accepts a path-prefixed name by taking the basename", async () => {
    const { resolveScreenshotPath } = await import(
      "../azure-integration/src/utils/screenshots.js"
    );
    expect(resolveScreenshotPath("screenshots/state_abc.png")).toBe(
      path.join(shotDir, "state_abc.png")
    );
  });

  it("refuses to escape the screenshot directory", async () => {
    // Regression: this route was public and passed the raw param to
    // path.resolve, so ../ sequences read arbitrary files off disk.
    const { resolveScreenshotPath } = await import(
      "../azure-integration/src/utils/screenshots.js"
    );
    expect(resolveScreenshotPath("../secret.txt")).toBeNull();
    expect(resolveScreenshotPath("../../../../etc/passwd")).toBeNull();
    expect(resolveScreenshotPath("/etc/passwd")).toBeNull();
  });

  it("rejects empty and non-string input", async () => {
    const { resolveScreenshotPath } = await import(
      "../azure-integration/src/utils/screenshots.js"
    );
    expect(resolveScreenshotPath("")).toBeNull();
    expect(resolveScreenshotPath("..")).toBeNull();
    expect(resolveScreenshotPath(undefined as any)).toBeNull();
  });

  it("returns null for a name that does not exist", async () => {
    const { resolveScreenshotPath } = await import(
      "../azure-integration/src/utils/screenshots.js"
    );
    expect(resolveScreenshotPath("nope.png")).toBeNull();
  });
});
