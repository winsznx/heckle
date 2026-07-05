// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {HeckleVotes, IHeckleTakes} from "../src/HeckleVotes.sol";

contract MockCharacters {
    mapping(uint256 => address) public owners;

    function setOwner(uint256 id, address o) external {
        owners[id] = o;
    }

    function ownerOf(uint256 id) external view returns (address) {
        return owners[id];
    }
}

contract MockTakes {
    mapping(uint256 => uint256) public scores;

    function setScore(uint256 id, uint256 s) external {
        scores[id] = s;
    }

    function reputationOf(uint256 id) external view returns (IHeckleTakes.Reputation memory r) {
        r.weightedScore = scores[id];
    }
}

contract HeckleVotesTest is Test {
    HeckleVotes internal votes;
    MockCharacters internal characters;
    MockTakes internal takes;

    address internal alice = makeAddr("alice");
    address internal bob = makeAddr("bob");

    event TakeVoted(
        uint256 indexed takeId,
        uint256 indexed voterCharacterId,
        address indexed voter,
        uint256 weight,
        uint256 newTotal
    );

    function setUp() public {
        characters = new MockCharacters();
        takes = new MockTakes();
        votes = new HeckleVotes(address(characters), address(takes));
        characters.setOwner(1, alice);
        characters.setOwner(2, alice);
        characters.setOwner(3, bob);
    }

    function test_WeightIsSqrtRepPlusOne() public {
        takes.setScore(1, 100); // sqrt(100) = 10 → weight 11

        vm.expectEmit(true, true, true, true, address(votes));
        emit TakeVoted(5, 1, alice, 11, 11);

        vm.prank(alice);
        uint256 w = votes.voteTake(5, 1);

        assertEq(w, 11, "weight mismatch");
        assertEq(votes.votesOf(5), 11, "tally mismatch");
        assertTrue(votes.hasVoted(5, 1), "should be recorded");
    }

    function test_FreshCharacterWeightsOne() public {
        // score 0 → floor weight of 1
        vm.prank(alice);
        uint256 w = votes.voteTake(5, 1);
        assertEq(w, 1, "fresh weight should be 1");
    }

    function test_VotesFromDifferentCharactersStack() public {
        takes.setScore(1, 100); // weight 11
        vm.prank(alice);
        votes.voteTake(5, 1);
        vm.prank(alice);
        votes.voteTake(5, 2); // score 0 → weight 1
        assertEq(votes.votesOf(5), 12, "stacked tally mismatch");
    }

    function test_DoubleVoteReverts() public {
        vm.prank(alice);
        votes.voteTake(5, 1);
        vm.expectRevert("HeckleVotes: already voted");
        vm.prank(alice);
        votes.voteTake(5, 1);
    }

    function test_NotOwnerReverts() public {
        vm.expectRevert("HeckleVotes: not your character");
        vm.prank(bob);
        votes.voteTake(5, 1); // char 1 is alice's
    }
}
