// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title HeckleBrackets
/// @notice Append-only registry of user-submitted tournament bracket predictions.
/// @dev A "bracket" is a full prediction set for an event's matchups. The set
///      lives off-chain in 0G Storage; on-chain we commit only its Merkle root
///      (`predictionsRoot`) plus provenance (submitter, timestamp). Anyone may
///      commit, each commit is immutable, and ids increase monotonically from 1.
///      This is the provenance anchor for "this wallet predicted this set at this
///      moment" — no scoring or settlement here (deferred to later rounds).
contract HeckleBrackets {
    struct Bracket {
        uint256 eventId;
        address submitter;
        bytes32 predictionsRoot;
        uint64 timestamp;
    }

    uint256 private _nextBracketId = 1;

    mapping(uint256 bracketId => Bracket) private _brackets;
    mapping(uint256 eventId => uint256[]) private _bracketsByEvent;
    mapping(address submitter => uint256[]) private _bracketsBySubmitter;

    /// @notice Emitted when a bracket prediction set is committed.
    event BracketCommitted(
        uint256 indexed bracketId,
        uint256 indexed eventId,
        address indexed submitter,
        bytes32 predictionsRoot,
        uint64 timestamp
    );

    /// @notice Commit a bracket prediction set for an event. Open to any caller.
    /// @param eventId The event these predictions are for.
    /// @param predictionsRoot 0G Storage Merkle root of the prediction-set blob.
    /// @return bracketId The newly recorded bracket id (ids start at 1).
    function commitBracket(uint256 eventId, bytes32 predictionsRoot)
        external
        returns (uint256 bracketId)
    {
        require(predictionsRoot != bytes32(0), "HeckleBrackets: empty root");

        bracketId = _nextBracketId++;
        uint64 nowTs = uint64(block.timestamp);

        _brackets[bracketId] = Bracket({
            eventId: eventId,
            submitter: msg.sender,
            predictionsRoot: predictionsRoot,
            timestamp: nowTs
        });

        _bracketsByEvent[eventId].push(bracketId);
        _bracketsBySubmitter[msg.sender].push(bracketId);

        emit BracketCommitted(bracketId, eventId, msg.sender, predictionsRoot, nowTs);
    }

    /// @notice Bracket ids committed for an event, in commit order.
    function bracketsByEvent(uint256 eventId) external view returns (uint256[] memory) {
        return _bracketsByEvent[eventId];
    }

    /// @notice Bracket ids committed by a submitter, in commit order.
    function bracketsBySubmitter(address submitter) external view returns (uint256[] memory) {
        return _bracketsBySubmitter[submitter];
    }

    /// @notice Read a single bracket record.
    function bracketOf(uint256 bracketId) external view returns (Bracket memory) {
        return _brackets[bracketId];
    }

    /// @notice Total brackets committed; valid ids run 1..totalBrackets().
    function totalBrackets() external view returns (uint256) {
        return _nextBracketId - 1;
    }
}
