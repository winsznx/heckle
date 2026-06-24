// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title HeckleTakes
/// @notice Records character "takes" (AI-generated reactions/predictions) and a
///         lightweight on-chain reputation derived from them.
/// @dev Group-stage scope: takes are committed by the owner or authorized
///      off-chain committers (the agent backend) as 0G Storage roots
///      (`takeRoot`). Reputation is a simple, gas-cheap aggregate; richer
///      weighting and on-chain voting are deferred to later rounds.
contract HeckleTakes is Ownable {
    struct Take {
        uint256 characterId;
        uint256 eventId;
        bytes32 takeRoot;
        uint64 timestamp;
        uint8 kind;
    }

    struct Reputation {
        uint64 takesGenerated;
        uint64 votesReceived;
        uint64 predictionsCorrect;
        uint64 predictionsTotal;
        uint256 weightedScore;
        uint64 firstTakeAt;
        uint64 lastTakeAt;
    }

    uint256 private _nextTakeId = 1;

    mapping(address committer => bool) public committers;

    mapping(uint256 takeId => Take) private _takes;
    mapping(uint256 eventId => uint256[]) private _takesByEvent;
    mapping(uint256 characterId => uint256[]) private _takesByCharacter;
    mapping(uint256 characterId => Reputation) private _rep;

    /// @notice Emitted when a take is committed for a character.
    event TakeCommitted(
        uint256 indexed takeId,
        uint256 indexed characterId,
        uint256 indexed eventId,
        bytes32 takeRoot,
        uint8 kind,
        uint64 timestamp
    );

    /// @notice Emitted when a committer is authorized or revoked.
    event CommitterSet(address indexed committer, bool allowed);

    /// @notice Emitted when a character's prediction is graded.
    event PredictionGraded(uint256 indexed characterId, bool correct, uint256 weightedScore);

    modifier onlyCommitter() {
        require(msg.sender == owner() || committers[msg.sender], "HeckleTakes: not committer");
        _;
    }

    constructor() Ownable(msg.sender) {}

    /// @notice Authorize or revoke an address as a take committer.
    function setCommitter(address committer, bool allowed) external onlyOwner {
        committers[committer] = allowed;
        emit CommitterSet(committer, allowed);
    }

    /// @notice Commit a take for a character at an event.
    /// @return takeId The newly recorded take id (ids start at 1).
    function commitTake(uint256 characterId, uint256 eventId, bytes32 takeRoot, uint8 kind)
        external
        onlyCommitter
        returns (uint256 takeId)
    {
        takeId = _nextTakeId++;
        uint64 nowTs = uint64(block.timestamp);

        _takes[takeId] = Take({
            characterId: characterId,
            eventId: eventId,
            takeRoot: takeRoot,
            timestamp: nowTs,
            kind: kind
        });

        _takesByEvent[eventId].push(takeId);
        _takesByCharacter[characterId].push(takeId);

        Reputation storage rep = _rep[characterId];
        rep.takesGenerated++;
        if (rep.firstTakeAt == 0) {
            rep.firstTakeAt = nowTs;
        }
        rep.lastTakeAt = nowTs;

        emit TakeCommitted(takeId, characterId, eventId, takeRoot, kind, nowTs);
    }

    /// @notice Grade a character's prediction and recompute its weighted score.
    function gradePrediction(uint256 characterId, bool correct) external onlyCommitter {
        Reputation storage rep = _rep[characterId];
        rep.predictionsTotal++;
        if (correct) {
            rep.predictionsCorrect++;
        }

        rep.weightedScore = isqrt(
            uint256(rep.takesGenerated) * 1e18 + uint256(rep.predictionsCorrect) * 4e18
        );

        emit PredictionGraded(characterId, correct, rep.weightedScore);
    }

    /// @notice Take ids recorded for an event.
    function takesByEvent(uint256 eventId) external view returns (uint256[] memory) {
        return _takesByEvent[eventId];
    }

    /// @notice Take ids recorded for a character.
    function takesByCharacter(uint256 characterId) external view returns (uint256[] memory) {
        return _takesByCharacter[characterId];
    }

    /// @notice Read a single take record.
    function takeOf(uint256 takeId) external view returns (Take memory) {
        return _takes[takeId];
    }

    /// @notice Read a character's reputation aggregate.
    function reputationOf(uint256 characterId) external view returns (Reputation memory) {
        return _rep[characterId];
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
