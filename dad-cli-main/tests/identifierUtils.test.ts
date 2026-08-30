import { describe, it, expect } from "vitest";
import { normalizeIdentifier } from "../runtime-discovery/src/identifierUtils.js";

describe("normalizeIdentifier", () => {
  it("maps anchor tags to the link prefix used during discovery", () => {
    expect(normalizeIdentifier("a", "Get Started")).toBe("link_get_started");
  });

  it("strips state text so a toggle keeps one stable id", () => {
    // Without this the agent loops forever: every click renames the element.
    const dark = normalizeIdentifier("button", "Switch theme (currently dark mode)");
    const light = normalizeIdentifier("button", "Switch theme (currently light mode)");
    expect(dark).toBe(light);
  });

  it("strips counters so a badge does not create a new state each update", () => {
    expect(normalizeIdentifier("button", "Cart (3)")).toBe(
      normalizeIdentifier("button", "Cart (12)")
    );
  });

  it("falls back for unlabelled elements", () => {
    expect(normalizeIdentifier("button", "")).toBe("button_unknown");
  });
});
