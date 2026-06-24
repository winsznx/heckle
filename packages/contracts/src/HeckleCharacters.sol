// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {ERC721URIStorage} from "@openzeppelin/contracts/token/ERC721/extensions/ERC721URIStorage.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/// @title HeckleCharacters
/// @notice Minimal ERC-7857-compatible Intelligent NFT (INFT) for Heckle AI fan
///         personalities on 0G. Group-stage scope: mint + ownership +
///         tokenURI pointing to a 0G Storage root + standard ERC721 transfer.
/// @dev Full ERC-7857 encrypted-metadata transfer-via-oracle (sealed key
///      re-encryption, transfer-with-proof, oracle verification) is deferred to
///      R32. Here the on-chain `personalityRoot` is the 0G Storage Merkle root
///      committing to the character's (off-chain) personality data, and
///      `tokenURI` resolves to the storage payload
///      (e.g. https://indexer-storage-turbo.0g.ai/file?root=0x...).
contract HeckleCharacters is ERC721, ERC721URIStorage, Ownable {
    /// @notice Best-effort ERC-7857 interface id. The final ERC-7857 interface
    ///         is still being standardized; this id lets indexers detect Heckle
    ///         INFTs ahead of the R32 oracle-transfer implementation.
    bytes4 public constant INTERFACE_ID_ERC7857 = 0x7857a001;

    struct Character {
        uint8 archetype;
        string handle;
        bytes32 personalityRoot;
        address creator;
        uint64 createdAt;
    }

    uint256 private _nextTokenId;

    mapping(uint256 tokenId => Character) private _characters;

    /// @notice Emitted when a new character INFT is minted.
    event CharacterMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint8 archetype,
        bytes32 personalityRoot
    );

    constructor() ERC721("Heckle Characters", "HECKLE") Ownable(msg.sender) {}

    /// @notice Mint a new character INFT to the caller.
    /// @param tokenURI_ 0G Storage URI resolving to the character payload.
    /// @param archetype Personality archetype tag.
    /// @param handle Human-readable handle for the character.
    /// @param personalityRoot 0G Storage Merkle root of the personality data.
    /// @return tokenId The newly minted token id (ids start at 0).
    function mint(
        string calldata tokenURI_,
        uint8 archetype,
        string calldata handle,
        bytes32 personalityRoot
    ) external returns (uint256 tokenId) {
        tokenId = _nextTokenId++;

        _safeMint(msg.sender, tokenId);
        _setTokenURI(tokenId, tokenURI_);

        _characters[tokenId] = Character({
            archetype: archetype,
            handle: handle,
            personalityRoot: personalityRoot,
            creator: msg.sender,
            createdAt: uint64(block.timestamp)
        });

        emit CharacterMinted(tokenId, msg.sender, archetype, personalityRoot);
    }

    /// @notice Read the full character record for a token.
    function characterOf(uint256 tokenId) external view returns (Character memory) {
        _requireOwned(tokenId);
        return _characters[tokenId];
    }

    /// @notice ERC-7857-style data commitments for a token.
    /// @dev Group stage commits a single root (the personality data). The array
    ///      shape mirrors ERC-7857 multi-blob metadata for forward compatibility.
    function dataHashesOf(uint256 tokenId) external view returns (bytes32[] memory hashes) {
        _requireOwned(tokenId);
        hashes = new bytes32[](1);
        hashes[0] = _characters[tokenId].personalityRoot;
    }

    /// @notice Total number of characters minted so far.
    function totalMinted() external view returns (uint256) {
        return _nextTokenId;
    }

    function tokenURI(uint256 tokenId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (string memory)
    {
        return super.tokenURI(tokenId);
    }

    function supportsInterface(bytes4 interfaceId)
        public
        view
        override(ERC721, ERC721URIStorage)
        returns (bool)
    {
        return interfaceId == INTERFACE_ID_ERC7857 || super.supportsInterface(interfaceId);
    }
}
