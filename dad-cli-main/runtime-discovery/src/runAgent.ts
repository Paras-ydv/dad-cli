import { discoverUI, executeAction, initializeBrowser, closeBrowser, takeScreenshot } from "./agentRuntime.js";
import { runAgentTurn } from "../../langraph/index.js";
import { graphTracker } from "../../langraph/graph-tracker.js";
import { AgentState, ActionContract } from "./types.js";
import { validateUrl } from "./urlValidator.js";
import axios from "axios";
import dotenv from "dotenv";

// Load environment variables
dotenv.config({ path: 'runtime-discovery/.env' });

const API_BASE_URL = process.env.TESTPILOT_API_URL || "http://localhost:5050";
const API_KEY = process.env.TESTPILOT_API_KEY || process.env.API_KEY;

if (!API_KEY) {
  console.warn(
    "⚠️ TESTPILOT_API_KEY is not set - run persistence to the backend will be rejected with 401."
  );
}

const cosmosApi = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "x-api-key": API_KEY ?? ""
  }
});

const insertTestRun = async (data: any) => {
  try {
    return await cosmosApi.post("/db/test-runs", data);
  } catch (err) {
    console.warn("⚠️ CosmosDB: Failed to insert test run:", err instanceof Error ? err.message : String(err));
    return null;
  }
};

const insertTestStep = async (data: any) => {
  try {
    return await cosmosApi.post("/db/test-steps", data);
  } catch (err) {
    console.warn("⚠️ CosmosDB: Failed to insert test step:", err instanceof Error ? err.message : String(err));
    return null;
  }
};

const insertAnomaly = async (data: any) => {
  try {
    return await cosmosApi.post("/db/anomalies", data);
  } catch (err) {
    console.warn("⚠️ CosmosDB: Failed to insert anomaly:", err instanceof Error ? err.message : String(err));
    return null;
  }
};

const updateTestRun = async (runId: string, data: any) => {
  try {
    return await cosmosApi.put(`/db/test-runs/${runId}`, data);
  } catch (err) {
    console.warn("⚠️ CosmosDB: Failed to update test run:", err instanceof Error ? err.message : String(err));
    return null;
  }
};

const args = process.argv.slice(2);
const headfulIndex = args.indexOf('--headful');
const headless = headfulIndex === -1;

if (headfulIndex !== -1) {
  args.splice(headfulIndex, 1);
}

const rawUrl = args[0];

if (!rawUrl) {
  console.error("Usage: npm run start <url> or npm run start-headful <url>");
  process.exit(1);
}

let targetUrl: string;

try {
  targetUrl = validateUrl(rawUrl);
} catch (error) {
  console.error("❌ Invalid URL:", error instanceof Error ? error.message : String(error));
  process.exit(1);
}

/** Minimum decision confidence required before an action is executed. */
const MIN_EXECUTION_CONFIDENCE = 0.4;

/** Hard cap on turns for a single run. */
const MAX_STEPS = 100;

function createRuntimeExecutor() {
  return async (action_id: string, parameters: Record<string, any>): Promise<void> => {
    const action: ActionContract = { action_id, parameters };
    await executeAction(action);
  };
}

