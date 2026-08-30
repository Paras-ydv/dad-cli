import { graphStorage } from "../storage/graph-storage.js";
import type { GraphNode } from "../shared/graph-types.js";

export type TrackedStep = Omit<GraphNode, "id" | "timestamp">;

/**
 * Accumulates the traversal graph for a single agent run.
 *
 * The run lifecycle is owned by the caller: startRun() once before the loop and
 * finishRun() once after it. Starting a run per turn produced a separate
 * one-node, zero-edge graph for every step and lost the traversal entirely.
 */
export class GraphTracker {
  private currentRunId: string | null = null;
  private lastNodeId: string | null = null;
  private lastAction: string | null = null;

  startRun(runId?: string): string {
    this.currentRunId = graphStorage.createRun(runId);
    this.lastNodeId = null;
    this.lastAction = null;
    console.log(`📊 Started graph tracking: ${this.currentRunId}`);
    return this.currentRunId;
  }

  trackStep(data: TrackedStep): string | null {
    if (!this.currentRunId) {
      // Tracking is observability, not control flow - never fail the run for it.
      console.warn("⚠️ trackStep called with no active run - skipping.");
      return null;
    }

    const nodeId = graphStorage.addNode(this.currentRunId, {
      ...data,
      timestamp: new Date().toISOString()
    });

    if (this.lastNodeId) {
      // The transition into this node was caused by the action chosen at the
      // previous node, not by this node's own pending action.
      graphStorage.addEdge(this.currentRunId, {
        from: this.lastNodeId,
        to: nodeId,
        action: this.lastAction ?? "unknown"
      });
    }

    this.lastNodeId = nodeId;
    this.lastAction = data.actionTaken;
    return nodeId;
  }

  finishRun(): void {
    if (this.currentRunId) {
      graphStorage.finishRun(this.currentRunId);
      console.log(`📊 Finished graph tracking: ${this.currentRunId}`);
      this.currentRunId = null;
      this.lastNodeId = null;
      this.lastAction = null;
    }
  }

  getCurrentRunId(): string | null {
    return this.currentRunId;
  }
}

export const graphTracker = new GraphTracker();
