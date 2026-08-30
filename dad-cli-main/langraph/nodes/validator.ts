import { AgentState } from "../types.js";

/**
 * Judges whether the previous action left the app in a healthy state.
 *
 * "Healthy" currently means no invariant fired for that observation. The result
 * feeds the learner node, which uses it to reinforce or penalise the knowledge
 * item that produced the action.
 */
export async function validatorNode(state: AgentState) {
  const anomalies = state.anomalies ?? [];
  const lastStep = state.steps?.[state.steps.length - 1];

  // Nothing has been executed yet - nothing to validate.
  if (!lastStep) {
    return { ...state, validation: { success: true, timestamp: Date.now(), skipped: true } };
  }

  const success = anomalies.length === 0 && lastStep.observation?.skipped !== true;

  console.log(
    success
      ? `✅ Step validated: ${lastStep.action?.action_id ?? "unknown"}`
      : `❌ Step failed validation: ${lastStep.action?.action_id ?? "unknown"} (${anomalies.length} anomaly(ies))`
  );

  return {
    ...state,
    validation: {
      success,
      action_id: lastStep.action?.action_id,
      anomaly_count: anomalies.length,
      timestamp: Date.now()
    }
  };
}
