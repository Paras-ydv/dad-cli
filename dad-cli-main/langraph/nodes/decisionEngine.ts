import { AgentState, DecisionOutput, ActionContract } from "../types.js";
import type { KnowledgeItem } from "../../knowledge/schema.js";
import { generateIntelligentInput } from "../utils/inputGenerator.js";

const MIN_FIX_CONFIDENCE = 0.6;
const MIN_PATTERN_CONFIDENCE = 0.5;

/** Highest-confidence item of a given type above a threshold. */
function bestOf(
  memories: KnowledgeItem[],
  type: KnowledgeItem["type"],
  threshold: number
): KnowledgeItem | undefined {
  return memories
    .filter((m) => m.type === type && (m.confidence ?? 0) > threshold)
    .sort((a, b) => (b.confidence ?? 0) - (a.confidence ?? 0))[0];
}

/**
 * Chooses the next action.
 *
 * Order of preference:
 *   1. A proven fix from the knowledge base for the current error signature.
 *   2. A learned navigation pattern.
 *   3. Systematic exploration of actions not yet tried in this UI state.
 *   4. Backtracking once the current state is exhausted.
 */
export function decisionEngine(state: AgentState): AgentState {
  try {
    const actions = state.ui_state?.available_actions ?? [];
    const steps = state.steps ?? [];
    const currentStateId = state.ui_state?.state_id || "unknown";

    const memories = state.knowledge_context?.memories as KnowledgeItem[] | undefined;

    let decision: DecisionOutput | undefined;

    /* ---------- 1. Proven fix from memory ---------- */
    if (memories?.length) {
      const fix = bestOf(memories, "fix", MIN_FIX_CONFIDENCE);

      if (fix?.solution) {
        const confidence = fix.confidence ?? MIN_FIX_CONFIDENCE;
        console.log(
          `🎯 Applying proven fix: ${fix.solution} (${(confidence * 100).toFixed(0)}% confidence)`
        );

        decision = {
          next_action: {
            action_id: fix.solution,
            parameters: fix.metadata?.parameters ?? {}
          },
          reasoning: `Applying proven fix '${fix.solution}', previously successful for a similar error signature.`,
          control: "CONTINUE",
          confidence,
          source: "knowledge_base"
        };
      } else {
        /* ---------- 2. Learned pattern ---------- */
        const pattern = bestOf(memories, "pattern", MIN_PATTERN_CONFIDENCE);

        if (pattern?.solution) {
          const confidence = pattern.confidence ?? MIN_PATTERN_CONFIDENCE;
          console.log(`🔍 Following pattern: ${pattern.content}`);

          decision = {
            next_action: { action_id: pattern.solution, parameters: {} },
            reasoning: `Following discovered pattern: ${pattern.content}`,
            control: "CONTINUE",
            confidence,
            source: "knowledge_base"
          };
        }
      }
    }

    /* ---------- 3 & 4. Exploration / backtracking ---------- */
    if (!decision) {
      const lastStep = steps[steps.length - 1];

      if (actions.length === 0) {
        const canBacktrack =
          steps.length > 0 && lastStep?.action?.action_id !== "BROWSER_BACK";

        decision = canBacktrack
          ? {
              next_action: { action_id: "BROWSER_BACK", parameters: {} },
              reasoning: "No actions found on this page. Backtracking to the parent state.",
              control: "CONTINUE",
              confidence: 0.5,
              source: "exploration"
            }
          : {
              next_action: null,
              reasoning: "No available actions and cannot backtrack. Terminating.",
              control: "TERMINATE",
              source: "exploration"
            };
      } else {
        // Actions already tried while in this exact UI state.
        const triedHere = new Set(
          steps
            .filter((s) => s.state_id === currentStateId)
            .map((s) => s.action.action_id)
        );

        const next = actions
          .map((a: any) => (typeof a === "string" ? a : a?.id))
          .find((id: string | undefined) => !!id && !triedHere.has(id));

        if (!next) {
          const backtracked = steps.some(
            (s) => s.state_id === currentStateId && s.action.action_id === "BROWSER_BACK"
          );

          decision = !backtracked && steps.length > 0
            ? {
                next_action: { action_id: "BROWSER_BACK", parameters: {} },
                reasoning: `State ${currentStateId} fully explored. Backtracking to find other branches.`,
                control: "CONTINUE",
                confidence: 0.5,
                source: "exploration"
              }
            : {
                next_action: null,
                reasoning: `State ${currentStateId} and its branches are fully explored.`,
                control: "TERMINATE",
                source: "exploration"
              };
        } else {
          console.log("🤔 Exploring action:", next);

          const parameters: Record<string, any> = {};

          if (next.includes("input") || next.includes("textarea")) {
            parameters.value = generateIntelligentInput({
              actionId: next,
              elementType: next.includes("textarea") ? "textarea" : "input"
            });
          } else if (next.includes("select")) {
            parameters.index = 0;
          } else if (next.includes("checkbox") || next.includes("radio")) {
            parameters.checked = true;
          }

          const action: ActionContract = { action_id: next, parameters };

          decision = {
            next_action: action,
            reasoning: `Exploring untried action '${next}' in state ${currentStateId}.`,
            control: "CONTINUE",
            // Confidence decays as the run gets longer and states get staler.
            confidence: Math.max(0.6, 1.0 - steps.length * 0.05),
            source: "exploration"
          };
        }
      }
    }

    return {
      ...state,
      decision,
      next_action: decision.next_action,
      reasoning: decision.reasoning,
      control: decision.control
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error("❌ Decision engine failed:", message);

    return {
      ...state,
      decision: {
        next_action: null,
        reasoning: `Decision engine error: ${message}`,
        control: "TERMINATE"
      },
      next_action: null,
      reasoning: "Emergency termination due to an internal decision engine error.",
      control: "TERMINATE"
    };
  }
}