async function main() {
  const graphRunId = `run-${Date.now()}`;
  let stepIndex = 0;
  let successfulSteps = 0;
  let failedSteps = 0;
  let anomaliesCount = 0;

  try {
    const state: AgentState = {
      schema_version: "1.0",
      run_id: graphRunId,
      runtime: {
        url: targetUrl,
        browser: "chromium",
        timestamp: new Date().toISOString(),
        execute: createRuntimeExecutor()
      },
      steps: []
    };

    // One traversal graph per run. Previously this was started inside the agent
    // graph, which produced a fresh single-node graph on every turn.
    graphTracker.startRun(graphRunId);

    await insertTestRun({
      runId: graphRunId,
      targetUrl,
      startedAt: new Date().toISOString(),
      status: "running",
      totalSteps: 0,
      successfulSteps: 0,
      failedSteps: 0,
      anomaliesCount: 0
    });

    try {
      await initializeBrowser(headless);
    } catch (error) {
      console.error("❌ Failed to initialize browser:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    try {
      state.ui_state = await discoverUI(targetUrl, headless);
    } catch (error) {
      console.error("❌ Initial UI discovery failed:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }

    let consecutiveFailures = 0;
    let noActionSteps = 0;
    const MAX_CONSECUTIVE_FAILURES = 5;
    const MAX_NO_ACTION_STEPS = 3;

    for (let step = 0; step < MAX_STEPS; step++) {
      try {
        if (state.ui_state?.route === '/error' && step > 5) {
          console.log("🛑 Stuck in error route - terminating");
          break;
        }

        if (consecutiveFailures >= MAX_CONSECUTIVE_FAILURES) {
          console.log(`🛑 Too many consecutive failures (${consecutiveFailures}) - terminating`);
          break;
        }

        if (noActionSteps >= MAX_NO_ACTION_STEPS) {
          console.log(`🛑 No available actions for ${noActionSteps} steps - terminating`);
          break;
        }

        console.log(`\n[Loop] Step ${step + 1}`);

        // Capture state ID BEFORE execution to attribute the action correctly
        const preExecutionStateId = state.ui_state?.state_id;

        // Capture screenshot for graph tracking
        try {
          const screenshotPath = await takeScreenshot(`state_${preExecutionStateId}`);
          state.screenshot_url = screenshotPath;
        } catch (err) {
          console.warn("⚠️ Failed to capture state screenshot:", err);
        }

        try {
          const updatedState = await runAgentTurn(state);

          // Carry the full agent output forward. Copying only next_action
          // dropped the anomalies and control signal, so critical failures
          // never stopped the run and no anomaly was ever persisted.
          state.next_action = updatedState.next_action ?? null;
          state.anomalies = updatedState.anomalies ?? [];
          state.diagnosis = updatedState.diagnosis;
          state.validation = updatedState.validation;
          state.reasoning = updatedState.reasoning || updatedState.decision?.reasoning;

          if (updatedState.decision) state.decision = updatedState.decision;
          if (updatedState.knowledge_context) {
            state.knowledge_context = updatedState.knowledge_context;
          }
          if (updatedState.control) state.control = updatedState.control;
        } catch (error) {
          console.error("❌ Agent logic failed:", error instanceof Error ? error.message : String(error));
          state.reasoning = `Agent logic failed during decision phase: ${error instanceof Error ? error.message : String(error)}`;
          consecutiveFailures++;
        }

        console.log("[DEBUG] Next action:", state.next_action?.action_id);

        // Safety gate: refuse to act on a low-confidence decision. This lived in
        // an executor node that was imported but never called, so it never ran.
        const confidence = state.decision?.confidence;
        const lowConfidence =
          confidence !== undefined && confidence < MIN_EXECUTION_CONFIDENCE;

        if (lowConfidence && state.next_action) {
          console.log(
            `⚠️ Skipping ${state.next_action.action_id}: confidence ${confidence!.toFixed(2)} < ${MIN_EXECUTION_CONFIDENCE}`
          );
          state.next_action = null;
          state.reasoning = `Skipped: decision confidence ${confidence!.toFixed(2)} below the ${MIN_EXECUTION_CONFIDENCE} execution threshold.`;
        }

        if (!state.next_action || !state.ui_state?.available_actions?.length) {
          noActionSteps++;
        } else {
          noActionSteps = 0;
        }

        let observation;
        try {
          if (state.next_action) {
            observation = await executeAction(state.next_action);
          } else {
            const idleScreenshot = await takeScreenshot("idle");
            observation = {
              actionId: "no_action",
              networkCalls: [],
              consoleErrors: [],
              screenshotPath: idleScreenshot,
              skipped: true
            };
          }
        } catch (error) {
          console.error("❌ Action execution failed:", error instanceof Error ? error.message : String(error));
          consecutiveFailures++;
          const errorScreenshot = await takeScreenshot("error");
          observation = {
            actionId: state.next_action?.action_id || "unknown",
            networkCalls: [],
            consoleErrors: [error instanceof Error ? error.message : String(error)],
            screenshotPath: errorScreenshot,
            skipped: true
          };
        }

        try {
          state.ui_state = await discoverUI(targetUrl, headless);
          if (state.ui_state && state.ui_state.available_actions.length > 0) {
            consecutiveFailures = 0;
          }
        } catch (error) {
          console.warn("⚠️ UI refresh failed:", error instanceof Error ? error.message : String(error));
          consecutiveFailures++;
        }

        // Record what actually happened so the next turn's learner node can
        // attribute the outcome. Without this, learner always returned early.
        state.execution = state.next_action
          ? {
              action_id: state.next_action.action_id,
              parameters: state.next_action.parameters,
              timestamp: Date.now(),
              skipped: observation.skipped === true,
              ...(observation.skipped ? { reason: "ACTION_NOT_EXECUTED" } : {})
            }
          : { skipped: true, reason: "NO_ACTION", timestamp: Date.now() };

        if (!state.next_action) {
          // An idle turn is neither a success nor a failure.
        } else if (observation.skipped) {
          failedSteps++;
        } else {
          successfulSteps++;
        }
        anomaliesCount += state.anomalies?.length ?? 0;

        // Update internal state steps for memory-based decisions
        state.steps.push({
          step: stepIndex,
          action: state.next_action || { action_id: "none", parameters: {} },
          observation: observation,
          state_id: preExecutionStateId,
          anomalies: state.anomalies || []
        });

        await insertTestStep({
          runId: graphRunId,
          stepIndex: stepIndex++,
          actionId: state.next_action?.action_id || "unknown",
          actionType: state.next_action?.action_id?.split(":")[0] || (state.next_action ? "unknown" : "idle"),
          parameters: state.next_action?.parameters || {},
          timestamp: new Date().toISOString(),
          status: observation.skipped ? "failed" : "success",
          screenshotPath: observation.screenshotPath || "",
          networkCalls: observation.networkCalls.length,
          consoleErrors: observation.consoleErrors,
          stateId: preExecutionStateId, // Essential for branching
          reasoning: state.reasoning || (state.next_action ? "Executing planned action." : "No action determined by agent.")
        });

        if (state.anomalies && state.anomalies.length > 0) {
          for (const anomaly of state.anomalies) {
            await insertAnomaly({
              runId: graphRunId,
              stepIndex: stepIndex - 1,
              ...anomaly
            });
          }
        }
        if (state.control === "TERMINATE") {
          console.log(`🛑 Agent signalled TERMINATE: ${state.reasoning}`);
          break;
        }
      } catch (loopError) {
        console.error("❌ Step loop error:", loopError);
        consecutiveFailures++;
      }
    }

    await updateTestRun(graphRunId, {
      status: "completed",
      completedAt: new Date().toISOString(),
      totalSteps: stepIndex,
      successfulSteps,
      failedSteps,
      anomaliesCount
    });

  } catch (error) {
    console.error("❌ Main execution failed:", error);
  } finally {
    // Persist the traversal graph exactly once, at the end of the run.
    graphTracker.finishRun();
    await closeBrowser();
    console.log(
      `\n✅ Run completed. Run ID: ${graphRunId} | ${stepIndex} steps, ${successfulSteps} ok, ${failedSteps} failed, ${anomaliesCount} anomalies`
    );
  }
}

main();
