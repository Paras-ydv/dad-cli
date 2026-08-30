import { AgentState, AnomalyReport } from "../types.js";

/**
 * Flags navigation that leaves the application under test.
 *
 * The previous implementation compared the current pathname against the full
 * target URL (`"https://example.com".includes("/docs")`), so every navigation
 * away from "/" was reported as a route anomaly. Comparing origins instead
 * detects what this check is actually for: the agent wandering off-site.
 */
export function checkRouteInvariant(state: AgentState): AnomalyReport | null {
  const currentRoute = state.ui_state?.route;
  const targetUrl = state.runtime?.url;

  if (!currentRoute || !targetUrl) return null;

  // An explicit error route means discovery failed on this page.
  if (currentRoute === "/error") {
    return {
      severity: "MEDIUM",
      category: "DISCOVERY_FAILED",
      action_id: state.steps?.[state.steps.length - 1]?.action?.action_id || "unknown",
      description: "UI discovery failed for the current page and returned the error route.",
      evidence: { route: currentRoute }
    };
  }

  const currentUrl = state.ui_state?.entities?.url;
  if (!currentUrl || typeof currentUrl !== "string") return null;

  try {
    const currentOrigin = new URL(currentUrl).origin;
    const targetOrigin = new URL(targetUrl).origin;

    if (currentOrigin !== targetOrigin) {
      return {
        severity: "LOW",
        category: "OFF_SITE_NAVIGATION",
        action_id: state.steps?.[state.steps.length - 1]?.action?.action_id || "unknown",
        description: `Navigated off the application under test: ${currentOrigin} (expected ${targetOrigin}).`,
        evidence: { current_url: currentUrl, target_url: targetUrl }
      };
    }
  } catch {
    return null;
  }

  return null;
}
