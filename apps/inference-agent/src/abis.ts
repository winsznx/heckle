/**
 * Minimal human-readable ABIs for the Heckle contracts the agent touches.
 * Only the functions/events the off-chain agent + seed script call are listed.
 */

export const HECKLE_EVENTS_ABI = [
  "event CharacterAttached(uint256 indexed eventId, uint256 indexed characterId, address indexed owner)",
  "event EventRegistered(uint256 indexed eventId, bytes32 eventRoot, uint64 startsAt, uint64 endsAt, address indexed curator)",
  "event StatusChanged(uint256 indexed eventId, uint8 status)",
  "function attachmentsOf(uint256 eventId) view returns (uint256[])",
  "function registerEvent(bytes32 eventRoot, uint64 startsAt, uint64 endsAt) returns (uint256 eventId)",
  "function setStatus(uint256 eventId, uint8 status)",
  "function attachCharacter(uint256 eventId, uint256 characterId)",
] as const;

export const HECKLE_CHARACTERS_ABI = [
  "event CharacterMinted(uint256 indexed tokenId, address indexed owner, uint8 archetype, bytes32 personalityRoot)",
  "function characterOf(uint256 tokenId) view returns (uint8 archetype, string handle, bytes32 personalityRoot, address creator, uint64 createdAt)",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function mint(string tokenURI_, uint8 archetype, string handle, bytes32 personalityRoot) returns (uint256 tokenId)",
] as const;

export const HECKLE_TAKES_ABI = [
  "event TakeCommitted(uint256 indexed takeId, uint256 indexed characterId, uint256 indexed eventId, bytes32 takeRoot, uint8 kind, uint64 timestamp)",
  "event PredictionGraded(uint256 indexed characterId, bool correct, uint256 weightedScore)",
  "function commitTake(uint256 characterId, uint256 eventId, bytes32 takeRoot, uint8 kind) returns (uint256 takeId)",
  "function gradePrediction(uint256 characterId, bool correct)",
] as const;
