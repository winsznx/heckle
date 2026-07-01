// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {HeckleBrackets} from "../src/HeckleBrackets.sol";

contract HeckleBracketsTest is Test {
    HeckleBrackets internal brackets;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    uint256 internal constant EVENT_ID = 2;
    bytes32 internal constant ROOT_A = keccak256("bracket-a");
    bytes32 internal constant ROOT_B = keccak256("bracket-b");

    event BracketCommitted(
        uint256 indexed bracketId,
        uint256 indexed eventId,
        address indexed submitter,
        bytes32 predictionsRoot,
        uint64 timestamp
    );

    function setUp() public {
        brackets = new HeckleBrackets();
    }

    function test_CommitBracket_StoresAndEmits() public {
        vm.warp(1_700_000_000);

        vm.expectEmit(true, true, true, true, address(brackets));
        emit BracketCommitted(1, EVENT_ID, alice, ROOT_A, uint64(block.timestamp));

        vm.prank(alice);
        uint256 bracketId = brackets.commitBracket(EVENT_ID, ROOT_A);

        assertEq(bracketId, 1, "first bracketId should be 1");
        assertEq(brackets.totalBrackets(), 1, "totalBrackets mismatch");

        HeckleBrackets.Bracket memory b = brackets.bracketOf(1);
        assertEq(b.eventId, EVENT_ID, "eventId mismatch");
        assertEq(b.submitter, alice, "submitter mismatch");
        assertEq(b.predictionsRoot, ROOT_A, "predictionsRoot mismatch");
        assertEq(b.timestamp, uint64(block.timestamp), "timestamp mismatch");

        uint256[] memory byEvent = brackets.bracketsByEvent(EVENT_ID);
        assertEq(byEvent.length, 1, "bracketsByEvent length mismatch");
        assertEq(byEvent[0], 1, "bracketsByEvent[0] mismatch");

        uint256[] memory bySubmitter = brackets.bracketsBySubmitter(alice);
        assertEq(bySubmitter.length, 1, "bracketsBySubmitter length mismatch");
        assertEq(bySubmitter[0], 1, "bracketsBySubmitter[0] mismatch");
    }

    function test_AppendOnly_IdsIncrementAndAccumulate() public {
        vm.prank(alice);
        brackets.commitBracket(EVENT_ID, ROOT_A);

        vm.prank(alice);
        uint256 second = brackets.commitBracket(EVENT_ID, ROOT_B);

        assertEq(second, 2, "second bracketId should be 2");
        assertEq(brackets.totalBrackets(), 2, "totalBrackets mismatch");

        uint256[] memory byEvent = brackets.bracketsByEvent(EVENT_ID);
        assertEq(byEvent.length, 2, "bracketsByEvent length mismatch");
        assertEq(byEvent[0], 1, "order[0] mismatch");
        assertEq(byEvent[1], 2, "order[1] mismatch");

        // Both remain retrievable and immutable — nothing overwritten.
        assertEq(brackets.bracketOf(1).predictionsRoot, ROOT_A, "root A overwritten");
        assertEq(brackets.bracketOf(2).predictionsRoot, ROOT_B, "root B mismatch");
    }

    function test_SeparatesSubmitters() public {
        vm.prank(alice);
        brackets.commitBracket(EVENT_ID, ROOT_A);

        vm.prank(bob);
        brackets.commitBracket(EVENT_ID, ROOT_B);

        uint256[] memory aliceIds = brackets.bracketsBySubmitter(alice);
        uint256[] memory bobIds = brackets.bracketsBySubmitter(bob);

        assertEq(aliceIds.length, 1, "alice count mismatch");
        assertEq(aliceIds[0], 1, "alice id mismatch");
        assertEq(bobIds.length, 1, "bob count mismatch");
        assertEq(bobIds[0], 2, "bob id mismatch");

        assertEq(brackets.bracketOf(1).submitter, alice, "bracket 1 submitter mismatch");
        assertEq(brackets.bracketOf(2).submitter, bob, "bracket 2 submitter mismatch");
    }

    function test_SeparatesEvents() public {
        vm.prank(alice);
        brackets.commitBracket(EVENT_ID, ROOT_A);

        vm.prank(alice);
        brackets.commitBracket(99, ROOT_B);

        assertEq(brackets.bracketsByEvent(EVENT_ID).length, 1, "event 2 count mismatch");
        assertEq(brackets.bracketsByEvent(99).length, 1, "event 99 count mismatch");
        assertEq(brackets.bracketsByEvent(EVENT_ID)[0], 1, "event 2 id mismatch");
        assertEq(brackets.bracketsByEvent(99)[0], 2, "event 99 id mismatch");
    }

    function test_RejectsEmptyRoot() public {
        vm.expectRevert("HeckleBrackets: empty root");
        vm.prank(alice);
        brackets.commitBracket(EVENT_ID, bytes32(0));

        assertEq(brackets.totalBrackets(), 0, "no bracket should be recorded");
    }

    function test_UnknownBracketReadsZero() public view {
        HeckleBrackets.Bracket memory b = brackets.bracketOf(42);
        assertEq(b.eventId, 0, "unknown eventId should be 0");
        assertEq(b.submitter, address(0), "unknown submitter should be 0");
        assertEq(b.predictionsRoot, bytes32(0), "unknown root should be 0");
    }

    function testFuzz_CommitPreservesFields(
        address who,
        uint256 eventId,
        bytes32 root,
        uint64 ts
    ) public {
        vm.assume(who != address(0));
        vm.assume(root != bytes32(0));
        vm.warp(ts);

        vm.prank(who);
        uint256 id = brackets.commitBracket(eventId, root);

        HeckleBrackets.Bracket memory b = brackets.bracketOf(id);
        assertEq(b.eventId, eventId, "fuzz eventId mismatch");
        assertEq(b.submitter, who, "fuzz submitter mismatch");
        assertEq(b.predictionsRoot, root, "fuzz root mismatch");
        assertEq(b.timestamp, ts, "fuzz timestamp mismatch");
        assertEq(brackets.bracketsBySubmitter(who)[0], id, "fuzz submitter index mismatch");
    }
}
