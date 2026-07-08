// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {
    IERC7857DataVerifier,
    TransferValidityProof,
    TransferValidityProofOutput,
    AccessProof,
    OwnershipProof,
    OracleType
} from "./IERC7857.sol";

/// @title HeckleDataVerifier
/// @notice ERC-7857 transfer-validity verifier for Heckle INFTs. Per
///         intelligent-data entry it checks: (1) the receiver (or their
///         delegate) signed consent over the dataHash, and (2) a registered TEE
///         oracle attested that the data key was re-sealed to the receiver. The
///         EIP-191 digest formats match 0G Labs' reference verifier byte-for-byte.
/// @dev Trust model, stated precisely: the oracle attestation reduces on-chain to
///      `recover(...) == teeOracle`. That proves the configured oracle signed the
///      re-encryption — NOT that a fresh hardware quote backs it. 0G's own shipped
///      verifier makes the identical trusted-oracle assumption (its ZKP path is an
///      unimplemented stub). Proof nonces are single-use (replay protection).
contract HeckleDataVerifier is IERC7857DataVerifier, Ownable {
    address public teeOracle;
    mapping(bytes32 nonceKey => bool used) public usedProof;

    event OracleUpdated(address indexed oldOracle, address indexed newOracle);

    error InvalidOracle();
    error DataHashMismatch();
    error InvalidAccessAssistant();
    error InvalidOwnershipProof();
    error ProofReplayed();

    constructor(address teeOracle_) Ownable(msg.sender) {
        if (teeOracle_ == address(0)) revert InvalidOracle();
        teeOracle = teeOracle_;
    }

    /// @notice Rotate the trusted TEE oracle signer.
    function setTeeOracle(address newOracle) external onlyOwner {
        if (newOracle == address(0)) revert InvalidOracle();
        emit OracleUpdated(teeOracle, newOracle);
        teeOracle = newOracle;
    }

    /// @inheritdoc IERC7857DataVerifier
    function verifyTransferValidity(TransferValidityProof[] calldata proofs)
        external
        override
        returns (TransferValidityProofOutput[] memory outputs)
    {
        outputs = new TransferValidityProofOutput[](proofs.length);
        for (uint256 i = 0; i < proofs.length; i++) {
            outputs[i] = _process(proofs[i]);
            _markUsed(_nonceKey(outputs[i].accessProofNonce));
            _markUsed(_nonceKey(outputs[i].ownershipProofNonce));
        }
    }

    function _process(TransferValidityProof calldata proof)
        private
        view
        returns (TransferValidityProofOutput memory output)
    {
        if (proof.accessProof.dataHash != proof.ownershipProof.dataHash) revert DataHashMismatch();

        output.dataHash = proof.accessProof.dataHash;
        output.wantedKey = proof.accessProof.targetPubkey;
        output.accessProofNonce = proof.accessProof.nonce;
        output.targetPubkey = proof.ownershipProof.targetPubkey;
        output.sealedKey = proof.ownershipProof.sealedKey;
        output.ownershipProofNonce = proof.ownershipProof.nonce;

        output.accessAssistant = _recoverAccess(proof.accessProof);
        if (!_verifyOwnership(proof.ownershipProof)) revert InvalidOwnershipProof();
    }

    function _recoverAccess(AccessProof calldata ap) private pure returns (address assistant) {
        bytes32 digest = _ethHex(keccak256(abi.encodePacked(ap.dataHash, ap.targetPubkey, ap.nonce)));
        assistant = ECDSA.recover(digest, ap.proof);
        if (assistant == address(0)) revert InvalidAccessAssistant();
    }

    function _verifyOwnership(OwnershipProof calldata op) private view returns (bool) {
        if (op.oracleType != OracleType.TEE) return false; // ZKP reserved
        bytes32 digest =
            _ethHex(keccak256(abi.encodePacked(op.dataHash, op.sealedKey, op.targetPubkey, op.nonce)));
        return ECDSA.recover(digest, op.proof) == teeOracle;
    }

    /// @dev EIP-191 personal_sign over the 66-char hex string of `inner` — the
    ///      exact envelope 0G's Verifier uses ("\x19Ethereum Signed Message:\n66").
    function _ethHex(bytes32 inner) private pure returns (bytes32) {
        return keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n66", Strings.toHexString(uint256(inner), 32))
        );
    }

    function _nonceKey(bytes memory nonce) private view returns (bytes32) {
        return keccak256(abi.encode(nonce, msg.sender));
    }

    function _markUsed(bytes32 key) private {
        if (usedProof[key]) revert ProofReplayed();
        usedProof[key] = true;
    }
}
