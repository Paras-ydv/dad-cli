import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({
  url: "http://localhost:6333"
});

async function main() {
  try {
    await client.createCollection("testpilot_kb", {
      vectors: {
        // size: 1536,   // embedding size (OpenAI standard)
        size: 384,
        distance: "Cosine"
      }
    });

    console.log("✅ Collection created");
  } catch (error) {
    console.error("❌ Failed to create collection:", error instanceof Error ? error.message : String(error));
    process.exit(1);
  }
}

main().catch(error => {
  console.error("❌ Script failed:", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
