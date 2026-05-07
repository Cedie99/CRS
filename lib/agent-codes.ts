/**
 * Official Oracle Petroleum agent codes.
 * These are the only valid agent codes that can be assigned to agents.
 */
export const PREDEFINED_AGENT_CODES = [
  "111502", "215016", "109607", "108605", "101603",
  "118115", "118111", "117466", "118120", "121017",
  "121119", "121126", "121127", "121134", "121002",
  "121128", "107604", "121106", "121033", "121028",
  "121034", "319150", "315043", "121094", "121191",
  "121025", "121086", "121139", "317070", "121168",
  "FS001", "SS001",
] as const;

export type AgentCode = typeof PREDEFINED_AGENT_CODES[number];
