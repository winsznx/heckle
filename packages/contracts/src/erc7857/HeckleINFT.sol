// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {IERC721Metadata} from "@openzeppelin/contracts/token/ERC721/extensions/IERC721Metadata.sol";
import {IERC165} from "@openzeppelin/contracts/utils/introspection/IERC165.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {
    IERC7857,
    IERC7857Metadata,
    IERC7857DataVerifier,
    IntelligentData,
    TransferValidityProof,
    TransferValidityProofOutput
} from "./IERC7857.sol";

/// @title HeckleINFT
/// @notice Heckle characters as genuine ERC-7857 Intelligent NFTs on 0G. Each
///         token carries public display metadata (archetype, handle, name,
///         tokenURI card) AND one or more `IntelligentData` commitments to the
///         character's *encrypted* personality (dataHash + 0G Storage locator).
///         Ownership + the public record travel on any ERC-721 transfer; the
///         private personality travels only via `iTransferFrom`, where the
///         verifier requires an oracle to have re-sealed the data key to the
///         receiver — that is the ERC-7857 guarantee made real, replacing V1's
///         placeholder interface id.
/// @dev Migration preserves tokenIds: `migrateMint` mints a specific id (0,1,2…)
///      to the current V1 owner, so all takes/reputation keyed by characterId
///      stay valid with zero re-pointing.
contract HeckleINFT is ERC721, ERC721URIStorage, Ownable, IERC7857 {
    struct Character {
        uint8 archetype;
        string handle;
        string name;
        address creator;
        uint64 createdAt;
    }

    /// @notice Real ERC-7857 interface id — XOR of the standard's own selectors,
    ///         computed (not a hardcoded guess).
    bytes4 public constant INTERFACE_ID_ERC7857 = IERC7857.verifier.selector
        ^ IERC7857.iTransferFrom.selector ^ IERC7857.delegateAccess.selector
        ^ IERC7857.getDelegateAccess.selector ^ IERC7857Metadata.intelligentDatasOf.selector;

    IERC7857DataVerifier private immutable _verifier;

    uint256 private _nextTokenId;
    mapping(uint256 tokenId => Character) private _characters;
    mapping(uint256 tokenId => IntelligentData[]) private _iDatas;
    mapping(address user => address assistant) private _delegate;

    event CharacterMinted(uint256 indexed tokenId, address indexed owner, uint8 archetype, bytes32 dataHash);

    /// @notice New characters can only mint once migration of the V1 ids is
    ///         sealed, so a public mint can't front-run and squat tokenId 0/1/2.
    bool public migrationSealed;

    event MigrationSealed();

    error NotAuthorized();
    error WrongFrom();
    error ProofCountMismatch();
    error DataHashMismatch();
    error AccessAssistantMismatch();
    error EmptyData();
    error MigrationNotSealed();

    constructor(address verifier_) ERC721("Heckle Characters", "HECKLE") Ownable(msg.sender) {
        require(verifier_ != address(0), "HeckleINFT: zero verifier");
        _verifier = IERC7857DataVerifier(verifier_);
    }

    /// @inheritdoc IERC7857
    function verifier() external view returns (IERC7857DataVerifier) {
        return _verifier;
    }

    /// @notice Migration mint that PRESERVES the V1 tokenId. Owner-only. Reverts
    ///         if the id already exists.
    function migrateMint(
        uint256 tokenId,
        address to,
        uint8 archetype,
        string calldata handle,
        string calldata name,
        string calldata tokenURI_,
        IntelligentData calldata initialData
    ) external onlyOwner {
        _mintWithData(tokenId, to, archetype, handle, name, tokenURI_, initialData);
        if (tokenId >= _nextTokenId) _nextTokenId = tokenId + 1;
    }

    /// @notice Seal migration: after the V1 characters are migrated, open public
    ///         minting. Owner-only, one-way.
    function sealMigration() external onlyOwner {
        migrationSealed = true;
        emit MigrationSealed();
    }

    /// @notice Mint a new character to the caller (ids continue past migration).
    ///         Blocked until migration is sealed so it can't squat V1 ids.
    function mint(
        uint8 archetype,
        string calldata handle,
        string calldata name,
        string calldata tokenURI_,
        IntelligentData calldata initialData
    ) external returns (uint256 tokenId) {
        if (!migrationSealed) revert MigrationNotSealed();
        tokenId = _nextTokenId++;
        _mintWithData(tokenId, msg.sender, archetype, handle, name, tokenURI_, initialData);
    }

    function _mintWithData(
        uint256 tokenId,
        address to,
        uint8 archetype,
        string calldata handle,
        string calldata name,
        string calldata tokenURI_,
        IntelligentData calldata initialData
    ) private {
        if (initialData.dataHash == bytes32(0)) revert EmptyData();
        _safeMint(to, tokenId);
        _setTokenURI(tokenId, tokenURI_);
        _characters[tokenId] =
            Character({archetype: archetype, handle: handle, name: name, creator: to, createdAt: uint64(block.timestamp)});
        _iDatas[tokenId].push(initialData);
        emit CharacterMinted(tokenId, to, archetype, initialData.dataHash);
    }

    /// @inheritdoc IERC7857Metadata
    function intelligentDatasOf(uint256 tokenId) external view returns (IntelligentData[] memory) {
        _requireOwned(tokenId);
        return _iDatas[tokenId];
    }

    /// @notice Public display record for a token.
    function characterOf(uint256 tokenId) external view returns (Character memory) {
        _requireOwned(tokenId);
        return _characters[tokenId];
    }

    /// @inheritdoc IERC7857
    function iTransferFrom(
        address from,
        address to,
        uint256 tokenId,
        TransferValidityProof[] calldata proofs
    ) external {
        address owner = ownerOf(tokenId);
        if (owner != from) revert WrongFrom();
        if (!_isAuthorized(owner, msg.sender, tokenId)) revert NotAuthorized();

        IntelligentData[] storage datas = _iDatas[tokenId];
        if (proofs.length == 0 || proofs.length != datas.length) revert ProofCountMismatch();

        IntelligentData[] memory oldDatas = _snapshot(tokenId);
        TransferValidityProofOutput[] memory outs = _verifier.verifyTransferValidity(proofs);

        address assistant = _delegate[to] == address(0) ? to : _delegate[to];
        bytes[] memory sealedKeys = new bytes[](outs.length);
        for (uint256 i = 0; i < outs.length; i++) {
            // Bind the proof to THIS token's current data (blocks cross-token /
            // post-transfer replay), then rotate to the re-encrypted payload.
            if (outs[i].dataHash != datas[i].dataHash) revert DataHashMismatch();
            if (outs[i].accessAssistant != assistant) revert AccessAssistantMismatch();
            // The sender's old key no longer decrypts the current payload — the
            // commitment now points at the re-encrypted blob. dataDescription is
            // cleared; the ciphertext URI derives from the dataHash (0G root).
            datas[i].dataHash = outs[i].newDataHash;
            datas[i].dataDescription = "";
            sealedKeys[i] = outs[i].sealedKey;
        }

        _transfer(from, to, tokenId);
        emit PublishedSealedKey(to, tokenId, sealedKeys);
        emit Updated(tokenId, oldDatas, _snapshot(tokenId));
    }

    function _snapshot(uint256 tokenId) private view returns (IntelligentData[] memory) {
        return _iDatas[tokenId];
    }

    /// @notice Owner re-points a token's intelligent data (e.g. after a memory
    ///         update re-encrypts the blob). Emits the ERC-7857 Updated event.
    function updateData(uint256 tokenId, IntelligentData[] calldata newDatas) external {
        if (ownerOf(tokenId) != msg.sender) revert NotAuthorized();
        if (newDatas.length == 0) revert EmptyData();
        IntelligentData[] memory oldDatas = _iDatas[tokenId];
        delete _iDatas[tokenId];
        for (uint256 i = 0; i < newDatas.length; i++) {
            _iDatas[tokenId].push(newDatas[i]);
        }
        emit Updated(tokenId, oldDatas, newDatas);
    }

    /// @inheritdoc IERC7857
    function delegateAccess(address assistant) external {
        _delegate[msg.sender] = assistant;
        emit DelegateAccess(msg.sender, assistant);
    }

    /// @inheritdoc IERC7857
    function getDelegateAccess(address user) external view returns (address) {
        address a = _delegate[user];
        return a == address(0) ? user : a;
    }

    /// @notice Total characters minted so far.
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage, IERC721Metadata)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage, IERC165)
        returns (bool)
    {
        return interfaceId == INTERFACE_ID_ERC7857 || super.supportsInterface(interfaceId);
    }
}
