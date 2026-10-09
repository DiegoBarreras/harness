import { TypeSafeClient } from "@typesafe-ai/sdk";

export function createTypeSafeClient(): TypeSafeClient {
  return new TypeSafeClient({ defaultModel: "jev-latest" });
}
