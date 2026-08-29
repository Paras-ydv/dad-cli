import { QdrantClient } from "@qdrant/js-client-rest";

export const qdrant = new QdrantClient({
  url: process.env.QDRANT_URL || "http://127.0.0.1:6333"
});

export const COLLECTION = process.env.QDRANT_COLLECTION || "testpilot_kb";
