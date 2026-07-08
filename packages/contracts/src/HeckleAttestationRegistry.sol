// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @notice Minimal view of 0G's InferenceServing registry so we can pull a
///         provider's acknowledged TEE signer straight from 0G's own contract.
/// @dev Live on 0G mainnet (chainId 16661) at
///      0x47340d900bdFec2BD393c626E12ea0656F938d84. Struct layout matches
///      InferenceService.Service in 0gfoundation/0g-serving-contract.
interface IInferenceServing {
    struct Service {
        address provider;
        string serviceType;
        string url;
        uint256 inputPrice;
        uint256 outputPrice;
        uint256 updatedAt;
        string model;
        string verifiability;
        string additionalInfo;
        address teeSignerAddress;
        bool teeSignerAcknowledged;
    }

    function getService(address provider) external view returns (Service memory);
}

/// @title HeckleAttestationRegistry
/// @notice The set of TEE signers Heckle trusts to have produced a verified
///         take. Each trusted signer is a 0G Compute provider's on-chain
///         `teeSignerAddress`, so the trust root is 0G's own registry — this
///         contract pins the acknowledged signer(s) so HeckleVerifiedTakes can
///         gate on them in one cheap lookup.
/// @dev Trust model, stated precisely: proving `recover(...) == a registered
///      signer` proves that 0G's *acknowledged* TEE signer produced the exact
///      signed response. It does NOT prove a fresh TDX quote currently backs
///      that key — 0G verifies the quote→address binding off-chain only (no
///      DCAP verifier contract exists on 0G). Revoking a signer never rewrites
///      history: HeckleVerifiedTakes records the recovered signer per take, so
///      past verifications stay auditable.
contract HeckleAttestationRegistry is Ownable {
    struct Attestor {
        bool active;
        address provider;
        string model;
        uint64 registeredAt;
    }

    /// @notice 0G's InferenceServing registry this contract can sync signers from.
    address public immutable ogInferenceServing;

    mapping(address signer => Attestor) private _attestors;
    address[] private _signers;

    event AttestorRegistered(address indexed signer, address indexed provider, string model);
    event AttestorRevoked(address indexed signer);

    /// @param ogInferenceServing_ 0G InferenceServing address (mainnet
    ///        0x47340d900bdFec2BD393c626E12ea0656F938d84).
    constructor(address ogInferenceServing_) Ownable(msg.sender) {
        require(ogInferenceServing_ != address(0), "HeckleAttestationRegistry: zero serving");
        ogInferenceServing = ogInferenceServing_;
    }

    /// @notice Trust a TEE signer we have cross-checked against 0G's registry.
    function registerAttestor(address signer, address provider, string calldata model)
        external
        onlyOwner
    {
        require(signer != address(0), "HeckleAttestationRegistry: zero signer");
        _record(signer, provider, model);
    }

    /// @notice Pull a provider's acknowledged TEE signer directly from 0G's
    ///         on-chain InferenceServing registry and trust it. This roots the
    ///         trust set in 0G's own contract rather than an admin assertion.
    function syncFromOG(address provider) external onlyOwner returns (address signer) {
        IInferenceServing.Service memory svc =
            IInferenceServing(ogInferenceServing).getService(provider);
        require(svc.teeSignerAcknowledged, "HeckleAttestationRegistry: signer not acknowledged");
        require(svc.teeSignerAddress != address(0), "HeckleAttestationRegistry: zero signer");
        signer = svc.teeSignerAddress;
        _record(signer, provider, svc.model);
    }

    /// @notice Stop trusting a signer for NEW commits. Does not touch history.
    function revokeAttestor(address signer) external onlyOwner {
        _attestors[signer].active = false;
        emit AttestorRevoked(signer);
    }

    /// @notice Whether a recovered signer is currently a trusted attestor.
    function isTrusted(address signer) external view returns (bool) {
        return _attestors[signer].active;
    }

    /// @notice Full attestor record for a signer.
    function attestorOf(address signer) external view returns (Attestor memory) {
        return _attestors[signer];
    }

    /// @notice Every signer ever registered (active or revoked).
    function signers() external view returns (address[] memory) {
        return _signers;
    }

    function _record(address signer, address provider, string memory model) private {
        Attestor storage a = _attestors[signer];
        if (a.registeredAt == 0) {
            _signers.push(signer);
        }
        a.active = true;
        a.provider = provider;
        a.model = model;
        a.registeredAt = uint64(block.timestamp);
        emit AttestorRegistered(signer, provider, model);
    }
}
