import { mockParsePrd } from "./mockParsePrd";

export async function parsePrd(sourceText: string) {
  // TODO: Swap this for OpenAI structured output once the demo path is stable.
  return mockParsePrd(sourceText);
}
