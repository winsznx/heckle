/**
 * Minimal human-readable ABIs for the Heckle contracts the agent touches.
 * Only the functions/events the off-chain agent + seed scripts call are listed.
 */

export const HECKLE_EVENTS_ABI = [
  "event CharacterAttached(uint256 indexed eventId, uint256 indexed characterId, address indexed owner)",
  "event EventRegistered(uint256 indexed eventId, bytes32 eventRoot, uint64 startsAt, uint64 endsAt, address indexed curator)",
  "event StatusChanged(uint256 indexed eventId, uint8 status)",
  "function attachmentsOf(uint256 eventId) view returns (uint256[])",
  "function eventOf(uint256 eventId) view returns (tuple(bytes32 eventRoot, uint64 startsAt, uint64 endsAt, uint8 status, address curator))",
  "function registerEvent(bytes32 eventRoot, uint64 startsAt, uint64 endsAt) returns (uint256 eventId)",
  "function setStatus(uint256 eventId, uint8 status)",
  "function attachCharacter(uint256 eventId, uint256 characterId)",
] as const;

export const HECKLE_CHARACTERS_ABI = [
  "event CharacterMinted(uint256 indexed tokenId, address indexed owner, uint8 archetype, bytes32 personalityRoot)",
  "function characterOf(uint256 tokenId) view returns (tuple(uint8 archetype, string handle, bytes32 personalityRoot, address creator, uint64 createdAt))",
  "function tokenURI(uint256 tokenId) view returns (string)",
  "function totalMinted() view returns (uint256)",
  "function mint(string tokenURI_, uint8 archetype, string handle, bytes32 personalityRoot) returns (uint256 tokenId)",
] as const;

export const HECKLE_TAKES_ABI = [
  "event TakeCommitted(uint256 indexed takeId, uint256 indexed characterId, uint256 indexed eventId, bytes32 takeRoot, uint8 kind, uint64 timestamp)",
  "event PredictionGraded(uint256 indexed characterId, bool correct, uint256 weightedScore)",
  "function commitTake(uint256 characterId, uint256 eventId, bytes32 takeRoot, uint8 kind) returns (uint256 takeId)",
  "function gradePrediction(uint256 characterId, bool correct)",
  "function reputationOf(uint256 characterId) view returns (tuple(uint64 takesGenerated, uint64 votesReceived, uint64 predictionsCorrect, uint64 predictionsTotal, uint256 weightedScore, uint64 firstTakeAt, uint64 lastTakeAt))",
] as const;

export const HECKLE_VERIFIED_TAKES_ABI = [
  "event VerifiedTakeCommitted(uint256 indexed takeId, uint256 indexed characterId, uint256 indexed eventId, bytes32 matchupId, bytes32 takeRoot, address signer, uint8 kind, uint64 timestamp)",
  "function commitVerifiedTake(uint256 characterId, uint256 eventId, bytes32 matchupId, bytes32 takeRoot, uint8 kind, string signedText, bytes signature) returns (uint256 takeId)",
  "function isRootVerified(bytes32 takeRoot) view returns (bool)",
  "function takeIdOfRoot(bytes32 takeRoot) view returns (uint256)",
  "function verifiedCount(uint256 characterId) view returns (uint64)",
  "function recoverSigner(string signedText, bytes signature) view returns (address)",
] as const;

export const HECKLE_INFT_ABI = [
  "event CharacterMinted(uint256 indexed tokenId, address indexed owner, uint8 archetype, bytes32 dataHash)",
  "function migrateMint(uint256 tokenId, address to, uint8 archetype, string handle, string name, string tokenURI_, (string dataDescription, bytes32 dataHash) initialData)",
  "function sealMigration()",
  "function migrationSealed() view returns (bool)",
  "function ownerOf(uint256 tokenId) view returns (address)",
  "function characterOf(uint256 tokenId) view returns (tuple(uint8 archetype, string handle, string name, address creator, uint64 createdAt))",
  "function intelligentDatasOf(uint256 tokenId) view returns (tuple(string dataDescription, bytes32 dataHash)[])",
  "function totalMinted() view returns (uint256)",
] as const;

export const HECKLE_ATTESTATION_REGISTRY_ABI = [
  "event AttestorRegistered(address indexed signer, address indexed provider, string model)",
  "function isTrusted(address signer) view returns (bool)",
  "function registerAttestor(address signer, address provider, string model)",
  "function syncFromOG(address provider) returns (address signer)",
] as const;

export const HECKLE_BRACKETS_ABI = [
  "event BracketCommitted(uint256 indexed bracketId, uint256 indexed eventId, address indexed submitter, bytes32 predictionsRoot, uint64 timestamp)",
  "function commitBracket(uint256 eventId, bytes32 predictionsRoot) returns (uint256 bracketId)",
  "function bracketsByEvent(uint256 eventId) view returns (uint256[])",
  "function bracketsBySubmitter(address submitter) view returns (uint256[])",
  "function bracketOf(uint256 bracketId) view returns (tuple(uint256 eventId, address submitter, bytes32 predictionsRoot, uint64 timestamp))",
  "function totalBrackets() view returns (uint256)",
] as const;

export const HECKLE_RESOLVER_ABI = [
  "event Resolved(uint256 indexed matchId, uint8 outcome, uint16 homeScore, uint16 awayScore, bool finalized)",
  "function resolver() view returns (address)",
  "function results(uint256 matchId) view returns (uint8 outcome, uint16 homeScore, uint16 awayScore, uint64 resolvedAt, bool finalized)",
  "function resolve(uint256 matchId, uint8 outcome, uint16 homeScore, uint16 awayScore, bool finalized)",
  "function resolveBatch(uint256[] matchIds, uint8[] outcomes, uint16[] homeScores, uint16[] awayScores, bool[] finalizedFlags)",
] as const;
