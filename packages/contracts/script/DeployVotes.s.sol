// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HeckleVotes} from "../src/HeckleVotes.sol";

/// @title DeployVotes
/// @notice Deploys HeckleVotes wired to the live HeckleCharacters + HeckleTakes.
/// @dev Run with `forge script` + `--broadcast`/`--rpc-url`. Does not broadcast
///      on its own. Addresses default to the live 0G mainnet deployment.
contract DeployVotes is Script {
    address constant CHARACTERS = 0xfFB4A91Ff9C8dD16d9b0e0665d869392C8fCC0bc;
    address constant TAKES = 0x06c2d42c2fA90897138ddeBa9f2Bc6CcF064d2BD;

    function run() external {
        vm.startBroadcast();
        HeckleVotes votes = new HeckleVotes(CHARACTERS, TAKES);
        vm.stopBroadcast();
        console.log("HeckleVotes:", address(votes));
    }
}
