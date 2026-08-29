import { AgentState, AnomalyReport } from "../types.js";

/**
 * Flags failed API calls observed during the last action.
 */
export function checkApiUiInvariant(state: AgentState): AnomalyReport | null {
  const steps = state.steps || [];
  const lastStep = steps[steps.length - 1];

  if (!lastStep?.observation) return null;

  const networkCalls = lastStep.observation.networkCalls || [];
  const failed = networkCalls.filter(
    (call) => call.failed || (typeof call.status === "number" && call.status >= 400)
  );

  if (failed.length === 0) return null;

  // 5xx means the backend broke; 4xx is frequently expected (401 on a guest
  // route, 404 on a probe) so it is reported at a lower severity.
  const hasServerError = failed.some((c) => c.status >= 500);

  return {
    severity: hasServerError ? "HIGH" : "MEDIUM",
    category: "API_ERROR",
    action_id: lastStep.action?.action_id || "unknown",
    description: `${failed.length} API call(s) returned an error status: ${failed
      .map((c) => `${c.status} ${c.method} ${c.url}`)
      .slice(0, 5)
      .join("; ")}`,
    evidence: {
      failed_calls: failed.slice(0, 10),
      screenshot: lastStep.observation.screenshotPath
    }
  };
}
