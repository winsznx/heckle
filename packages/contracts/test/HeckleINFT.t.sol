// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";
import {HeckleINFT} from "../src/erc7857/HeckleINFT.sol";
import {HeckleDataVerifier} from "../src/erc7857/HeckleDataVerifier.sol";
import {
    IERC7857,
    IntelligentData,
    OracleType,
    AccessProof,
    OwnershipProof,
    TransferValidityProof
} from "../src/erc7857/IERC7857.sol";

contract HeckleINFTTest is Test {
    HeckleDataVerifier internal verifier;
    HeckleINFT internal inft;

    address internal oracle;
    uint256 internal oraclePk;
    address internal alice;
    address internal bob;
    uint256 internal bobPk;
    address internal mallory;
    uint256 internal malloryPk;

    bytes32 internal constant DATA_HASH = keccak256("encrypted-personality-ciphertext");
    // The re-encrypted payload committed on transfer (new ciphertext -> new hash).
    bytes32 internal constant NEW_HASH = keccak256("reencrypted-personality-ciphertext");
    string internal constant DATA_URI = "https://indexer-storage-turbo.0g.ai/file?root=0xcafe";
    string internal constant CARD_URI = "https://indexer-storage-turbo.0g.ai/file?root=0xcard";

    event PublishedSealedKey(address indexed to, uint256 indexed tokenId, bytes[] sealedKeys);

    function setUp() public {
        (oracle, oraclePk) = makeAddrAndKey("oracle");
        alice = makeAddr("alice");
        (bob, bobPk) = makeAddrAndKey("bob");
        (mallory, malloryPk) = makeAddrAndKey("mallory");

        verifier = new HeckleDataVerifier(oracle);
        inft = new HeckleINFT(address(verifier));
    }

    function _data() internal pure returns (IntelligentData memory) {
        return IntelligentData({dataDescription: DATA_URI, dataHash: DATA_HASH});
    }

    function _migrate(uint256 tokenId, address to) internal {
        inft.migrateMint(tokenId, to, 0, "the-pundit", "The Pundit", CARD_URI, _data());
    }

    /// EIP-191 over the 66-char hex string of `inner` — the exact ERC-7857 envelope.
    function _sign(uint256 pk, bytes32 inner) internal pure returns (bytes memory) {
        bytes32 digest = keccak256(
            abi.encodePacked("\x19Ethereum Signed Message:\n66", Strings.toHexString(uint256(inner), 32))
        );
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _proof(uint256 accessPk, uint256 oPk, bytes memory nonce, bytes memory sealedKey)
        internal
        pure
        returns (TransferValidityProof memory)
    {
        return _proofFor(DATA_HASH, accessPk, oPk, nonce, sealedKey);
    }

    function _proofFor(
        bytes32 oldHash,
        uint256 accessPk,
        uint256 oPk,
        bytes memory nonce,
        bytes memory sealedKey
    ) internal pure returns (TransferValidityProof memory) {
        bytes memory pubkey = "";
        // Access and ownership proofs carry distinct nonces (they're independently
        // replay-tracked); deriving both from the base keeps replay tests meaningful.
        bytes memory aNonce = abi.encodePacked(nonce, bytes1(0x01));
        bytes memory oNonce = abi.encodePacked(nonce, bytes1(0x02));
        // dataHash = the token's CURRENT (old) commitment (binds the proof to the
        // token); newDataHash = the re-encrypted payload to rotate to. Each dynamic
        // field is hashed independently — mirrors the contract digest.
        AccessProof memory ap = AccessProof({
            dataHash: oldHash,
            targetPubkey: pubkey,
            nonce: aNonce,
            proof: _sign(
                accessPk, keccak256(abi.encodePacked(oldHash, keccak256(pubkey), keccak256(aNonce)))
            )
        });
        OwnershipProof memory op = OwnershipProof({
            oracleType: OracleType.TEE,
            dataHash: oldHash,
            newDataHash: NEW_HASH,
            sealedKey: sealedKey,
            targetPubkey: pubkey,
            nonce: oNonce,
            proof: _sign(
                oPk,
                keccak256(
                    abi.encodePacked(
                        oldHash, NEW_HASH, keccak256(sealedKey), keccak256(pubkey), keccak256(oNonce)
                    )
                )
            )
        });
        return TransferValidityProof({accessProof: ap, ownershipProof: op});
    }

    function _proofs(uint256 accessPk, uint256 oPk, bytes memory nonce, bytes memory sealedKey)
        internal
        pure
        returns (TransferValidityProof[] memory arr)
    {
        arr = new TransferValidityProof[](1);
        arr[0] = _proof(accessPk, oPk, nonce, sealedKey);
    }

    // --- mint / metadata ---

    function test_MigrateMintPreservesTokenId() public {
        _migrate(2, alice);
        assertEq(inft.ownerOf(2), alice);
        assertEq(inft.tokenURI(2), CARD_URI);
        HeckleINFT.Character memory c = inft.characterOf(2);
        assertEq(c.name, "The Pundit");
        assertEq(c.handle, "the-pundit");
        IntelligentData[] memory d = inft.intelligentDatasOf(2);
        assertEq(d.length, 1);
        assertEq(d[0].dataHash, DATA_HASH);
        // New mints continue past the highest migrated id.
        assertEq(inft.totalMinted(), 3);
    }

    function test_MintBlockedUntilMigrationSealed() public {
        _migrate(0, alice);
        // Audit fix: public mint can't front-run and squat V1 ids.
        vm.prank(bob);
        vm.expectRevert(HeckleINFT.MigrationNotSealed.selector);
        inft.mint(1, "new", "New One", CARD_URI, _data());
    }

    function test_MintContinuesAfterMigrationSealed() public {
        _migrate(0, alice);
        _migrate(1, alice);
        inft.sealMigration();
        vm.prank(bob);
        uint256 id = inft.mint(1, "new", "New One", CARD_URI, _data());
        assertEq(id, 2);
        assertEq(inft.ownerOf(2), bob);
    }

    function test_ITransferFrom_RevertsWhenProofNotBoundToToken() public {
        _migrate(0, alice);
        // Proof built for a DIFFERENT token's (old) data hash — valid signatures,
        // but the NFT rejects it because it doesn't match token 0's stored data.
        TransferValidityProof[] memory proofs = new TransferValidityProof[](1);
        proofs[0] = _proofFor(keccak256("some-other-token-data"), bobPk, oraclePk, "n", hex"01");
        vm.prank(alice);
        vm.expectRevert(HeckleINFT.DataHashMismatch.selector);
        inft.iTransferFrom(alice, bob, 0, proofs);
    }

    function test_SetCardURI_RefreshesDisplayMetadata() public {
        _migrate(0, alice);
        vm.prank(alice);
        inft.setCardURI(0, "https://indexer-storage-turbo.0g.ai/file?root=0xnewcard");
        assertEq(inft.tokenURI(0), "https://indexer-storage-turbo.0g.ai/file?root=0xnewcard");
    }

    function test_SetCardURI_OnlyTokenOwner() public {
        _migrate(0, alice);
        vm.prank(mallory);
        vm.expectRevert(HeckleINFT.NotAuthorized.selector);
        inft.setCardURI(0, "x");
    }

    function test_SupportsRealErc7857InterfaceId() public view {
        assertTrue(inft.supportsInterface(inft.INTERFACE_ID_ERC7857()));
        // Not the old placeholder id.
        assertFalse(inft.supportsInterface(0x7857a001));
        // Still an ERC-721.
        assertTrue(inft.supportsInterface(0x80ac58cd));
    }

    function test_MigrateMint_OnlyOwner() public {
        vm.prank(alice);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", alice));
        inft.migrateMint(0, alice, 0, "h", "n", CARD_URI, _data());
    }

    // --- iTransferFrom (the ERC-7857 guarantee) ---

    function test_ITransferFrom_Succeeds() public {
        _migrate(0, alice);
        bytes memory sealedKey = hex"deadbeef";
        TransferValidityProof[] memory proofs = _proofs(bobPk, oraclePk, "nonce-1", sealedKey);

        bytes[] memory expectedKeys = new bytes[](1);
        expectedKeys[0] = sealedKey;
        vm.expectEmit(true, true, false, true, address(inft));
        emit PublishedSealedKey(bob, 0, expectedKeys);

        vm.prank(alice);
        inft.iTransferFrom(alice, bob, 0, proofs);

        assertEq(inft.ownerOf(0), bob, "token must move to bob");
        // The on-chain commitment rotates to the re-encrypted payload — the old
        // ciphertext (which alice's key could open) is no longer the current data.
        assertEq(inft.intelligentDatasOf(0)[0].dataHash, NEW_HASH, "dataHash must rotate on transfer");
    }

    function test_ITransferFrom_RevertsOnNonOracleOwnershipProof() public {
        _migrate(0, alice);
        // Ownership proof signed by mallory, not the oracle.
        TransferValidityProof[] memory proofs = _proofs(bobPk, malloryPk, "n", hex"01");
        vm.prank(alice);
        vm.expectRevert(HeckleDataVerifier.InvalidOwnershipProof.selector);
        inft.iTransferFrom(alice, bob, 0, proofs);
    }

    function test_ITransferFrom_RevertsWhenReceiverDidNotConsent() public {
        _migrate(0, alice);
        // Access proof signed by mallory, but receiver is bob -> assistant mismatch.
        TransferValidityProof[] memory proofs = _proofs(malloryPk, oraclePk, "n", hex"01");
        vm.prank(alice);
        vm.expectRevert(HeckleINFT.AccessAssistantMismatch.selector);
        inft.iTransferFrom(alice, bob, 0, proofs);
    }

    function test_ITransferFrom_RevertsOnWrongFrom() public {
        _migrate(0, alice);
        TransferValidityProof[] memory proofs = _proofs(bobPk, oraclePk, "n", hex"01");
        vm.prank(alice);
        vm.expectRevert(HeckleINFT.WrongFrom.selector);
        inft.iTransferFrom(bob, bob, 0, proofs);
    }

    function test_ITransferFrom_RevertsForUnauthorizedCaller() public {
        _migrate(0, alice);
        TransferValidityProof[] memory proofs = _proofs(bobPk, oraclePk, "n", hex"01");
        vm.prank(mallory);
        vm.expectRevert(HeckleINFT.NotAuthorized.selector);
        inft.iTransferFrom(alice, bob, 0, proofs);
    }

    function test_ITransferFrom_RevertsOnNonceReplay() public {
        _migrate(0, alice);
        _migrate(1, alice);
        TransferValidityProof[] memory p0 = _proofs(bobPk, oraclePk, "same-nonce", hex"01");
        vm.prank(alice);
        inft.iTransferFrom(alice, bob, 0, p0);

        // Reusing the same nonce for a second transfer must revert.
        TransferValidityProof[] memory p1 = _proofs(bobPk, oraclePk, "same-nonce", hex"01");
        vm.prank(alice);
        vm.expectRevert(HeckleDataVerifier.ProofReplayed.selector);
        inft.iTransferFrom(alice, bob, 1, p1);
    }

    function test_DelegateAccess_RedirectsConsent() public {
        _migrate(0, alice);
        // bob delegates consent-signing to mallory.
        vm.prank(bob);
        inft.delegateAccess(mallory);
        assertEq(inft.getDelegateAccess(bob), mallory);

        // Now the access proof must be signed by mallory (the assistant), not bob.
        TransferValidityProof[] memory proofs = _proofs(malloryPk, oraclePk, "n", hex"02");
        vm.prank(alice);
        inft.iTransferFrom(alice, bob, 0, proofs);
        assertEq(inft.ownerOf(0), bob);
    }

    // --- verifier oracle rotation ---

    function test_Verifier_OracleRotation() public {
        (address newOracle, uint256 newPk) = makeAddrAndKey("newOracle");
        verifier.setTeeOracle(newOracle);
        _migrate(0, alice);

        // Old oracle no longer valid.
        vm.prank(alice);
        vm.expectRevert(HeckleDataVerifier.InvalidOwnershipProof.selector);
        inft.iTransferFrom(alice, bob, 0, _proofs(bobPk, oraclePk, "n", hex"03"));

        // New oracle works.
        vm.prank(alice);
        inft.iTransferFrom(alice, bob, 0, _proofs(bobPk, newPk, "n2", hex"03"));
        assertEq(inft.ownerOf(0), bob);
    }
}
