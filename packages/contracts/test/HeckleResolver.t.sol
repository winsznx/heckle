// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {HeckleResolver} from "../src/HeckleResolver.sol";

contract HeckleResolverTest is Test {
    HeckleResolver internal resolver;
    address internal owner = address(0xA11CE);
    address internal stranger = address(0xB0B);

    function setUp() public {
        vm.prank(owner);
        resolver = new HeckleResolver(address(0));
    }

    function test_DeployerIsResolver() public view {
        assertEq(resolver.resolver(), owner);
    }

    function test_ResolveAndRead() public {
        vm.prank(owner);
        resolver.resolve(537377, HeckleResolver.Outcome.HOME, 2, 1, true);

        (
            HeckleResolver.Outcome outcome,
            uint16 homeScore,
            uint16 awayScore,
            uint64 resolvedAt,
            bool finalized
        ) = resolver.results(537377);
        assertEq(uint8(outcome), uint8(HeckleResolver.Outcome.HOME));
        assertEq(homeScore, 2);
        assertEq(awayScore, 1);
        assertTrue(resolvedAt > 0);
        assertTrue(finalized);
    }

    function test_OnlyResolverCanResolve() public {
        vm.prank(stranger);
        vm.expectRevert(HeckleResolver.NotResolver.selector);
        resolver.resolve(1, HeckleResolver.Outcome.AWAY, 0, 1, true);
    }

    function test_UnresolvedOutcomeReverts() public {
        vm.prank(owner);
        vm.expectRevert(HeckleResolver.BadOutcome.selector);
        resolver.resolve(1, HeckleResolver.Outcome.UNRESOLVED, 0, 0, true);
    }

    function test_ProvisionalCanBeUpdatedThenFinalized() public {
        vm.startPrank(owner);
        resolver.resolve(1, HeckleResolver.Outcome.HOME, 1, 0, false);
        // Live score flipped before full time — allowed while provisional.
        resolver.resolve(1, HeckleResolver.Outcome.AWAY, 1, 2, true);
        vm.stopPrank();

        (HeckleResolver.Outcome outcome,,,, bool finalized) = resolver.results(1);
        assertEq(uint8(outcome), uint8(HeckleResolver.Outcome.AWAY));
        assertTrue(finalized);
    }

    function test_FinalizedIsImmutable() public {
        vm.startPrank(owner);
        resolver.resolve(1, HeckleResolver.Outcome.HOME, 2, 0, true);
        vm.expectRevert(HeckleResolver.AlreadyFinalized.selector);
        resolver.resolve(1, HeckleResolver.Outcome.AWAY, 0, 3, true);
        vm.stopPrank();
    }

    function test_Grade() public {
        vm.prank(owner);
        resolver.resolve(42, HeckleResolver.Outcome.AWAY, 0, 1, true);

        (bool graded, bool correct) = resolver.grade(42, HeckleResolver.Outcome.AWAY);
        assertTrue(graded);
        assertTrue(correct);

        (, bool wrong) = resolver.grade(42, HeckleResolver.Outcome.HOME);
        assertFalse(wrong);
    }

    function test_GradeUnresolvedIsNotGraded() public {
        vm.prank(owner);
        resolver.resolve(7, HeckleResolver.Outcome.HOME, 1, 0, false);

        (bool graded, bool correct) = resolver.grade(7, HeckleResolver.Outcome.HOME);
        assertFalse(graded);
        assertFalse(correct);
    }

    function test_ResolveBatchSkipsFinalizedAndUnresolved() public {
        vm.startPrank(owner);
        resolver.resolve(1, HeckleResolver.Outcome.HOME, 2, 0, true); // already final

        uint256[] memory ids = new uint256[](3);
        ids[0] = 1;
        ids[1] = 2;
        ids[2] = 3;
        HeckleResolver.Outcome[] memory outs = new HeckleResolver.Outcome[](3);
        outs[0] = HeckleResolver.Outcome.AWAY; // ignored — id 1 final
        outs[1] = HeckleResolver.Outcome.UNRESOLVED; // skipped
        outs[2] = HeckleResolver.Outcome.DRAW; // applied
        uint16[] memory hs = new uint16[](3);
        uint16[] memory as_ = new uint16[](3);
        as_[2] = 1;
        hs[2] = 1;
        bool[] memory fin = new bool[](3);
        fin[2] = true;

        resolver.resolveBatch(ids, outs, hs, as_, fin);
        vm.stopPrank();

        (HeckleResolver.Outcome o1,,,,) = resolver.results(1);
        assertEq(uint8(o1), uint8(HeckleResolver.Outcome.HOME)); // unchanged
        assertFalse(resolver.isFinalized(2)); // skipped
        (HeckleResolver.Outcome o3,,,,) = resolver.results(3);
        assertEq(uint8(o3), uint8(HeckleResolver.Outcome.DRAW));
        assertTrue(resolver.isFinalized(3));
    }

    function test_BatchLengthMismatchReverts() public {
        uint256[] memory ids = new uint256[](2);
        HeckleResolver.Outcome[] memory outs = new HeckleResolver.Outcome[](1);
        uint16[] memory hs = new uint16[](2);
        uint16[] memory as_ = new uint16[](2);
        bool[] memory fin = new bool[](2);
        vm.prank(owner);
        vm.expectRevert(HeckleResolver.LengthMismatch.selector);
        resolver.resolveBatch(ids, outs, hs, as_, fin);
    }

    function test_TransferResolver() public {
        vm.prank(owner);
        resolver.transferResolver(stranger);
        assertEq(resolver.resolver(), stranger);

        vm.prank(stranger);
        resolver.resolve(9, HeckleResolver.Outcome.DRAW, 1, 1, true);
        assertTrue(resolver.isFinalized(9));
    }

    function test_TransferResolverZeroReverts() public {
        vm.prank(owner);
        vm.expectRevert(HeckleResolver.ZeroResolver.selector);
        resolver.transferResolver(address(0));
    }
}
