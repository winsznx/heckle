// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {HeckleCharacters} from "../src/HeckleCharacters.sol";
import {HeckleEvents} from "../src/HeckleEvents.sol";
import {HeckleTakes} from "../src/HeckleTakes.sol";

contract HeckleTest is Test {
    HeckleCharacters internal characters;
    HeckleEvents internal events;
    HeckleTakes internal takes;

    address internal creator = makeAddr("creator");
    address internal committer = makeAddr("committer");
    address internal stranger = makeAddr("stranger");

    string internal constant TOKEN_URI =
        "https://indexer-storage-turbo.0g.ai/file?root=0xabc123";
    bytes32 internal constant PERSONALITY_ROOT = keccak256("personality");
    bytes32 internal constant EVENT_ROOT = keccak256("event");

    event CharacterMinted(
        uint256 indexed tokenId,
        address indexed owner,
        uint8 archetype,
        bytes32 personalityRoot
    );

    event CharacterAttached(
        uint256 indexed eventId,
        uint256 indexed characterId,
        address indexed owner
    );

    event TakeCommitted(
        uint256 indexed takeId,
        uint256 indexed characterId,
        uint256 indexed eventId,
        bytes32 takeRoot,
        uint8 kind,
        uint64 timestamp
    );

    function setUp() public {
        characters = new HeckleCharacters();
        events = new HeckleEvents();
        takes = new HeckleTakes();
    }

    function _mintCharacter() internal returns (uint256 tokenId) {
        vm.prank(creator);
        tokenId = characters.mint(TOKEN_URI, 2, "the-oracle", PERSONALITY_ROOT);
    }

    function test_MintCharacter() public {
        vm.expectEmit(true, true, false, true, address(characters));
        emit CharacterMinted(0, creator, 2, PERSONALITY_ROOT);

        uint256 tokenId = _mintCharacter();

        assertEq(tokenId, 0, "first tokenId should be 0");
        assertEq(characters.ownerOf(0), creator, "owner mismatch");
        assertEq(characters.tokenURI(0), TOKEN_URI, "tokenURI mismatch");
        assertEq(characters.totalMinted(), 1, "totalMinted mismatch");

        HeckleCharacters.Character memory c = characters.characterOf(0);
        assertEq(c.archetype, 2, "archetype mismatch");
        assertEq(c.handle, "the-oracle", "handle mismatch");
        assertEq(c.personalityRoot, PERSONALITY_ROOT, "personalityRoot mismatch");
        assertEq(c.creator, creator, "creator mismatch");
        assertEq(c.createdAt, uint64(block.timestamp), "createdAt mismatch");

        bytes32[] memory hashes = characters.dataHashesOf(0);
        assertEq(hashes.length, 1, "dataHashes length mismatch");
        assertEq(hashes[0], PERSONALITY_ROOT, "dataHashes[0] mismatch");

        assertTrue(
            characters.supportsInterface(characters.INTERFACE_ID_ERC7857()),
            "should support ERC7857 interface id"
        );
    }

    function test_RegisterAndAttach() public {
        uint256 tokenId = _mintCharacter();

        uint256 eventId = events.registerEvent(EVENT_ROOT, 1_000, 2_000);
        assertEq(eventId, 1, "first eventId should be 1");

        HeckleEvents.Event memory e = events.eventOf(eventId);
        assertEq(e.eventRoot, EVENT_ROOT, "eventRoot mismatch");
        assertEq(e.startsAt, 1_000, "startsAt mismatch");
        assertEq(e.endsAt, 2_000, "endsAt mismatch");
        assertEq(uint8(e.status), uint8(HeckleEvents.Status.Upcoming), "status mismatch");

        vm.expectEmit(true, true, true, false, address(events));
        emit CharacterAttached(eventId, tokenId, creator);

        vm.prank(creator);
        events.attachCharacter(eventId, tokenId);

        uint256[] memory attached = events.attachmentsOf(eventId);
        assertEq(attached.length, 1, "attachments length mismatch");
        assertEq(attached[0], tokenId, "attached id mismatch");
    }

    function test_AttachRejectsDuplicate() public {
        uint256 tokenId = _mintCharacter();
        uint256 eventId = events.registerEvent(EVENT_ROOT, 1_000, 2_000);

        events.attachCharacter(eventId, tokenId);

        vm.expectRevert("HeckleEvents: already attached");
        events.attachCharacter(eventId, tokenId);
    }

    function test_AuthorizeCommitterAndCommitTakes() public {
        uint256 characterId = _mintCharacter();
        uint256 eventId = events.registerEvent(EVENT_ROOT, 1_000, 2_000);

        takes.setCommitter(committer, true);
        assertTrue(takes.committers(committer), "committer should be authorized");

        for (uint8 i = 0; i < 3; i++) {
            bytes32 takeRoot = keccak256(abi.encodePacked("take", i));

            vm.expectEmit(true, true, true, true, address(takes));
            emit TakeCommitted(
                uint256(i) + 1, characterId, eventId, takeRoot, i, uint64(block.timestamp)
            );

            vm.prank(committer);
            takes.commitTake(characterId, eventId, takeRoot, i);
        }

        uint256[] memory eventTakes = takes.takesByEvent(eventId);
        assertEq(eventTakes.length, 3, "takesByEvent length mismatch");

        uint256[] memory charTakes = takes.takesByCharacter(characterId);
        assertEq(charTakes.length, 3, "takesByCharacter length mismatch");

        HeckleTakes.Reputation memory rep = takes.reputationOf(characterId);
        assertEq(rep.takesGenerated, 3, "takesGenerated mismatch");
        assertGt(rep.firstTakeAt, 0, "firstTakeAt should be set");
        assertEq(rep.lastTakeAt, uint64(block.timestamp), "lastTakeAt mismatch");

        HeckleTakes.Take memory firstTake = takes.takeOf(1);
        assertEq(firstTake.characterId, characterId, "take.characterId mismatch");
        assertEq(firstTake.eventId, eventId, "take.eventId mismatch");
    }

    function test_GradePrediction() public {
        uint256 characterId = _mintCharacter();
        uint256 eventId = events.registerEvent(EVENT_ROOT, 1_000, 2_000);

        takes.commitTake(characterId, eventId, keccak256("t"), 0);

        takes.gradePrediction(characterId, true);
        takes.gradePrediction(characterId, false);

        HeckleTakes.Reputation memory rep = takes.reputationOf(characterId);
        assertEq(rep.predictionsTotal, 2, "predictionsTotal mismatch");
        assertEq(rep.predictionsCorrect, 1, "predictionsCorrect mismatch");
        assertGt(rep.weightedScore, 0, "weightedScore should be positive");
    }

    function test_NonCommitterCommitTakeReverts() public {
        uint256 characterId = _mintCharacter();
        uint256 eventId = events.registerEvent(EVENT_ROOT, 1_000, 2_000);

        vm.expectRevert("HeckleTakes: not committer");
        vm.prank(stranger);
        takes.commitTake(characterId, eventId, keccak256("t"), 0);
    }
}
