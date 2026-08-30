# TestPilot AI

An autonomous testing agent that explores a running web application, decides what
to do next from live runtime behaviour, and reports what broke — with no
pre-written test scripts.

Point it at a URL. It discovers the interactive elements on the page, picks an
action, executes it in a real browser, checks the result against a set of
invariants, records what it learned, and repeats. The traversal is captured as a
state graph you can replay in a dashboard, with a screenshot and the agent's
stated reasoning attached to every step.

```bash
cd dad-cli-main
npm install
npx playwright install chromium
npm start https://your-app.com
```

## How it works

Each turn of the agent has two phases:

**Reflect** — interpret what the last action produced.
`anomalyDetector` runs three invariants over the observation (failed network
calls, console errors, off-site navigation), `diagnoser` normalises any error
into a stable signature, `validator` judges whether the step succeeded, and
`learner` writes the outcome to the knowledge base.

**Plan** — decide what to do next.
`memory` retrieves semantically similar past runs from Qdrant, `decisionEngine`
prefers a proven fix, then a learned pattern, then systematic exploration of
untried actions, and `controlRouter` halts the run on a critical anomaly.

Execution happens in the run loop rather than inside the graph, because it needs
the live Playwright page and returns an observation the next turn reflects on.
Actions below a confidence threshold are refused before they reach the browser.

### State identity

Pages are keyed by a SHA-256 hash of the pathname plus the sorted set of
discovered action ids, so revisiting a page maps to the same node. Element ids
are normalised to strip mutable text — counters (`Cart (3)`) and toggle state
(`currently dark mode`) — which otherwise renames an element on every click and
traps the agent in a loop.

## Layout

All paths below are relative to `dad-cli-main/`, where the project lives.

| Path | Role |
| --- | --- |
| `langraph/` | Agent graph: nodes, invariants, traversal tracking |
| `runtime-discovery/` | Playwright driver, action discovery, the run loop |
| `knowledge/` | Qdrant vector store, embeddings, confidence feedback |
| `error-intelligence/` | Post-run analysis pipeline and reporters |
| `azure-integration/` | Fastify API over Cosmos DB, Vision, and Monitor |
| `testpilot-graph-ui/` | React + React Flow dashboard for replaying runs |
| `vscode-extension/` | Run the agent from inside VS Code |

## Setup

### 1. Dependencies

```bash
cd dad-cli-main
npm install
cd runtime-discovery && npm install && npx playwright install chromium
cd ../azure-integration && npm install
cd ../testpilot-graph-ui && npm install
```

### 2. Vector database

```bash
docker run -p 6333:6333 -v $(pwd)/qdrant_data:/qdrant/storage qdrant/qdrant
npm run create-collection
```

The agent degrades gracefully when Qdrant is unavailable — it explores without
memory rather than failing.

### 3. Configuration

Every service reads its secrets from the environment; nothing is committed.

```bash
cp .env.example .env
cp .env.example runtime-discovery/.env
cp azure-integration/.env.example azure-integration/.env
cp testpilot-graph-ui/.env.example testpilot-graph-ui/.env
```

One shared API key protects the backend. It must match in three places:
`API_KEY` (backend), `TESTPILOT_API_KEY` (agent), `VITE_API_KEY` (dashboard).

Embeddings default to a local MiniLM model (384-dim, no API key needed). Set
`EMBEDDING_PROVIDER=azure` to use Azure OpenAI instead.

## Usage

```bash
npm start https://your-app.com          # headless
npm run start-headful https://your-app.com   # watch it work

npm run server        # backend API on :5050
npm run dashboard     # run replay UI on :5173

npm test              # unit tests
npm run typecheck     # strict TypeScript, no emit
```

Post-run analysis:

```bash
npx tsx error-intelligence/pipeline.ts runs/<run-id>-graph.json reports/analysis.json
```

## Output

- `runs/` — traversal graph per run (nodes, edges, metadata)
- `screenshots/` — a capture per state and per action
- `reports/` — analysis output
- Cosmos DB — run, step, and anomaly records when the backend is configured

## VS Code extension

```bash
npm run compile-extension
# then press F5 to launch an extension development host
```

Adds a **TestPilot** activity-bar view and a `TestPilot: Start` command that
prompts for a URL and runs the agent in an integrated terminal.

## Troubleshooting

**Qdrant unreachable** — `curl http://localhost:6333/collections`. The agent
logs a warning and continues without memory.

**Backend returns 401** — `TESTPILOT_API_KEY` does not match `API_KEY`.

**Agent finds no actions** — the page may render after `networkidle`; the
stability wait is in `runtime-discovery/src/waitForStability.ts`.
