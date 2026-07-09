// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script} from "forge-std/Script.sol";
import {console} from "forge-std/console.sol";
import {HeckleDataVerifier} from "../src/erc7857/HeckleDataVerifier.sol";
import {HeckleINFT} from "../src/erc7857/HeckleINFT.sol";

/// @title DeployINFT
/// @notice Non-broadcasting deploy for the ERC-7857 layer: HeckleDataVerifier
///         (TEE-oracle transfer verifier) + HeckleINFT. Run with an explicit
///         `--broadcast --rpc-url`. The oracle signer defaults to the agent
///         wallet (Heckle operates the oracle — trusted-oracle model); override
///         with HECKLE_ORACLE.
/// @dev After deploy, run the TS migration (migrate-inft.ts) to migrateMint the
///      V1 characters at their existing tokenIds, then call `sealMigration()`.
contract DeployINFT is Script {
    address internal constant DEFAULT_ORACLE = 0xbF7EF900E2dB365455B91Fb133f78Fc70114Bf31;

    function run() external {
        address oracle = vm.envOr("HECKLE_ORACLE", DEFAULT_ORACLE);
        require(oracle != address(0), "DeployINFT: zero oracle");
        // Reuse an existing verifier if provided (e.g. a metadata-only INFT
        // redeploy); otherwise deploy a fresh one.
        address existingVerifier = vm.envOr("HECKLE_DATA_VERIFIER", address(0));

        vm.startBroadcast();
        address verifierAddr = existingVerifier != address(0)
            ? existingVerifier
            : address(new HeckleDataVerifier(oracle));
        HeckleINFT inft = new HeckleINFT(verifierAddr);
        vm.stopBroadcast();

        console.log("HeckleDataVerifier:", verifierAddr);
        console.log("HeckleINFT:", address(inft));
        console.log("oracle signer:", oracle);
    }
}
