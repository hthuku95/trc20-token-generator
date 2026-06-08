// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract Token is ERC20 {
    uint8 private immutable customDecimals;
    address public immutable owner;
    string public tokenURI;

    constructor(
        string memory tokenName,
        string memory tokenSymbol,
        uint256 initialSupply,
        uint8 decimals_,
        address tokenOwner,
        string memory iconUrl
    ) ERC20(tokenName, tokenSymbol) {
        require(bytes(tokenName).length >= 3 && bytes(tokenName).length <= 50, "Invalid name length");
        require(bytes(tokenSymbol).length >= 2 && bytes(tokenSymbol).length <= 10, "Invalid symbol length");
        require(initialSupply > 0, "Supply must be positive");
        require(decimals_ <= 18, "Decimals too high");
        require(tokenOwner != address(0), "Invalid owner");

        customDecimals = decimals_;
        owner = tokenOwner;
        tokenURI = iconUrl;

        _mint(tokenOwner, initialSupply * (10 ** uint256(decimals_)));
    }

    function decimals() public view override returns (uint8) {
        return customDecimals;
    }
}
