import { APIConnectionError, APIError } from "@typesafe-ai/sdk";
import { evaluateTask } from "./decisions/routing.js";

const task = `Quiero implementar autenticación JWT en una API REST de Node.js + TypeScript.
La funcionalidad requiere modificar middleware y servicios existentes y agregar
tests. El cambio todavía no ha sido implementado.`;

async function main(): Promise<void> {
  if (!process.env.TYPESAFE_API_KEY?.trim()) {
    throw new Error("TYPESAFE_API_KEY is not set. Configure it in the environment and retry.");
  }

  const result = await evaluateTask(task);

  console.log("=== Jev Smoke Test ===\n");
  console.log("Task:");
  console.log(task);
  console.log(`\nRoute: ${result.route}`);
  console.log(`Complexity: ${result.complexity}`);
  console.log(`Human review (Noul probability of yes): ${result.humanReviewProbability}`);
  console.log(`\nModel: ${result.model}`);
  console.log(`Input tokens: ${result.usage.input_tokens}`);
  console.log(`Output tokens: ${result.usage.output_tokens}`);
  console.log("\nSmoke test: PASS");
}

function reportFailure(error: unknown): void {
  if (error instanceof APIConnectionError) {
    console.error(`TypeSafe connection error: ${error.message}`);
  } else if (error instanceof APIError) {
    console.error(`TypeSafe HTTP error (${error.status}): ${error.message}`);
  } else if (error instanceof Error) {
    console.error(`Smoke test failed: ${error.message}`);
  } else {
    console.error("Smoke test failed with an unexpected non-error value.");
  }

  process.exitCode = 1;
}

main().catch(reportFailure);
