import { AgentState, AnomalyReport } from "../types.js";

/**
 * Flags uncaught console errors produced by the last action.
 */
export function checkConsoleErrors(state: AgentState): AnomalyReport | null {
  const steps = state.steps || [];
  const lastStep = steps[steps.length - 1];

  if (!lastStep?.observation) return null;

  const consoleErrors = lastStep.observation.consoleErrors || [];

  if (consoleErrors.length === 0) return null;

  return {
    severity: "MEDIUM",
    category: "CONSOLE_ERROR",
    action_id: lastStep.action?.action_id || "unknown",
    description: `${consoleErrors.length} console error(s): ${consoleErrors
      .slice(0, 3)
      .join(" | ")}`,
    evidence: {
      console_errors: consoleErrors.slice(0, 10),
      screenshot: lastStep.observation.screenshotPath
    }
  };
}
