// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MessageHashUtils} from "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import {
    HeckleAttestationRegistry,
    IInferenceServing
} from "../src/HeckleAttestationRegistry.sol";
import {HeckleVerifiedTakes} from "../src/HeckleVerifiedTakes.sol";

/// @dev Stand-in for 0G's InferenceServing so `syncFromOG` is testable offline.
contract MockInferenceServing is IInferenceServing {
    Service private _svc;

    function setService(Service calldata s) external {
        _svc = s;
    }

    function getService(address) external view returns (Service memory) {
        return _svc;
    }
}

contract HeckleVerifiedTakesTest is Test {
    HeckleAttestationRegistry internal registry;
    HeckleVerifiedTakes internal verified;
    MockInferenceServing internal ogServing;

    address internal tee;
    uint256 internal teePk;
    address internal rogue;
    uint256 internal roguePk;

    address internal committer = makeAddr("committer");
    address internal stranger = makeAddr("stranger");
    address internal provider = makeAddr("provider");

    uint256 internal constant CHARACTER_ID = 3;
    uint256 internal constant EVENT_ID = 2;
    bytes32 internal constant MATCHUP_ID = bytes32("R16_8");
    // A realistic signedText: sha256(req):sha256(resp).
    string internal constant SIGNED_TEXT =
        "9b2f1e4c5a6d7e8f0011223344556677889900aabbccddeeff00112233445566:"
        "aabbccddeeff00112233445566778899aabbccddeeff001122334455667788ff";

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

    function setUp() public {
        (tee, teePk) = makeAddrAndKey("tee");
        (rogue, roguePk) = makeAddrAndKey("rogue");

        ogServing = new MockInferenceServing();
        registry = new HeckleAttestationRegistry(address(ogServing));
        verified = new HeckleVerifiedTakes(address(registry));

        registry.registerAttestor(tee, provider, "phala/gpt-oss-120b");
        verified.setCommitter(committer, true);
    }

    /// EIP-191 personal_sign over `text`, matching ethers.verifyMessage / the
    /// contract's toEthSignedMessageHash(bytes) recovery.
    function _sign(uint256 pk, string memory text) internal returns (bytes memory) {
        bytes32 digest = MessageHashUtils.toEthSignedMessageHash(bytes(text));
        (uint8 v, bytes32 r, bytes32 s) = vm.sign(pk, digest);
        return abi.encodePacked(r, s, v);
    }

    function _root(string memory seed) internal pure returns (bytes32) {
        return keccak256(bytes(seed));
    }

    // --- registry ---

    function test_RegisterAndIsTrusted() public view {
        assertTrue(registry.isTrusted(tee), "tee should be trusted");
        assertFalse(registry.isTrusted(rogue), "rogue should not be trusted");
        HeckleAttestationRegistry.Attestor memory a = registry.attestorOf(tee);
        assertTrue(a.active);
        assertEq(a.provider, provider);
        assertEq(a.model, "phala/gpt-oss-120b");
        assertEq(registry.signers().length, 1);
    }

    function test_RevokeStopsTrust() public {
        registry.revokeAttestor(tee);
        assertFalse(registry.isTrusted(tee), "revoked signer must not be trusted");
        // History preserved: still in the signers array.
        assertEq(registry.signers().length, 1);
    }

    function test_RegisterAttestor_OnlyOwner() public {
        vm.prank(stranger);
        vm.expectRevert(abi.encodeWithSignature("OwnableUnauthorizedAccount(address)", stranger));
        registry.registerAttestor(rogue, provider, "x");
    }

    function test_SyncFromOG_PullsAcknowledgedSigner() public {
        IInferenceServing.Service memory svc;
        svc.provider = provider;
        svc.model = "og-model";
        svc.teeSignerAddress = rogue; // some 0G-acknowledged signer
        svc.teeSignerAcknowledged = true;
        ogServing.setService(svc);

        address synced = registry.syncFromOG(provider);
        assertEq(synced, rogue);
        assertTrue(registry.isTrusted(rogue), "synced signer should be trusted");
    }

    function test_SyncFromOG_RevertsWhenNotAcknowledged() public {
        IInferenceServing.Service memory svc;
        svc.teeSignerAddress = rogue;
        svc.teeSignerAcknowledged = false;
        ogServing.setService(svc);

        vm.expectRevert("HeckleAttestationRegistry: signer not acknowledged");
        registry.syncFromOG(provider);
    }

    // --- verified takes ---

    function test_CommitVerifiedTake_Succeeds() public {
        bytes32 takeRoot = _root("take-1");
        bytes memory sig = _sign(teePk, SIGNED_TEXT);

        vm.expectEmit(true, true, true, true, address(verified));
        emit VerifiedTakeCommitted(
            1, CHARACTER_ID, EVENT_ID, MATCHUP_ID, takeRoot, tee, 1, uint64(block.timestamp)
        );

        vm.prank(committer);
        uint256 takeId =
            verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, takeRoot, 1, SIGNED_TEXT, sig);

        assertEq(takeId, 1);
        assertTrue(verified.isRootVerified(takeRoot));
        assertEq(verified.takeIdOfRoot(takeRoot), 1);
        assertEq(verified.verifiedCount(CHARACTER_ID), 1);

        HeckleVerifiedTakes.VerifiedTake memory t = verified.takeOf(1);
        assertEq(t.characterId, CHARACTER_ID);
        assertEq(t.eventId, EVENT_ID);
        assertEq(t.matchupId, MATCHUP_ID);
        assertEq(t.takeRoot, takeRoot);
        assertEq(t.signer, tee, "recovered signer must be the TEE signer");
        assertEq(t.committedBy, committer);

        assertEq(verified.takesByCharacter(CHARACTER_ID).length, 1);
        assertEq(verified.takesByEvent(EVENT_ID).length, 1);
        // recoverSigner view mirrors the internal recovery.
        assertEq(verified.recoverSigner(SIGNED_TEXT, sig), tee);
    }

    function test_Commit_RevertsOnUntrustedSigner() public {
        bytes memory sig = _sign(roguePk, SIGNED_TEXT); // rogue is not registered
        vm.prank(committer);
        vm.expectRevert("HeckleVerifiedTakes: untrusted TEE signer");
        verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, _root("r"), 1, SIGNED_TEXT, sig);
    }

    function test_Commit_RevertsOnTamperedText() public {
        bytes memory sig = _sign(teePk, SIGNED_TEXT);
        // A different signedText recovers a different (untrusted) address.
        vm.prank(committer);
        vm.expectRevert("HeckleVerifiedTakes: untrusted TEE signer");
        verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, _root("r"), 1, "tampered:text", sig);
    }

    function test_Commit_RevertsOnReplay() public {
        bytes32 takeRoot = _root("dup");
        bytes memory sig = _sign(teePk, SIGNED_TEXT);

        vm.prank(committer);
        verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, takeRoot, 1, SIGNED_TEXT, sig);

        vm.prank(committer);
        vm.expectRevert("HeckleVerifiedTakes: root already committed");
        verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, takeRoot, 1, SIGNED_TEXT, sig);
    }

    function test_Commit_RevertsOnAttestationReplayAcrossRoots() public {
        // Audit regression: one valid (signedText, signature) pair must back at
        // most one take, even under a fresh, arbitrary takeRoot.
        bytes memory sig = _sign(teePk, SIGNED_TEXT);

        vm.prank(committer);
        verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, _root("root-a"), 1, SIGNED_TEXT, sig);

        vm.prank(committer);
        vm.expectRevert("HeckleVerifiedTakes: attestation already committed");
        verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, _root("root-b"), 1, SIGNED_TEXT, sig);

        // Count reflects exactly one take, not two.
        assertEq(verified.verifiedCount(CHARACTER_ID), 1);
    }

    function test_Commit_RevertsForNonCommitter() public {
        bytes memory sig = _sign(teePk, SIGNED_TEXT);
        vm.prank(stranger);
        vm.expectRevert("HeckleVerifiedTakes: not committer");
        verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, _root("r"), 1, SIGNED_TEXT, sig);
    }

    function test_Commit_RevertsOnZeroRoot() public {
        bytes memory sig = _sign(teePk, SIGNED_TEXT);
        vm.prank(committer);
        vm.expectRevert("HeckleVerifiedTakes: zero root");
        verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, bytes32(0), 1, SIGNED_TEXT, sig);
    }

    function test_Commit_RevertsAfterSignerRevoked() public {
        registry.revokeAttestor(tee);
        bytes memory sig = _sign(teePk, SIGNED_TEXT);
        vm.prank(committer);
        vm.expectRevert("HeckleVerifiedTakes: untrusted TEE signer");
        verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, _root("r"), 1, SIGNED_TEXT, sig);
    }

    function test_OwnerCanCommitWithoutCommitterRole() public {
        // owner (this test contract) is an implicit committer.
        bytes memory sig = _sign(teePk, SIGNED_TEXT);
        uint256 takeId =
            verified.commitVerifiedTake(CHARACTER_ID, EVENT_ID, MATCHUP_ID, _root("owner"), 1, SIGNED_TEXT, sig);
        assertEq(takeId, 1);
    }

    // --- real 0G data (not synthetic vm.sign) ---

    // A live attestation pulled from 0G Storage (take root below): the
    // centralized-provider routing-proof variant — 5 colon-joined fields
    // (sha256(req):sha256(resp):providerType:providerIdentity:tlsFingerprint),
    // still EIP-191 personal_sign. Because the contract recovers over the opaque
    // string, it handles this and the 2-field decentralized variant identically.
    string internal constant REAL_SIGNED_TEXT =
        "83c60c81a8af6c6a7b702ed3713270f90bdfed0318b1735e01a0ed955da034b3:"
        "f2d8daee119e34d7158c58fc8918d5892e3aa7d771d5ecb3197e1e0dfd33f92c:"
        "centralized:aliyun:"
        "9e621febea357ff4460b91bf8b0b4bfe654d2e100edbc74770e76519d734830e";
    bytes internal constant REAL_SIGNATURE =
        hex"78a263f1207d4e0b192e107a89378b7c522c6ad3d8dca2cd2d9754d89cac2bab67a636d99253115851a68ea2207cf316d2939b17ded08d0d04b1ae9e0b8dd40f1b";
    address internal constant REAL_OG_SIGNER = 0x2E79315804e7C8712afcEbF0E31F08174409D806;
    bytes32 internal constant REAL_TAKE_ROOT =
        0xee27109152c63934180319a82f4af4264bd32cab156213f9619f20687d2f62a3;

    function test_RecoversRealOGSigner_Fixture() public view {
        assertEq(
            verified.recoverSigner(REAL_SIGNED_TEXT, REAL_SIGNATURE),
            REAL_OG_SIGNER,
            "on-chain recovery must match the real 0G TEE signer"
        );
    }

    function test_CommitRealOGTake_EndToEnd() public {
        registry.registerAttestor(REAL_OG_SIGNER, provider, "0g-centralized-tee");
        vm.prank(committer);
        uint256 takeId = verified.commitVerifiedTake(
            CHARACTER_ID, EVENT_ID, MATCHUP_ID, REAL_TAKE_ROOT, 1, REAL_SIGNED_TEXT, REAL_SIGNATURE
        );
        assertEq(verified.takeOf(takeId).signer, REAL_OG_SIGNER, "stored signer must be the real 0G TEE signer");
        assertTrue(verified.isRootVerified(REAL_TAKE_ROOT));
    }
}
