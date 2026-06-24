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
