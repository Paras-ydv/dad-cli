import axios from "axios";

const API_KEY = import.meta.env.VITE_API_KEY;

if (!API_KEY) {
  console.warn(
    "⚠️ VITE_API_KEY is not set - requests to the TestPilot backend will be rejected."
  );
}

export const graphApi = axios.create({
  baseURL: import.meta.env.VITE_GRAPH_API || "http://localhost:5050/graph",
  headers: {
    "x-api-key": API_KEY ?? ""
  }
});

export const visionApi = axios.create({
  baseURL: import.meta.env.VITE_VISION_API || "http://localhost:5050/vision",
  headers: {
    "x-api-key": API_KEY ?? ""
  }
});

export async function fetchGraph(runId: string) {
  const res = await graphApi.get(`/run/${runId}`);
  return res.data;
}

export const fetchRuns = async () => {
  const response = await graphApi.get("/runs");
  return response.data;
};

export const deleteRun = async (runId: string) => {
  const response = await graphApi.delete(`/run/${runId}`);
  return response.data;
};

export const analyzeScreenshotLocal = async (screenshotPath: string) => {
  const response = await visionApi.post("/analyze-local", { screenshotPath });
  return response.data;
};

/**
 * Absolute URL for a screenshot referenced by a graph node.
 * Node payloads carry a root-relative path such as "/screenshots/foo.png".
 */
export function screenshotUrl(nodeScreenshotUrl: string): string {
  const base = (graphApi.defaults.baseURL || "").replace(/\/$/, "");
  const suffix = nodeScreenshotUrl.startsWith("/")
    ? nodeScreenshotUrl
    : `/${nodeScreenshotUrl}`;
  return `${base}${suffix}`;
}
