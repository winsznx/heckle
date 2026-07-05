// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IHeckleCharacters {
    function ownerOf(uint256 tokenId) external view returns (address);
}

interface IHeckleTakes {
    struct Reputation {
        uint64 takesGenerated;
        uint64 votesReceived;
        uint64 predictionsCorrect;
        uint64 predictionsTotal;
        uint256 weightedScore;
        uint64 firstTakeAt;
        uint64 lastTakeAt;
    }

    function reputationOf(uint256 characterId) external view returns (Reputation memory);
}

/// @title HeckleVotes
/// @notice Sqrt-weighted upvoting on takes. A vote's weight scales with the
///         square root of the voting character's earned reputation, so proven
///         foresight counts for more without letting whales dominate. One vote
///         per (character, take); the caller must own the voting character.
/// @dev Standalone (HeckleTakes is immutable) — reads reputation + ownership by
///      interface, never mutates them. Deployed with the live HeckleCharacters
///      and HeckleTakes addresses.
contract HeckleVotes {
    IHeckleCharacters public immutable characters;
    IHeckleTakes public immutable takes;

    mapping(uint256 takeId => uint256 weight) public votesOf;
    mapping(uint256 takeId => mapping(uint256 voterCharacterId => bool)) public hasVoted;

    /// @notice Emitted when a character upvotes a take.
    event TakeVoted(
        uint256 indexed takeId,
        uint256 indexed voterCharacterId,
        address indexed voter,
        uint256 weight,
        uint256 newTotal
    );

    constructor(address charactersAddr, address takesAddr) {
        characters = IHeckleCharacters(charactersAddr);
        takes = IHeckleTakes(takesAddr);
    }

    /// @notice Upvote a take as one of your characters.
    /// @return weight The sqrt-weighted vote applied (>= 1).
    function voteTake(uint256 takeId, uint256 voterCharacterId)
        external
        returns (uint256 weight)
    {
        require(
            characters.ownerOf(voterCharacterId) == msg.sender,
            "HeckleVotes: not your character"
        );
        require(!hasVoted[takeId][voterCharacterId], "HeckleVotes: already voted");

        // Floor of 1 so a fresh character still counts; proven ones count for more.
        weight = isqrt(takes.reputationOf(voterCharacterId).weightedScore) + 1;

        hasVoted[takeId][voterCharacterId] = true;
        votesOf[takeId] += weight;

        emit TakeVoted(takeId, voterCharacterId, msg.sender, weight, votesOf[takeId]);
    }

    /// @notice Integer square root (Babylonian method).
    function isqrt(uint256 x) internal pure returns (uint256 y) {
        if (x == 0) {
            return 0;
        }
        uint256 z = (x + 1) / 2;
        y = x;
        while (z < y) {
            y = z;
            z = (x / z + z) / 2;
        }
    }
}
