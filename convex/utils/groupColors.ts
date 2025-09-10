export const GROUP_COLORS = [
  "#4F4F51", // Primary
  "#A1A094", // Secondary
  "#A8B8C0", // Sea Salt
  "#B9D2D2", // Sea Glass
  "#D8C6B5", // Driftwood
  "#6B7280", // Slate
  "#7C8A55", // Olive
  "#8B4F4F", // Maroon
  "#3B82F6", // Blue (fallback/default used in UI)
];

export function chooseGroupColor(existingColors: (string | undefined)[]): string {
  const used = new Set(
    existingColors
      .filter((c): c is string => !!c)
      .map((c) => c.toLowerCase())
  );
  const found = GROUP_COLORS.find((c) => !used.has(c.toLowerCase()));
  return found ?? GROUP_COLORS[0];
}

