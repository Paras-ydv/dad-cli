import { AgentState } from "../types.js";

/**
 * Halts the run when a critical anomaly is present.
 *
 * The termination signal is written to the top level of the state as well as to
 * `decision`, because the run loop reads `state.control` / `state.next_action`.
 * Writing only `decision.control` left the previously chosen action in place and
 * the agent kept exploring through critical failures.
 */
export function controlRouter(state: AgentState): AgentState {
  const anomalies = state.anomalies ?? [];

  const critical = anomalies.filter((a: any) => a.severity === "HIGH");

  if (critical.length === 0) {
    return state;
  }

  const reasoning = `Terminating: ${critical.length} critical anomaly(ies) detected - ${critical
    .map((a: any) => a.category || a.type || "unknown")
    .join(", ")}.`;

  console.log(`🛑 ${reasoning}`);

  return {
    ...state,
    decision: {
      ...(state.decision ?? {}),
      next_action: null,
      control: "TERMINATE",
      reasoning
    },
    next_action: null,
    reasoning,
    control: "TERMINATE"
  };
}
