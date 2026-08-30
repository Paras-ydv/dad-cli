export interface GraphNode {
  id: string;
  url: string;
  screenshotUrl: string;
  actionTaken: string;
  reasoning: string;
  timestamp: string;
  /** Stable id of the UI state this node represents. */
  stateId?: string;
  status: "success" | "error";
  error?: {
    message: string;
    stack?: string;
  };
}

export interface GraphEdge {
  from: string;
  to: string;
  action: string;
}

export interface TraversalGraph {
  runId: string;
  nodes: GraphNode[];
  edges: GraphEdge[];
  metadata: {
    startTime: string;
    endTime?: string;
    totalSteps: number;
    errorCount: number;
  };
}

export interface GraphResponse {
  nodes: GraphNode[];
  edges: GraphEdge[];
}