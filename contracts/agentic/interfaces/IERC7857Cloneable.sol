// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {IERC7857} from "./IERC7857.sol";

/**
 * @title IERC7857Cloneable - Cloning extension for ERC-7857
 */
interface IERC7857Cloneable is IERC7857 {
    event IntelligentClone(
        address indexed from, address indexed to, uint256 indexed sourceTokenId, uint256 newTokenId
    );

    function iCloneFrom(
        address from,
        address to,
        uint256 tokenId,
        IERC7857.TransferValidityProof[] calldata proofs
    ) external returns (uint256);
}
