import fs from "fs";
import path from "path";

/**
 * Root directory that screenshots are served from. Configurable so the server
 * does not depend on being started from a specific working directory.
 */
export const SCREENSHOT_ROOT = path.resolve(
  process.env.TESTPILOT_SCREENSHOT_DIR || path.join(process.cwd(), "..", "screenshots")
);

/**
 * Resolve a client-supplied screenshot name to an absolute path inside
 * SCREENSHOT_ROOT. Returns null if the name escapes the root or does not exist.
 *
 * Both the basename strip and the containment check are needed: basename alone
 * is easy to regress, and the prefix check alone would accept a symlinked path.
 */
export function resolveScreenshotPath(requested: string): string | null {
  if (!requested || typeof requested !== "string") return null;

  const filename = path.basename(requested);

  if (!filename || filename === "." || filename === "..") return null;

  const fullPath = path.resolve(SCREENSHOT_ROOT, filename);

  // Ensure the resolved path is still inside the screenshot root.
  const relative = path.relative(SCREENSHOT_ROOT, fullPath);
  if (relative.startsWith("..") || path.isAbsolute(relative)) return null;

  if (!fs.existsSync(fullPath) || !fs.statSync(fullPath).isFile()) return null;

  return fullPath;
}
