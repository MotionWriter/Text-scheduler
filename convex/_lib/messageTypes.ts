export const MESSAGE_TYPES = [
  "reminder",
  "scripture", 
  "discussion",
  "encouragement",
  "prayer",
  "application",
  "general",
] as const;

export type MessageType = typeof MESSAGE_TYPES[number];