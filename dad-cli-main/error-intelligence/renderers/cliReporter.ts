function pad(s: string, n: number) {
  return (s ?? "").padEnd(n, " ");
}

export function renderCliSummary(report: any) {
  console.log("\n=== TestPilot AI — Error Intelligence Report ===\n");

  console.log("Run:", report.run_id);

  // ============================
  // 1) DISCOVERED STATES
  // ============================

  const states = Object.keys(report.graph_summary?.state_graph ?? {});

  console.log("\nDiscovered States");
  console.log("─────────────────");

  if (!states.length) {
    console.log("  (no states discovered)");
  } else {
    states.forEach(s => {
      const route = report.graph_summary.state_graph[s]?.route || "(unknown)";
      console.log(`  [${s}]  ${route}`);
    });
  }

  // ============================
  // 2) STATE TRANSITIONS (GRAPH)
  // ============================

  console.log("\nState Transitions");
  console.log("─────────────────");

  if (!states.length) {
    console.log("  (no transitions available)");
  } else {
    states.forEach(stateId => {
      const node = report.graph_summary.state_graph[stateId];
      const edges = node?.edges ?? [];

      console.log(`\n ${node?.route || stateId}`);

      if (!edges.length) {
        console.log("   └─ (no outgoing actions)");
        return;
      }

      edges.forEach((edge: any) => {
        const action = edge?.action_id ?? "(unknown action)";
        const target = edge?.to_state ?? "(unknown state)";

        const failed = (report.anomalies ?? [])
          .some((a: any) => a.action_id === action);

        const status = failed ? " ❌ FAILED" : "";

        console.log(`   └─ ${pad(action, 24)} → ${target}${status}`);
      });
    });
  }

  // ============================
  // 3) ACTION → API MAP
  // ============================

  console.log("\nAction → API Map");
  console.log("────────────────");

  const apiMap = report.graph_summary?.action_api_map ?? {};

  const apiKeys = Object.keys(apiMap);

  if (!apiKeys.length) {
    console.log("  (no api mappings available)");
  } else {
    apiKeys.forEach(actionId => {
      const apis = apiMap[actionId] ?? [];

      if (!apis.length) {
        console.log(`  ${actionId}  →  (no observed calls)`);
      } else {
        apis.forEach((call: any) => {
          console.log(
            `  ${pad(actionId, 22)} →  ${call.method} ${call.url}`
          );
        });
      }
    });
  }

  // ============================
  // 4) ANOMALY SUMMARY
  // ============================

  console.log("\nAnomalies");
  console.log("─────────");

  if (!report.anomalies?.length) {
    console.log("  None detected");
  } else {
    report.anomalies.forEach((a: any) => {
      console.log(`\n  ❌ ${a.severity} :: ${a.category}`);
      console.log(`     Action: ${a.action_id}`);
      console.log(`     ${a.description}`);
    });
  }

  // ============================
  // 5) CONTENT SAFETY
  // ============================

  console.log("\nScreenshots (content safety)");
  console.log("────────────────────────────");

  if (!report.enrichment?.content_safety?.length) {
    console.log("  None");
  } else {
    report.enrichment.content_safety.forEach((c: any) =>
      console.log(`  - ${c.screenshot} (${c.risk_level})`)
    );
  }

  // ============================
  // 6) PERFORMANCE SUMMARY
  // ============================

  console.log("\nPerformance Observations");
  console.log("────────────────────────");

  if (!report.enrichment?.performance?.length) {
    console.log("  None");
  } else {
    report.enrichment.performance.forEach((p: any) =>
      console.log(`  - ${p.method} ${p.url} :: ${p.response_time_ms}ms`)
    );
  }

  console.log("\n============================================\n");
}
