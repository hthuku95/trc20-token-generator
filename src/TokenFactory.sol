// SPDX-License-Identifier: MIT
pragma solidity ^0.8.18;

import {Token} from "./Token.sol";

contract TokenFactory {
    address[] private deployedTokens;
    mapping(address => address[]) private tokensByCreator;

    event TokenCreated(address indexed creator, address indexed tokenAddress, string name, string symbol, string iconUrl);

    function createToken(
        string calldata name,
        string calldata symbol,
        uint256 supply,
        uint8 decimals,
        string calldata iconUrl
    ) external returns (address tokenAddress) {
        Token token = new Token(name, symbol, supply, decimals, msg.sender, iconUrl);
        tokenAddress = address(token);

        deployedTokens.push(tokenAddress);
        tokensByCreator[msg.sender].push(tokenAddress);

        emit TokenCreated(msg.sender, tokenAddress, name, symbol, iconUrl);
    }

    function getDeployedTokens() external view returns (address[] memory) {
        return deployedTokens;
    }

    function getTokensByCreator(address creator) external view returns (address[] memory) {
        return tokensByCreator[creator];
    }
}
