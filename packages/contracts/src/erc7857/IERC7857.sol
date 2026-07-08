// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC721Metadata} from "@openzeppelin/contracts/interfaces/IERC721Metadata.sol";

/// @notice ERC-7857 (INFT) interface surface, re-declared to the Final spec.
///         Mirrors 0G Labs' reference (0glabs/0g-agent-nft) so a Heckle INFT is
///         a genuine ERC-7857 agent: the encrypted metadata's commitment lives
///         on-chain and transfer is gated by an oracle re-encryption proof.

/// @notice A single intelligent-data entry: a commitment to (encrypted) metadata
///         plus an off-chain locator for the ciphertext (e.g. a 0G Storage URI).
struct IntelligentData {
    string dataDescription;
    bytes32 dataHash;
}

/// @notice Oracle families ERC-7857 allows. Heckle ships the TEE path (the only
///         one implemented in 0G's reference); ZKP is reserved.
enum OracleType {
    TEE,
    ZKP
}

/// @notice Receiver-consent signature over (dataHash, targetPubkey, nonce).
struct AccessProof {
    bytes32 dataHash;
    bytes targetPubkey;
    bytes nonce;
    bytes proof;
}

/// @notice Oracle attestation that the data key was re-sealed to the receiver.
struct OwnershipProof {
    OracleType oracleType;
    bytes32 dataHash;
    bytes sealedKey;
    bytes targetPubkey;
    bytes nonce;
    bytes proof;
}

struct TransferValidityProof {
    AccessProof accessProof;
    OwnershipProof ownershipProof;
}

struct TransferValidityProofOutput {
    bytes32 dataHash;
    bytes sealedKey;
    bytes targetPubkey;
    bytes wantedKey;
    address accessAssistant;
    bytes accessProofNonce;
    bytes ownershipProofNonce;
}

interface IERC7857DataVerifier {
    /// @notice Verify a batch of transfer-validity proofs and return their
    ///         decoded outputs. Marks each proof nonce used (replay protection).
    function verifyTransferValidity(TransferValidityProof[] calldata proofs)
        external
        returns (TransferValidityProofOutput[] memory);
}

interface IERC7857Metadata is IERC721Metadata {
    /// @notice The current intelligent-data commitments for a token.
    function intelligentDatasOf(uint256 tokenId) external view returns (IntelligentData[] memory);
}

interface IERC7857 is IERC7857Metadata {
    event Updated(uint256 indexed tokenId, IntelligentData[] oldDatas, IntelligentData[] newDatas);
    event PublishedSealedKey(address indexed to, uint256 indexed tokenId, bytes[] sealedKeys);
    event DelegateAccess(address indexed user, address indexed assistant);

    /// @notice The verifier this INFT uses to gate transfers.
    function verifier() external view returns (IERC7857DataVerifier);

    /// @notice Transfer ownership AND the (re-encrypted) data to `to`, gated by
    ///         one proof per intelligent-data entry.
    function iTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata proofs
    ) external;

    /// @notice Delegate the receiver-consent signing privilege to an assistant.
    function delegateAccess(address assistant) external;

    /// @notice The assistant a user delegated consent-signing to (or the user).
    function getDelegateAccess(address user) external view returns (address);
}
