import { AgentState, AnomalyReport } from "../types.js";
import { checkApiUiInvariant } from "../invariants/apiUiInvariant.js";
import { checkRouteInvariant } from "../invariants/routeInvariant.js";
import { checkConsoleErrors } from "../invariants/consoleErrorInvariant.js";

type Invariant = (state: AgentState) => AnomalyReport | null;

const CHECKS: Invariant[] = [
  checkApiUiInvariant,
  checkRouteInvariant,
  checkConsoleErrors
];

/**
 * Runs every invariant against the observation from the last action.
 *
 * Anomalies are recomputed each turn and always replace the previous set, so a
 * resolved issue does not linger and terminate a healthy run.
 */
export function anomalyDetector(state: AgentState): AgentState {
  const anomalies: AnomalyReport[] = [];

  for (const check of CHECKS) {
    try {
      const result = check(state);
      if (result) anomalies.push(result);
    } catch (error) {
      console.warn(
        "⚠️ Invariant check failed:",
        error instanceof Error ? error.message : String(error)
      );
    }
  }

  if (anomalies.length > 0) {
    console.log(
      `🚨 ${anomalies.length} anomaly(ies): ${anomalies
        .map((a) => `${a.severity}/${a.category}`)
        .join(", ")}`
    );
  }

  return { ...state, anomalies };
}
