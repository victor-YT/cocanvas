export async function readJsonBody(request: Request) {
  try {
    const value = (await request.json()) as unknown;

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return value as Record<string, unknown>;
  } catch {
    return {};
  }
}

export function readStringField(
  body: Record<string, unknown>,
  key: string,
  fallback = "",
) {
  const value = body[key];
  return typeof value === "string" ? value : fallback;
}
