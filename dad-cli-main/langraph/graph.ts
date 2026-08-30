import { memoryNode } from "./nodes/memory.js";
import { diagnoserNode } from "./nodes/diagnoser.js";
import { validatorNode } from "./nodes/validator.js";
import { learnerNode } from "./nodes/learner.js";

import { anomalyDetector } from "./nodes/anomalyDetector.js";
import { decisionEngine } from "./nodes/decisionEngine.js";
import { controlRouter } from "./nodes/controlRouter.js";
import { graphTracker } from "./graph-tracker.js";

/**
 * One turn of the agent.
 *
 * The turn has two phases:
 *
 *   1. Reflect - interpret the observation produced by the action we took last
 *      turn (anomaly detection -> diagnosis -> validation -> learning).
 *   2. Plan    - retrieve relevant memory and choose the next action.
 *
 * Action execution itself happens in the caller, because it needs the live
 * Playwright page and must return an Observation. The caller writes that result
 * back onto `state.execution` so the next turn's reflect phase can learn from it.
 *
 * Run tracking is owned by the caller via graphTracker.startRun()/finishRun().
 * Starting a run here would create a fresh single-node graph on every turn.
 */
export function buildAgentGraph() {
  return {
    invoke: async (state: any) => {
      let currentState = { ...state };

      try {
        // --- Reflect on the previous turn -------------------------------
        currentState = anomalyDetector(currentState);
        currentState = await diagnoserNode(currentState);
        currentState = await validatorNode(currentState);
        currentState = await learnerNode(currentState);

        // --- Plan the next turn -----------------------------------------
        currentState = await memoryNode(currentState);
        currentState = decisionEngine(currentState);
        currentState = controlRouter(currentState);

        graphTracker.trackStep({
          url: currentState.ui_state?.route || currentState.runtime?.url || "unknown",
          screenshotUrl: currentState.screenshot_url || "",
          actionTaken: currentState.next_action?.action_id || "none",
          reasoning: currentState.reasoning || "Decision made",
          status: "success",
          stateId: currentState.ui_state?.state_id
        });

        return currentState;
      } catch (error) {
        graphTracker.trackStep({
          url: currentState.ui_state?.route || currentState.runtime?.url || "unknown",
          screenshotUrl: currentState.screenshot_url || "",
          actionTaken: "error",
          reasoning: "Graph execution failed",
          status: "error",
          stateId: currentState.ui_state?.state_id,
          error: {
            message: error instanceof Error ? error.message : String(error),
            ...(error instanceof Error && error.stack ? { stack: error.stack } : {})
          }
        });

        throw error;
      }
    }
  };
}

/** @deprecated Retained for callers still using the old name. */
export const buildPrompt3Graph = buildAgentGraph;
