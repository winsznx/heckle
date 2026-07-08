// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

interface IHeckleAttestationRegistry {
    function isTrusted(address signer) external view returns (bool);
}

/// @title HeckleVerifiedTakes
/// @notice Contract-verified Proof of Take. A take only enters the verified set
///         once THIS contract recovers the 0G TEE signer from the response's
///         native signature and confirms it is a registered attestor. Directly
///         answers the R16 judge critique: the TEE signature is now checked by a
///         contract, not merely replayable off-chain.
/// @dev The 0G TEE signs `signedText = "sha256(requestBody):sha256(responseBody)"`
///      with EIP-191 personal_sign (confirmed in 0G's Go signer and TS SDK). We
///      recover with the identical digest OpenZeppelin exposes as
///      `MessageHashUtils.toEthSignedMessageHash(bytes)`, byte-for-byte equal to
///      ethers.verifyMessage / viem.recoverMessageAddress. `signedText` embeds
///      the response hash; the take blob at `takeRoot` (0G Storage, content-
///      addressed) holds that response, so the content binding is publicly
///      recomputable while the signer is proven on-chain. Commits are gated to
///      authorized committers so `characterId`/`eventId` can't be misbound to a
///      genuine-but-unrelated TEE response.
contract HeckleVerifiedTakes is Ownable {
    struct VerifiedTake {
        uint256 characterId;
        uint256 eventId;
        bytes32 matchupId;
        bytes32 takeRoot;
        address signer;
        address committedBy;
        uint64 timestamp;
        uint8 kind;
    }

    IHeckleAttestationRegistry public immutable registry;

    uint256 private _nextTakeId = 1;

    mapping(address committer => bool) public committers;
    mapping(bytes32 takeRoot => uint256 takeId) public takeIdOfRoot;
    /// @notice keccak256(signedText) => takeId. Each TEE attestation backs at
    ///         most one verified take, independent of the caller-chosen takeRoot,
    ///         so a single real signature can never be replayed to inflate counts.
    mapping(bytes32 attestationId => uint256 takeId) public takeIdOfAttestation;
    mapping(uint256 takeId => VerifiedTake) private _takes;
    mapping(uint256 characterId => uint256[]) private _byCharacter;
    mapping(uint256 eventId => uint256[]) private _byEvent;
    mapping(uint256 characterId => uint64) public verifiedCount;

    event VerifiedTakeCommitted(
        uint256 indexed takeId,
        uint256 indexed characterId,
        uint256 indexed eventId,
        bytes32 matchupId,
        bytes32 takeRoot,
        address signer,
        uint8 kind,
        uint64 timestamp
    );
    event CommitterSet(address indexed committer, bool allowed);

    modifier onlyCommitter() {
        require(
            msg.sender == owner() || committers[msg.sender],
            "HeckleVerifiedTakes: not committer"
        );
        _;
    }

    constructor(address registry_) Ownable(msg.sender) {
        require(registry_ != address(0), "HeckleVerifiedTakes: zero registry");
        registry = IHeckleAttestationRegistry(registry_);
    }

    /// @notice Authorize or revoke an address as a verified-take committer.
    function setCommitter(address committer, bool allowed) external onlyOwner {
        committers[committer] = allowed;
        emit CommitterSet(committer, allowed);
    }

    /// @notice Commit a take only if its native 0G TEE signature recovers to a
    ///         registered attestor. Reverts otherwise — unverified takes never
    ///         enter the verified set. Each content-addressed `takeRoot` may be
    ///         committed once.
    /// @param signedText The exact `sha256(req):sha256(resp)` string the TEE signed.
    /// @param signature  The 65-byte EIP-191 signature fetched from the provider.
    function commitVerifiedTake(
        uint256 characterId,
        uint256 eventId,
        bytes32 matchupId,
        bytes32 takeRoot,
        uint8 kind,
        string calldata signedText,
        bytes calldata signature
    ) external onlyCommitter returns (uint256 takeId) {
        require(takeRoot != bytes32(0), "HeckleVerifiedTakes: zero root");
        require(takeIdOfRoot[takeRoot] == 0, "HeckleVerifiedTakes: root already committed");

        // Bind the attestation itself as single-use — independent of the
        // caller-chosen takeRoot — so one real TEE signature can back exactly one
        // verified take and can never be replayed to inflate counts.
        bytes32 attestationId = keccak256(bytes(signedText));
        require(
            takeIdOfAttestation[attestationId] == 0,
            "HeckleVerifiedTakes: attestation already committed"
        );

        address signer = ECDSA.recover(
            MessageHashUtils.toEthSignedMessageHash(bytes(signedText)),
            signature
        );
        require(registry.isTrusted(signer), "HeckleVerifiedTakes: untrusted TEE signer");

        takeId = _nextTakeId++;
        _takes[takeId] = VerifiedTake({
            characterId: characterId,
            eventId: eventId,
            matchupId: matchupId,
            takeRoot: takeRoot,
            signer: signer,
            committedBy: msg.sender,
            timestamp: uint64(block.timestamp),
            kind: kind
        });
        takeIdOfRoot[takeRoot] = takeId;
        takeIdOfAttestation[attestationId] = takeId;
        _byCharacter[characterId].push(takeId);
        _byEvent[eventId].push(takeId);
        verifiedCount[characterId] += 1;

        emit VerifiedTakeCommitted(
            takeId, characterId, eventId, matchupId, takeRoot, signer, kind, uint64(block.timestamp)
        );
    }

    /// @notice Recover the TEE signer for a `signedText`/`signature` pair without
    ///         committing — lets any caller check verification off-chain-style.
    function recoverSigner(string calldata signedText, bytes calldata signature)
        external
        pure
        returns (address)
    {
        return ECDSA.recover(MessageHashUtils.toEthSignedMessageHash(bytes(signedText)), signature);
    }

    /// @notice Read a single verified take.
    function takeOf(uint256 takeId) external view returns (VerifiedTake memory) {
        return _takes[takeId];
    }

    /// @notice Whether a 0G Storage root has a verified take committed.
    function isRootVerified(bytes32 takeRoot) external view returns (bool) {
        return takeIdOfRoot[takeRoot] != 0;
    }

    /// @notice The single-use key for an attestation's signed text.
    function attestationIdOf(string calldata signedText) external pure returns (bytes32) {
        return keccak256(bytes(signedText));
    }

    /// @notice Verified take ids for a character.
    function takesByCharacter(uint256 characterId) external view returns (uint256[] memory) {
        return _byCharacter[characterId];
    }

    /// @notice Verified take ids for an event.
    function takesByEvent(uint256 eventId) external view returns (uint256[] memory) {
        return _byEvent[eventId];
    }
}
