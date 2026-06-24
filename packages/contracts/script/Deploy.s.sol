// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HeckleCharacters} from "../src/HeckleCharacters.sol";
import {HeckleEvents} from "../src/HeckleEvents.sol";
import {HeckleTakes} from "../src/HeckleTakes.sol";

/// @title Deploy
/// @notice Non-broadcasting deploy script for the Heckle group-stage contracts.
/// @dev Run with `forge script` plus an explicit `--broadcast`/`--rpc-url` to
///      deploy. This file intentionally does not broadcast on its own.
contract Deploy is Script {
    function run() external {
        vm.startBroadcast();

        HeckleCharacters characters = new HeckleCharacters();
        HeckleEvents events = new HeckleEvents();
        HeckleTakes takes = new HeckleTakes();

        vm.stopBroadcast();

        console.log("HeckleCharacters:", address(characters));
        console.log("HeckleEvents:", address(events));
        console.log("HeckleTakes:", address(takes));
    }
}
