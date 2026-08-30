import { describe, it, expect } from "vitest";
import { decisionEngine } from "../langraph/nodes/decisionEngine.js";
import { controlRouter } from "../langraph/nodes/controlRouter.js";
import type { AgentState } from "../shared/types.js";

function baseState(overrides: Partial<AgentState> = {}): AgentState {
  return {
    schema_version: "1.0",
    run_id: "test-run",
    runtime: { url: "https://example.com", browser: "chromium", timestamp: "" },
    ui_state: {
      state_id: "state-a",
      route: "/",
      title: "Example",
      available_actions: ["link_docs", "button_login"],
      entities: { url: "https://example.com/" }
    },
    steps: [],
    ...overrides
  };
}

describe("decisionEngine", () => {
  it("explores an untried action first", () => {
    const out = decisionEngine(baseState());
    expect(out.next_action?.action_id).toBe("link_docs");
    expect(out.control).toBe("CONTINUE");
  });

  it("does not repeat an action already tried in the same state", () => {
    const state = baseState({
      steps: [
        {
          step: 0,
          action: { action_id: "link_docs", parameters: {} },
          observation: { actionId: "link_docs", networkCalls: [], consoleErrors: [] },
          state_id: "state-a"
        }
      ]
    });

    expect(decisionEngine(state).next_action?.action_id).toBe("button_login");
  });

  it("backtracks once a state is exhausted, then terminates", () => {
    const exhausted = baseState({
      steps: [
        {
          step: 0,
          action: { action_id: "link_docs", parameters: {} },
          observation: { actionId: "link_docs", networkCalls: [], consoleErrors: [] },
          state_id: "state-a"
        },
        {
          step: 1,
          action: { action_id: "button_login", parameters: {} },
          observation: { actionId: "button_login", networkCalls: [], consoleErrors: [] },
          state_id: "state-a"
        }
      ]
    });

    const backtrack = decisionEngine(exhausted);
    expect(backtrack.next_action?.action_id).toBe("BROWSER_BACK");

    // Once we have already backtracked from this state, stop.
    exhausted.steps.push({
      step: 2,
      action: { action_id: "BROWSER_BACK", parameters: {} },
      observation: { actionId: "BROWSER_BACK", networkCalls: [], consoleErrors: [] },
      state_id: "state-a"
    });

    expect(decisionEngine(exhausted).control).toBe("TERMINATE");
  });

  it("generates contextual input values for text fields", () => {
    const state = baseState();
    state.ui_state!.available_actions = ["input_email_address"];

    const out = decisionEngine(state);
    expect(out.next_action?.parameters.value).toContain("@");
  });

  it("prefers a high-confidence known fix over exploration", () => {
    const state = baseState({
      knowledge_context: {
        memories: [
          {
            type: "fix",
            content: "retry login",
            run_id: "old",
            solution: "button_retry",
            confidence: 0.92,
            metadata: { timestamp: "" }
          }
        ],
        confidence: 0.92
      }
    });

    const out = decisionEngine(state);
    expect(out.next_action?.action_id).toBe("button_retry");
    expect(out.decision?.source).toBe("knowledge_base");
  });
});

describe("controlRouter", () => {
  it("passes through when there is no critical anomaly", () => {
    const state = decisionEngine(baseState());
    const out = controlRouter({
      ...state,
      anomalies: [
        { severity: "MEDIUM", category: "CONSOLE_ERROR", action_id: "x", description: "noise" }
      ]
    });

    expect(out.control).not.toBe("TERMINATE");
    expect(out.next_action).not.toBeNull();
  });

  it("clears the pending action when a critical anomaly fires", () => {
    // Regression: termination used to be written only to decision.control, so
    // the run loop kept executing the previously chosen action.
    const state = decisionEngine(baseState());
    const out = controlRouter({
      ...state,
      anomalies: [
        { severity: "HIGH", category: "API_ERROR", action_id: "x", description: "500" }
      ]
    });

    expect(out.control).toBe("TERMINATE");
    expect(out.next_action).toBeNull();
    expect(out.decision?.control).toBe("TERMINATE");
  });
});
