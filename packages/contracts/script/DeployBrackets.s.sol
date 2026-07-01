// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HeckleBrackets} from "../src/HeckleBrackets.sol";

/// @title DeployBrackets
/// @notice Deploy script for the standalone HeckleBrackets registry (Phase 5D).
/// @dev Run with `forge script` plus an explicit `--broadcast`/`--rpc-url` to
///      deploy. This file does not broadcast on its own.
contract DeployBrackets is Script {
    function run() external {
        vm.startBroadcast();

        HeckleBrackets brackets = new HeckleBrackets();

        vm.stopBroadcast();

        console.log("HeckleBrackets:", address(brackets));
    }
}
