export const heckleCharactersAbi = [
  {
    type: "event",
    name: "CharacterMinted",
    inputs: [
      { name: "tokenId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
      { name: "archetype", type: "uint8", indexed: false },
      { name: "personalityRoot", type: "bytes32", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "mint",
    stateMutability: "nonpayable",
    inputs: [
      { name: "tokenURI_", type: "string" },
      { name: "archetype", type: "uint8" },
      { name: "handle", type: "string" },
      { name: "personalityRoot", type: "bytes32" },
    ],
    outputs: [{ name: "tokenId", type: "uint256" }],
  },
  {
    type: "function",
    name: "characterOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "archetype", type: "uint8" },
          { name: "handle", type: "string" },
          { name: "personalityRoot", type: "bytes32" },
          { name: "creator", type: "address" },
          { name: "createdAt", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "tokenURI",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "string" }],
  },
  {
    type: "function",
    name: "ownerOf",
    stateMutability: "view",
    inputs: [{ name: "tokenId", type: "uint256" }],
    outputs: [{ name: "", type: "address" }],
  },
  {
    type: "function",
    name: "balanceOf",
    stateMutability: "view",
    inputs: [{ name: "owner", type: "address" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "totalMinted",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "safeTransferFrom",
    stateMutability: "nonpayable",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "tokenId", type: "uint256" },
    ],
    outputs: [],
  },
] as const;

export const heckleEventsAbi = [
  {
    type: "event",
    name: "CharacterAttached",
    inputs: [
      { name: "eventId", type: "uint256", indexed: true },
      { name: "characterId", type: "uint256", indexed: true },
      { name: "owner", type: "address", indexed: true },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "attachCharacter",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "characterId", type: "uint256" },
    ],
    outputs: [],
  },
  {
    type: "function",
    name: "attachmentsOf",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "eventOf",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "eventRoot", type: "bytes32" },
          { name: "startsAt", type: "uint64" },
          { name: "endsAt", type: "uint64" },
          { name: "status", type: "uint8" },
          { name: "curator", type: "address" },
        ],
      },
    ],
  },
] as const;

