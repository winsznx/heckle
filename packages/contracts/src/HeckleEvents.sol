// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title HeckleEvents
/// @notice Registry of curated events that Heckle characters attach to.
/// @dev Group-stage scope: event registration, lifecycle status, and character
///      attachment. `eventRoot` is a 0G Storage Merkle root committing to the
///      event's off-chain context payload.
contract HeckleEvents is Ownable {
    enum Status {
        Upcoming,
        Live,
        Settling,
        Settled
    }

    struct Event {
        bytes32 eventRoot;
        uint64 startsAt;
        uint64 endsAt;
        Status status;
        address curator;
    }

    uint256 private _nextEventId = 1;

    mapping(uint256 eventId => Event) private _events;
    mapping(uint256 eventId => uint256[]) private _attachments;
    mapping(uint256 eventId => mapping(uint256 characterId => bool)) private _attached;

    /// @notice Emitted when a new event is registered.
    event EventRegistered(
        uint256 indexed eventId,
        bytes32 eventRoot,
        uint64 startsAt,
        uint64 endsAt,
        address indexed curator
    );

    /// @notice Emitted when an event's lifecycle status changes.
    event StatusChanged(uint256 indexed eventId, Status status);

    /// @notice Emitted when a character is attached to an event.
    event CharacterAttached(
        uint256 indexed eventId,
        uint256 indexed characterId,
        address indexed owner
    );

    constructor() Ownable(msg.sender) {}

    /// @notice Register a new event. Curated by the contract owner.
    /// @return eventId The newly registered event id (ids start at 1).
    function registerEvent(bytes32 eventRoot, uint64 startsAt, uint64 endsAt)
        external
        onlyOwner
        returns (uint256 eventId)
    {
        eventId = _nextEventId++;

        _events[eventId] = Event({
            eventRoot: eventRoot,
            startsAt: startsAt,
            endsAt: endsAt,
            status: Status.Upcoming,
            curator: msg.sender
        });

        emit EventRegistered(eventId, eventRoot, startsAt, endsAt, msg.sender);
    }

    /// @notice Advance or set an event's lifecycle status.
    function setStatus(uint256 eventId, Status status) external onlyOwner {
        require(_exists(eventId), "HeckleEvents: unknown event");
        _events[eventId].status = status;
        emit StatusChanged(eventId, status);
    }

    /// @notice Attach a character to an event. Open to anyone.
    /// @dev Idempotency is enforced: a character may be attached to a given
    ///      event at most once.
    function attachCharacter(uint256 eventId, uint256 characterId) external {
        require(_exists(eventId), "HeckleEvents: unknown event");
        require(!_attached[eventId][characterId], "HeckleEvents: already attached");

        _attached[eventId][characterId] = true;
        _attachments[eventId].push(characterId);

        emit CharacterAttached(eventId, characterId, msg.sender);
    }

    /// @notice All character ids attached to an event.
    function attachmentsOf(uint256 eventId) external view returns (uint256[] memory) {
        return _attachments[eventId];
    }

    /// @notice Read the full event record.
    function eventOf(uint256 eventId) external view returns (Event memory) {
        require(_exists(eventId), "HeckleEvents: unknown event");
        return _events[eventId];
    }

    function _exists(uint256 eventId) internal view returns (bool) {
        return _events[eventId].curator != address(0);
    }
}
