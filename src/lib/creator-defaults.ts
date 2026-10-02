export const DEFAULT_LAB_POINTS = 100;
export const DEFAULT_LAB_USER = "ronak";

export const DEFAULT_COMMAND_BLACKLIST = [
  "sudo",
  "rm -rf",
  "shutdown",
] as const;

export function learningLabPoints(value: unknown): number {
  // Existing blocks did not have a points property.
  if (value === undefined) return DEFAULT_LAB_POINTS;

  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0 ||
    value > 1_000_000
  ) {
    throw new Error("Lab points must be an integer between 0 and 1000000.");
  }

  return value;
}