export const heckleTakesAbi = [
  {
    type: "event",
    name: "TakeCommitted",
    inputs: [
      { name: "takeId", type: "uint256", indexed: true },
      { name: "characterId", type: "uint256", indexed: true },
      { name: "eventId", type: "uint256", indexed: true },
      { name: "takeRoot", type: "bytes32", indexed: false },
      { name: "kind", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "takesByEvent",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "takeOf",
    stateMutability: "view",
    inputs: [{ name: "takeId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "characterId", type: "uint256" },
          { name: "eventId", type: "uint256" },
          { name: "takeRoot", type: "bytes32" },
          { name: "timestamp", type: "uint64" },
          { name: "kind", type: "uint8" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "reputationOf",
    stateMutability: "view",
    inputs: [{ name: "characterId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "takesGenerated", type: "uint64" },
          { name: "votesReceived", type: "uint64" },
          { name: "predictionsCorrect", type: "uint64" },
          { name: "predictionsTotal", type: "uint64" },
          { name: "weightedScore", type: "uint256" },
          { name: "firstTakeAt", type: "uint64" },
          { name: "lastTakeAt", type: "uint64" },
        ],
      },
    ],
  },
] as const;

export const heckleVerifiedTakesAbi = [
  {
    type: "event",
    name: "VerifiedTakeCommitted",
    inputs: [
      { name: "takeId", type: "uint256", indexed: true },
      { name: "characterId", type: "uint256", indexed: true },
      { name: "eventId", type: "uint256", indexed: true },
      { name: "matchupId", type: "bytes32", indexed: false },
      { name: "takeRoot", type: "bytes32", indexed: false },
      { name: "signer", type: "address", indexed: false },
      { name: "kind", type: "uint8", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "isRootVerified",
    stateMutability: "view",
    inputs: [{ name: "takeRoot", type: "bytes32" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "verifiedCount",
    stateMutability: "view",
    inputs: [{ name: "characterId", type: "uint256" }],
    outputs: [{ name: "", type: "uint64" }],
  },
] as const;

export const heckleBracketsAbi = [
  {
    type: "event",
    name: "BracketCommitted",
    inputs: [
      { name: "bracketId", type: "uint256", indexed: true },
      { name: "eventId", type: "uint256", indexed: true },
      { name: "submitter", type: "address", indexed: true },
      { name: "predictionsRoot", type: "bytes32", indexed: false },
      { name: "timestamp", type: "uint64", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "commitBracket",
    stateMutability: "nonpayable",
    inputs: [
      { name: "eventId", type: "uint256" },
      { name: "predictionsRoot", type: "bytes32" },
    ],
    outputs: [{ name: "bracketId", type: "uint256" }],
  },
  {
    type: "function",
    name: "bracketsByEvent",
    stateMutability: "view",
    inputs: [{ name: "eventId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "bracketsBySubmitter",
    stateMutability: "view",
    inputs: [{ name: "submitter", type: "address" }],
    outputs: [{ name: "", type: "uint256[]" }],
  },
  {
    type: "function",
    name: "bracketOf",
    stateMutability: "view",
    inputs: [{ name: "bracketId", type: "uint256" }],
    outputs: [
      {
        name: "",
        type: "tuple",
        components: [
          { name: "eventId", type: "uint256" },
          { name: "submitter", type: "address" },
          { name: "predictionsRoot", type: "bytes32" },
          { name: "timestamp", type: "uint64" },
        ],
      },
    ],
  },
  {
    type: "function",
    name: "totalBrackets",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export const heckleVotesAbi = [
  {
    type: "event",
    name: "TakeVoted",
    inputs: [
      { name: "takeId", type: "uint256", indexed: true },
      { name: "voterCharacterId", type: "uint256", indexed: true },
      { name: "voter", type: "address", indexed: true },
      { name: "weight", type: "uint256", indexed: false },
      { name: "newTotal", type: "uint256", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "voteTake",
    stateMutability: "nonpayable",
    inputs: [
      { name: "takeId", type: "uint256" },
      { name: "voterCharacterId", type: "uint256" },
    ],
    outputs: [{ name: "weight", type: "uint256" }],
  },
  {
    type: "function",
    name: "votesOf",
    stateMutability: "view",
    inputs: [{ name: "takeId", type: "uint256" }],
    outputs: [{ name: "", type: "uint256" }],
  },
  {
    type: "function",
    name: "hasVoted",
    stateMutability: "view",
    inputs: [
      { name: "takeId", type: "uint256" },
      { name: "voterCharacterId", type: "uint256" },
    ],
    outputs: [{ name: "", type: "bool" }],
  },
] as const;

export const heckleResolverAbi = [
  {
    type: "event",
    name: "Resolved",
    inputs: [
      { name: "matchId", type: "uint256", indexed: true },
      { name: "outcome", type: "uint8", indexed: false },
      { name: "homeScore", type: "uint16", indexed: false },
      { name: "awayScore", type: "uint16", indexed: false },
      { name: "finalized", type: "bool", indexed: false },
    ],
    anonymous: false,
  },
  {
    type: "function",
    name: "results",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [
      { name: "outcome", type: "uint8" },
      { name: "homeScore", type: "uint16" },
      { name: "awayScore", type: "uint16" },
      { name: "resolvedAt", type: "uint64" },
      { name: "finalized", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "grade",
    stateMutability: "view",
    inputs: [
      { name: "matchId", type: "uint256" },
      { name: "predictedOutcome", type: "uint8" },
    ],
    outputs: [
      { name: "graded", type: "bool" },
      { name: "correct", type: "bool" },
    ],
  },
  {
    type: "function",
    name: "isFinalized",
    stateMutability: "view",
    inputs: [{ name: "matchId", type: "uint256" }],
    outputs: [{ name: "", type: "bool" }],
  },
  {
    type: "function",
    name: "resolver",
    stateMutability: "view",
    inputs: [],
    outputs: [{ name: "", type: "address" }],
  },
] as const;
