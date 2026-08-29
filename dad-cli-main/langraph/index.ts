import { buildAgentGraph } from "./graph.js";
import { AgentState } from "./types.js";

const graph = buildAgentGraph();

/**
 * Run one reflect + plan turn of the agent.
 *
 * On failure the state is returned with a TERMINATE control signal rather than
 * throwing, so the run loop can shut down cleanly.
 */
export async function runAgentTurn(state: AgentState): Promise<AgentState> {
  try {
    if (!state) {
      throw new Error("Invalid state: state is null or undefined");
    }

    const result = await graph.invoke(state);

    if (!result) {
      throw new Error("Agent graph returned null result");
    }

    return result;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Agent graph execution failed:", message);

    return {
      ...state,
      decision: {
        next_action: null,
        control: "TERMINATE",
        reasoning: `Agent graph failed: ${message}`
      },
      next_action: null,
      reasoning: `Agent graph failed: ${message}`,
      control: "TERMINATE"
    };
  }
}

/** @deprecated Retained for callers still using the old name. */
export const runPrompt3 = runAgentTurn;
