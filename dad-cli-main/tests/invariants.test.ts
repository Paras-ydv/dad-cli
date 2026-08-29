import { describe, it, expect } from "vitest";
import { anomalyDetector } from "../langraph/nodes/anomalyDetector.js";
import type { AgentState } from "../shared/types.js";

function stateWith(observation: any, uiUrl = "https://example.com/docs"): AgentState {
  return {
    schema_version: "1.0",
    run_id: "r",
    runtime: { url: "https://example.com", browser: "chromium", timestamp: "" },
    ui_state: {
      state_id: "s",
      route: new URL(uiUrl).pathname,
      title: "t",
      available_actions: [],
      entities: { url: uiUrl }
    },
    steps: [
      {
        step: 0,
        action: { action_id: "link_docs", parameters: {} },
        observation
      }
    ]
  };
}

const clean = { actionId: "link_docs", networkCalls: [], consoleErrors: [] };

describe("anomaly detection", () => {
  it("reports nothing for a healthy step", () => {
    expect(anomalyDetector(stateWith(clean)).anomalies).toHaveLength(0);
  });

  it("does not flag ordinary in-app navigation", () => {
    // Regression: the route check compared a pathname against the full target
    // URL, so every navigation away from "/" raised a false anomaly.
    const out = anomalyDetector(stateWith(clean, "https://example.com/deep/page"));
    expect(out.anomalies).toHaveLength(0);
  });

  it("flags navigation off the application under test", () => {
    const out = anomalyDetector(stateWith(clean, "https://evil.test/landing"));
    expect(out.anomalies?.[0]?.category).toBe("OFF_SITE_NAVIGATION");
  });

  it("treats a 5xx as critical and a 4xx as medium", () => {
    const server = anomalyDetector(
      stateWith({ ...clean, networkCalls: [{ method: "GET", url: "/api", status: 500 }] })
    );
    expect(server.anomalies?.[0]?.severity).toBe("HIGH");

    const client = anomalyDetector(
      stateWith({ ...clean, networkCalls: [{ method: "GET", url: "/api", status: 404 }] })
    );
    expect(client.anomalies?.[0]?.severity).toBe("MEDIUM");
  });

  it("emits the full anomaly shape the API and dashboard expect", () => {
    const out = anomalyDetector(
      stateWith({ ...clean, consoleErrors: ["TypeError: x is not a function"] })
    );
    const anomaly = out.anomalies?.[0];

    expect(anomaly).toMatchObject({
      severity: expect.any(String),
      category: "CONSOLE_ERROR",
      action_id: "link_docs",
      description: expect.any(String)
    });
  });

  it("clears anomalies once the underlying problem is gone", () => {
    const noisy = anomalyDetector(
      stateWith({ ...clean, consoleErrors: ["boom"] })
    );
    expect(noisy.anomalies).toHaveLength(1);

    const recovered = anomalyDetector({ ...noisy, steps: stateWith(clean).steps });
    expect(recovered.anomalies).toHaveLength(0);
  });
});
