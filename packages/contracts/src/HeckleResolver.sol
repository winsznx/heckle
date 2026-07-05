// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @title HeckleResolver
/// @notice On-chain record of real-world event outcomes (e.g. World Cup matches),
///         so a Proof of Take can be settled against an auditable result instead
///         of a trusted off-chain claim. A single resolver publishes outcomes
///         sourced from a public data feed (football-data.org); anyone can read
///         and verify them. A result is write-once once finalized — corrections
///         are only possible while it is still provisional (not finalized).
/// @dev    Standalone and dependency-free. `matchId` is the external feed's id,
///         so a result maps 1:1 to a fixture without any internal registry.
contract HeckleResolver {
    enum Outcome {
        UNRESOLVED,
        HOME,
        AWAY,
        DRAW
    }

    struct Result {
        Outcome outcome;
        uint16 homeScore;
        uint16 awayScore;
        uint64 resolvedAt;
        bool finalized;
    }

    address public resolver;

    mapping(uint256 matchId => Result) public results;

    event Resolved(
        uint256 indexed matchId,
        Outcome outcome,
        uint16 homeScore,
        uint16 awayScore,
        bool finalized
    );
    event ResolverTransferred(address indexed from, address indexed to);

    error NotResolver();
    error AlreadyFinalized();
    error BadOutcome();
    error LengthMismatch();
    error ZeroResolver();

    constructor(address resolver_) {
        resolver = resolver_ == address(0) ? msg.sender : resolver_;
    }

    modifier onlyResolver() {
        if (msg.sender != resolver) revert NotResolver();
        _;
    }

    /// @notice Publish or update a match outcome. Immutable once finalized.
    /// @param finalized Set true only when the match is FINISHED and settled.
    function resolve(
        uint256 matchId,
        Outcome outcome,
        uint16 homeScore,
        uint16 awayScore,
        bool finalized
    ) external onlyResolver {
        _resolve(matchId, outcome, homeScore, awayScore, finalized);
    }

    /// @notice Resolve many matches in one transaction. Entries that are already
    ///         finalized, or carry an UNRESOLVED outcome, are skipped rather than
    ///         reverting, so a batch stays idempotent across repeated feed polls.
    function resolveBatch(
        uint256[] calldata matchIds,
        Outcome[] calldata outcomes,
        uint16[] calldata homeScores,
        uint16[] calldata awayScores,
        bool[] calldata finalizedFlags
    ) external onlyResolver {
        uint256 n = matchIds.length;
        if (
            outcomes.length != n ||
            homeScores.length != n ||
            awayScores.length != n ||
            finalizedFlags.length != n
        ) revert LengthMismatch();

        for (uint256 i = 0; i < n; i++) {
            if (results[matchIds[i]].finalized) continue;
            if (outcomes[i] == Outcome.UNRESOLVED) continue;
            _resolve(matchIds[i], outcomes[i], homeScores[i], awayScores[i], finalizedFlags[i]);
        }
    }

    function _resolve(
        uint256 matchId,
        Outcome outcome,
        uint16 homeScore,
        uint16 awayScore,
        bool finalized
    ) internal {
        if (outcome == Outcome.UNRESOLVED) revert BadOutcome();
        Result storage r = results[matchId];
        if (r.finalized) revert AlreadyFinalized();
        r.outcome = outcome;
        r.homeScore = homeScore;
        r.awayScore = awayScore;
        r.resolvedAt = uint64(block.timestamp);
        r.finalized = finalized;
        emit Resolved(matchId, outcome, homeScore, awayScore, finalized);
    }

    /// @notice Grade a prediction against a finalized result.
    /// @return graded  True only if the match is finalized (grade is meaningful).
    /// @return correct True if `predictedOutcome` equals the final outcome.
    function grade(uint256 matchId, Outcome predictedOutcome)
        external
        view
        returns (bool graded, bool correct)
    {
        Result memory r = results[matchId];
        if (!r.finalized) return (false, false);
        return (true, r.outcome == predictedOutcome);
    }

    function isFinalized(uint256 matchId) external view returns (bool) {
        return results[matchId].finalized;
    }

    function transferResolver(address to) external onlyResolver {
        if (to == address(0)) revert ZeroResolver();
        emit ResolverTransferred(resolver, to);
        resolver = to;
    }
}
