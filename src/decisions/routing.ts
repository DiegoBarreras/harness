import { choice, noul, score } from "@typesafe-ai/sdk";
import { createTypeSafeClient } from "../client.js";

const ROUTES = ["quick", "standard", "deep", "review"] as const;
type Route = (typeof ROUTES)[number];

export interface TaskEvaluation {
  route: Route;
  complexity: number;
  humanReviewProbability: number;
  model: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function requireFiniteNumber(value: unknown, label: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`Unexpected TypeSafe response: ${label} must be a finite number.`);
  }

  return value;
}

export async function evaluateTask(state: string): Promise<TaskEvaluation> {
  const client = createTypeSafeClient();
  const response: unknown = await client.systemOne({
    model: "jev-latest",
    state,
    questions: {
      route: choice(
        "Select the category that best represents the work required by the task.",
        {
          quick: "Small, localized changes.",
          standard: "A normal implementation that affects a few components.",
          deep: "Architectural changes or work with high complexity.",
          review: "Primarily reviewing or verifying existing code.",
        },
      ),
      complexity: score(
        "Evaluate the technical complexity of the task described.",
        [
          "Trivial complexity.",
          "Low complexity.",
          "Moderate complexity.",
          "High complexity.",
        ],
      ),
      humanReview: noul(
        "Based exclusively on the provided state, does this task appear to require human review before implementation begins?",
        {
          true: "The provided information indicates human review is needed before implementation.",
          false: "The provided information does not indicate human review is needed before implementation.",
        },
      ),
    },
  });

  if (!isRecord(response) || !isRecord(response.answers) || !isRecord(response.usage)) {
    throw new Error("Unexpected TypeSafe response: missing answers or usage metadata.");
  }

  const { answers, usage } = response;
  if (
    !isRecord(answers.route) ||
    !isRecord(answers.complexity) ||
    !isRecord(answers.humanReview)
  ) {
    throw new Error("Unexpected TypeSafe response: one or more decision answers are missing.");
  }

  const route = answers.route.choice;
  if (typeof route !== "string" || !ROUTES.includes(route as Route)) {
    throw new Error("Unexpected TypeSafe response: route is not one of the requested categories.");
  }

  const complexity = requireFiniteNumber(answers.complexity.score, "complexity score");
  if (complexity < 0 || complexity > 3) {
    throw new Error("Unexpected TypeSafe response: complexity score is outside the 0–3 scale.");
  }

  const humanReviewProbability = requireFiniteNumber(
    answers.humanReview.noul,
    "human review probability",
  );
  if (humanReviewProbability < 0 || humanReviewProbability > 1) {
    throw new Error("Unexpected TypeSafe response: human review probability is outside 0–1.");
  }

  if (typeof response.model !== "string" || response.model.length === 0) {
    throw new Error("Unexpected TypeSafe response: model name is missing.");
  }

  const inputTokens = requireFiniteNumber(usage.input_tokens, "input_tokens");
  const outputTokens = requireFiniteNumber(usage.output_tokens, "output_tokens");
  if (
    !Number.isInteger(inputTokens) ||
    inputTokens < 0 ||
    !Number.isInteger(outputTokens) ||
    outputTokens < 0
  ) {
    throw new Error("Unexpected TypeSafe response: token usage must be non-negative integers.");
  }

  return {
    route: route as Route,
    complexity,
    humanReviewProbability,
    model: response.model,
    usage: {
      input_tokens: inputTokens,
      output_tokens: outputTokens,
    },
  };
}
